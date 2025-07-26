const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

const { db, ensureUser } = require('../../database'); // Memanggil handler

module.exports = {
  prefix: "ban",
  category: "owner",
  aliases: ["unban", "banlist"],

  async execute(message, args, client) {
    if (message.author.id !== config.ownerId) {
        return message.reply("⛔ Perintah ini hanya untuk Owner Bot!");
    }

    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();
    const targetUser = message.mentions.users.first();
    const reason = args.slice(1).join(' ');

    if (command === 'ban') {
        if (!targetUser) return message.reply("Mention pengguna yang ingin diban. Contoh: `!ban @user spam`");
        if (targetUser.id === config.ownerId) return message.reply("Anda tidak bisa mem-ban diri sendiri.");
        
        ensureUser(targetUser.id, targetUser.username); // Pastikan user ada di DB
        
        if (db.users[targetUser.id].banned?.status) {
            return message.reply(`❗ Pengguna **${targetUser.username}** sudah ada di dalam daftar ban.`);
        }

        db.users[targetUser.id].banned = { status: true, reason: reason || "Tidak ada alasan." };
        message.reply(`✅ Pengguna **${targetUser.username}** telah berhasil diban dari bot.`);
    } 
    else if (command === 'unban') {
        if (!targetUser) return message.reply("Mention pengguna yang ingin di-unban. Contoh: `!unban @user`");
        ensureUser(targetUser.id, targetUser.username);
        
        if (!db.users[targetUser.id].banned?.status) {
            return message.reply(`❗ Pengguna **${targetUser.username}** tidak ditemukan di dalam daftar ban.`);
        }
        
        db.users[targetUser.id].banned = { status: false, reason: null }; // Atau delete db.users[targetUser.id].banned;
        message.reply(`✅ Pengguna **${targetUser.username}** telah berhasil di-unban.`);
    }
    else if (command === 'banlist') {
        const bannedEntries = Object.entries(db.users).filter(([id, data]) => data.banned?.status);
        if (bannedEntries.length === 0) return message.reply("Daftar ban kosong.");

        const description = bannedEntries.map(([id, data], index) => 
            `${index + 1}. **${data.username}** (\`${id}\`)\n   Alasan: *${data.banned.reason}*`
        ).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle(`🚫 Daftar Pengguna Diban (${bannedEntries.length})`)
            .setDescription(description);
        message.reply({ embeds: [embed] });
    }
  },
};