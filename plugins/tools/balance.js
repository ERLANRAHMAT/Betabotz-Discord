const { EmbedBuilder } = require('discord.js');
const { db } = require('../../database.js'); // Atau '../../database.js', sesuaikan

module.exports = {
  prefix: "balance",
  category: "economy",
  aliases: ["bal", "money", "limit"],
  
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first() || message.author;
    const userData = db.users[targetUser.id];

    if (!userData) {
        return message.reply("Data pengguna tidak ditemukan. Coba kirim pesan sekali lagi.");
    }

    const money = userData.money || 0;
    const limit = userData.limit || 0;

    const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`🏦 Dompet Milik ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
            // Menggunakan variabel yang sudah aman
            { name: '💰 Uang (Money)', value: `Rp ${money.toLocaleString('id-ID')}`, inline: true },
            { name: '🎟️ Limit', value: `${limit.toLocaleString('id-ID')} Tersisa`, inline: true }
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};