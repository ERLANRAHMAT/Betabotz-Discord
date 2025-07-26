// plugins/owner/broadcast.js

const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  prefix: "broadcast",
  category: "owner",
  aliases: ["bc", "pengumuman"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    // 1. Keamanan: Pastikan hanya owner yang bisa menggunakan
    if (message.author.id !== config.ownerId) {
        return message.reply("⛔ Perintah ini hanya untuk Owner Bot!");
    }

    const textToSend = args.join(" ");
    if (!textToSend) {
        return message.reply("Harap masukkan pesan yang ingin di-broadcast.\nContoh: `!broadcast Halo semua, ada info penting!`");
    }

    // 2. Hapus pesan perintah asli agar terlihat rapi
    if (message.deletable) {
        await message.delete().catch(() => {});
    }

    // 3. Ambil daftar channel dari config
    const targetChannels = config.broadcastChannels || [];
    if (targetChannels.length === 0) {
        return message.author.send("❌ Gagal! Tidak ada channel yang terdaftar di `broadcastChannels` pada file config.");
    }

    let successCount = 0;
    let failureCount = 0;

    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setDescription(textToSend)
        .setTimestamp();

    // 4. Loop dan kirim pesan ke setiap channel
    for (const channelId of targetChannels) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (channel && channel.isTextBased()) {
                await channel.send({ embeds: [embed] });
                successCount++;
            } else {
                console.warn(`[BROADCAST] Channel ID ${channelId} tidak ditemukan atau bukan channel teks.`);
                failureCount++;
            }
        } catch (error) {
            console.error(`[BROADCAST] Gagal mengirim ke channel ${channelId}:`, error);
            failureCount++;
        }
    }

    // 5. Kirim laporan hasil ke owner melalui DM
    const reportEmbed = new EmbedBuilder()
        .setTitle("📢 Laporan Broadcast")
        .setColor(failureCount > 0 ? 0xFFA500 : 0x2ECC71)
        .addFields(
            { name: "Pesan Terkirim", value: `\`\`\`${textToSend}\`\`\`` },
            { name: "Berhasil Terkirim", value: `${successCount} channel`, inline: true },
            { name: "Gagal Terkirim", value: `${failureCount} channel`, inline: true }
        )
        .setTimestamp();
        
    await message.author.send({ embeds: [reportEmbed] });
  },
};