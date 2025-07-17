const { EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

module.exports = {
  prefix: "speedtest",
  category: "info",
  aliases: ["ookla", "st"],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const initialEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setDescription("🚀 Memulai tes kecepatan internet server... Ini mungkin memerlukan waktu sekitar satu menit.");
    
    const processingMessage = await message.reply({ embeds: [initialEmbed] });

    try {
      const { stdout, stderr } = await execPromise('speedtest-cli --simple --share');

      if (stderr) {
        console.error(`[SPEEDTEST STDERR] ${stderr}`);
        throw new Error("Terjadi kesalahan internal pada skrip speedtest.");
      }

      // ==================== PERUBAHAN UTAMA DI SINI ====================
      // Logika parsing URL diubah menjadi lebih andal
      let imageUrl = null;

      // 1. Pisahkan seluruh output teks menjadi baris-baris terpisah
      const lines = stdout.trim().split('\n');
      
      // 2. Cari baris yang spesifik mengandung "Share results:"
      const shareLine = lines.find(line => line.trim().startsWith('Share results:'));
      
      // 3. Jika baris tersebut ditemukan, ambil kata terakhir dari baris itu (yaitu URL-nya)
      if (shareLine) {
          imageUrl = shareLine.split(' ').pop();
      }
      // ==================== AKHIR PERUBAHAN ====================

      const resultEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle("✅ Hasil Tes Kecepatan Server")
        .setDescription("Berikut adalah hasil tes kecepatan dari server tempat bot ini berjalan.\n```\n" + stdout.trim() + "\n```")
        .setFooter({ text: `Tes dilakukan oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      
      // Jika imageUrl berhasil didapatkan, set sebagai gambar di embed
      if (imageUrl) {
        resultEmbed.setImage(imageUrl);
      }
      
      await processingMessage.edit({ content: "Tes Selesai!", embeds: [resultEmbed] });

    } catch (error) {
      console.error("[SPEEDTEST EXEC ERROR]", error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(
            "Gagal menjalankan perintah speedtest.\n" +
            "Pastikan `speedtest-cli` sudah terinstal di server bot (`sudo apt install speedtest-cli`)."
        );
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};