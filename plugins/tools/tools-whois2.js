const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const config = require("../../config");

const API_KEY = "6c7bd1ce704d92c90e2f78d42641a9ee0cbcef198a6ad62a3dd06deb22af6fd3"; // Sebaiknya pindahkan ke config.js

module.exports = {
  prefix: "whois2",
  category: "tools",
  aliases: ["whoisjson"],
  
  async execute(message, args, client) {
    const domain = args[0];

    if (!domain) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("Bantuan Perintah WHOIS v2")
            .setDescription("Gunakan perintah ini untuk mendapatkan informasi WHOIS dari sebuah domain menggunakan whoisjson.com.")
            .addFields({ name: "Contoh Penggunaan", value: "`!whois2 google.com`" });
        return message.reply({ embeds: [helpEmbed] });
    }
    if (domain.includes('https://') || domain.includes('http://')) {
        return message.reply("❌ URL tidak valid. Harap masukkan domain saja tanpa `http://` atau `https://`.\nContoh: `google.com`");
    }

    const processingMessage = await message.reply(`🔍 Mencari informasi WHOIS (v2) untuk **${domain}**...`);

    try {
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Token=${API_KEY}`
        }
      };
      const response = await fetch(`https://whoisjson.com/api/v1/whois?domain=${encodeURIComponent(domain)}`, options);
      const data = await response.json();

      if (data.error) {
          throw new Error(data.error);
      }

      const resultEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`🌐 Informasi WHOIS: ${data.domain || domain}`)
        .addFields(
            { name: 'Registrar', value: data.registrar?.name || 'Tidak diketahui', inline: true },
            
            // ==================== PERUBAHAN DI SINI ====================
            // Menghapus .join() dan menampilkan data.status secara langsung
            { name: 'Status Domain', value: `\`${data.status || 'N/A'}\``, inline: true },
            // ==================== AKHIR PERUBAHAN ====================

            { name: 'Tanggal Dibuat', value: data.creation_date ? new Date(data.creation_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A', inline: false },
            { name: 'Tanggal Kedaluwarsa', value: data.expires_date ? new Date(data.expires_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A', inline: true },
            { name: 'Update Terakhir', value: data.updated_date ? new Date(data.updated_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A', inline: true },
            { name: 'Nameserver', value: `\`\`\`\n${(data.nameservers || []).join('\n') || 'Tidak ada data.'}\n\`\`\`` }
        )
        .setFooter({ text: `Diminta oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      
      const rawJson = JSON.stringify(data, null, 2);
      const filePath = path.join(__dirname, 'whois_data.json');
      fs.writeFileSync(filePath, rawJson);
      const attachment = new AttachmentBuilder(filePath, { name: `${domain}_whois.json` });

      await processingMessage.edit({ 
        content: `✅ Informasi untuk **${domain}** ditemukan!`,
        embeds: [resultEmbed],
        files: [attachment]
      });

      fs.unlinkSync(filePath);

    } catch (error) {
      console.error("[WHOIS2 ERROR]", error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(`Gagal mengambil data WHOIS untuk **${domain}**.\n\`\`\`${error.message}\`\`\``);
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};