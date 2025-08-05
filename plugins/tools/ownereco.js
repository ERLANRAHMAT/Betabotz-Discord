const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const api = require('../../api_handler.js'); // <-- Mengimpor handler API

module.exports = {
  prefix: "eco",
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
    
    const processingMsg = await message.reply(`⏳ Memproses permintaan untuk **${target.username}**...`);

    try {
        const userData = await api.getUser(target.id, target.username);

        let replyMessage = "";
        switch (command) {
            case 'addmoney':
                userData.money += amount;
                replyMessage = `✅ Berhasil menambahkan **${amount.toLocaleString('id-ID')}** money ke **${target.username}**.\nTotal sekarang: ${userData.money.toLocaleString('id-ID')}`;
                break;
            case 'addlimit':
                userData.limit += amount;
                replyMessage = `✅ Berhasil menambahkan **${amount}** limit ke **${target.username}**.\nTotal sekarang: ${userData.limit}`;
                break;
            case 'setmoney':
                userData.money = amount;
                replyMessage = `✅ Berhasil mengatur money **${target.username}** menjadi **${amount.toLocaleString('id-ID')}**.`;
                break;
            case 'setlimit':
                userData.limit = amount;
                replyMessage = `✅ Berhasil mengatur limit **${target.username}** menjadi **${amount}**.`;
                break;
        }

        await api.updateUser(target.id, userData);
        await processingMsg.edit(replyMessage);

    } catch (error) {
        console.error(`[ECO CMD ERROR] Perintah ${command}:`, error);
        await processingMsg.edit(`❌ Terjadi kesalahan saat memproses data: ${error.message}`);
    }
  },
};