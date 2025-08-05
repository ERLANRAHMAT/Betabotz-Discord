const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config"); // Sesuaikan path jika direktori config berbeda

module.exports = {
  prefix: "motivasi",
  category: "fun",
  aliases: ["motivate", "semangat"],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    // 1. Kirim pesan awal untuk memberi tahu pengguna bahwa proses sedang berjalan
    const processingMessage = await message.reply("💪 Mencari kata-kata motivasi untukmu...");

    try {
      // 2. Panggil API untuk mendapatkan kutipan motivasi
      const response = await fetch(`https://api.betabotz.eu.org/api/random/motivasi?apikey=${config.apikey_lann}`);
      const data = await response.json();

      // 3. Cek jika API berhasil mengembalikan data yang valid
      if (!data.result) {
        throw new Error("API tidak memberikan hasil yang valid.");
      }

      const motivationQuote = data.result;

      // 4. Buat embed baru dengan hasil yang sukses
      const resultEmbed = new EmbedBuilder()
        .setColor(0xF1C40F) // Warna Emas
        .setTitle("✨ Kata Motivasi Untukmu")
        .setDescription(`>>> ${motivationQuote}`) // Menggunakan format blockquote agar lebih menonjol
        .setFooter({ text: `Semoga harimu menyenangkan, ${message.author.username}!`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      
      // 5. Edit pesan awal dengan hasil akhir
      await processingMessage.edit({ content: null, embeds: [resultEmbed] });

    } catch (error) {
      // 6. Tangani error jika perintah gagal dieksekusi
      console.error("[MOTIVASI ERROR]", error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C) // Merah
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(
            "Gagal mengambil kutipan motivasi saat ini.\n" +
            "Mungkin API sedang bermasalah, silakan coba lagi nanti."
        );
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};