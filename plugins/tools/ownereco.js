const { db, ensureUser } = require('../../database.js');
const config = require('../../config');

module.exports = {
  prefix: "eco", // Perintah utama (tidak akan banyak digunakan)
  category: "owner",
  aliases: ["addmoney", "addlimit", "setmoney", "setlimit"],
  
  async execute(message, args, client) {
    if (message.author.id !== config.ownerId) {
        return message.reply("⛔ Perintah ini hanya untuk Owner Bot!");
    }

    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount)) {
        return message.reply(`Contoh penggunaan:\n\`!${command} @user <jumlah>\``);
    }
    
    // Pastikan user ada di database
    ensureUser(target.id, target.username);

    switch (command) {
        case 'addmoney':
            db.users[target.id].money += amount;
            message.reply(`✅ Berhasil menambahkan **${amount.toLocaleString()}** money ke **${target.username}**. Total sekarang: ${db.users[target.id].money.toLocaleString()}`);
            break;
        case 'addlimit':
            db.users[target.id].limit += amount;
            message.reply(`✅ Berhasil menambahkan **${amount}** limit ke **${target.username}**. Total sekarang: ${db.users[target.id].limit}`);
            break;
        case 'setmoney':
            db.users[target.id].money = amount;
            message.reply(`✅ Berhasil mengatur money **${target.username}** menjadi **${amount.toLocaleString()}**.`);
            break;
        case 'setlimit':
            db.users[target.id].limit = amount;
            message.reply(`✅ Berhasil mengatur limit **${target.username}** menjadi **${amount}**.`);
            break;
    }
  },
};