const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

module.exports = {
  prefix: "get",
  category: "tools",
  aliases: ["fetchurl", "curl"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const url = args[0];

    // 1. Validasi Input
    if (!url) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("Bantuan Perintah Get")
            .setDescription("Gunakan perintah ini untuk mengambil konten mentah dari sebuah URL.")
            .addFields({ name: "Contoh Penggunaan", value: "`!get https://google.com`" });
        return message.reply({ embeds: [helpEmbed] });
    }

    // Validasi sederhana untuk memastikan input adalah URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return message.reply("❌ URL tidak valid. Harap sertakan `http://` atau `https://`.");
    }

    // 2. Kirim pesan tunggu
    const processingMessage = await message.reply(`🔍 Mengambil konten dari **${url}**...`);

    try {
      // 3. Lakukan Fetch ke URL
      const response = await fetch(url, {
          headers: { 'User-Agent': 'DiscordBot/1.0 (+https://github.com/user/repo)' } // User-Agent untuk menghindari blokir
      });
      
      // Cek jika response tidak sukses (misal: 404, 500)
      if (!response.ok) {
          throw new Error(`Server merespons dengan status: ${response.status} ${response.statusText}`);
      }

      const body = await response.text();
      const contentType = response.headers.get('content-type') || 'tidak diketahui';
      
      // Ambil 500 karakter pertama untuk pratinjau
      const truncatedBody = body.substring(0, 500) + (body.length > 500 ? '...' : '');

      // 4. Siapkan file untuk lampiran
      const filePath = path.join(__dirname, 'response.txt');
      fs.writeFileSync(filePath, body);
      const attachment = new AttachmentBuilder(filePath, { name: 'response.txt' });

      // 5. Buat embed dengan hasil
      const resultEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle("✅ Berhasil Mengambil Konten URL")
        .addFields(
            { name: 'URL', value: `\`${url}\`` },
            { name: 'Status', value: `\`${response.status} ${response.statusText}\``, inline: true },
            { name: 'Content-Type', value: `\`${contentType}\``, inline: true },
            { name: 'Pratinjau Konten (500 Karakter Pertama)', value: `\`\`\`\n${truncatedBody}\n\`\`\`` }
        )
        .setFooter({ text: "Konten lengkap ada di dalam file lampiran." })
        .setTimestamp();
      
      // 6. Edit pesan tunggu dengan hasil dan lampiran file
      await processingMessage.edit({ 
        content: "Berikut adalah hasilnya:",
        embeds: [resultEmbed],
        files: [attachment]
      });

      // 7. Hapus file sementara setelah dikirim
      fs.unlinkSync(filePath);

    } catch (error) {
      console.error("[GET ERROR]", error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(`Gagal mengambil data dari URL.\n\`\`\`${error.message}\`\`\``);
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};