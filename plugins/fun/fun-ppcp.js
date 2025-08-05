const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config"); // Sesuaikan path jika direktori config Anda berbeda

module.exports = {
  prefix: "ppcp",
  category: "fun",
  aliases: ["couplepp", "ppcouple"],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    // 1. Kirim pesan awal untuk memberi tahu pengguna bahwa proses sedang berjalan
    const initialEmbed = new EmbedBuilder()
      .setColor(0x3498DB) // Biru
      .setDescription("💞 Mencari PP Couple acak, mohon tunggu...");
    
    const processingMessage = await message.reply({ embeds: [initialEmbed] });

    try {
      // 2. Panggil API untuk mendapatkan link gambar
      const response = await fetch(`https://api.betabotz.eu.org/api/wallpaper/couplepp?apikey=${config.apikey_lann}`);
      const data = await response.json();

      // 3. Cek jika API berhasil mengembalikan data yang valid
      if (!data.status || !data.result || !data.result.male || !data.result.female) {
        throw new Error("API tidak mengembalikan hasil yang valid.");
      }

      const { male: maleImageUrl, female: femaleImageUrl } = data.result;

      // 4. Buat dua embed terpisah untuk masing-masing gambar
      const femaleEmbed = new EmbedBuilder()
        .setColor(0xFFB6C1) // Warna Pink
        .setTitle("Untuk Cewek")
        .setImage(femaleImageUrl)
        .setURL(femaleImageUrl); // Membuat gambar bisa diklik

      const maleEmbed = new EmbedBuilder()
        .setColor(0x87CEEB) // Warna Biru Langit
        .setTitle("Untuk Cowok")
        .setImage(maleImageUrl)
        .setURL(maleImageUrl); // Membuat gambar bisa diklik

      // 5. Edit pesan awal dan kirim kedua embed secara bersamaan
      await processingMessage.edit({ 
        content: `Berikut adalah PP Couple untukmu, <@${message.author.id}>!`,
        embeds: [femaleEmbed, maleEmbed] // Mengirim array of embeds
      });

    } catch (error) {
      // 6. Tangani error jika perintah gagal dieksekusi
      console.error("[PPCP ERROR]", error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C) // Merah
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(
            "Gagal mengambil gambar PP Couple.\n" +
            "Mungkin API sedang bermasalah, silakan coba lagi nanti."
        );
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};