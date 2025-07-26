const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const config = require("../../config"); // Sesuaikan path jika perlu

module.exports = {
  prefix: "ip",
  category: "tools",
  aliases: ["ipwho", "iplookup"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const ipAddress = args[0];

    // 1. Validasi Input
    if (!ipAddress) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("Bantuan Perintah IP Lookup")
            .setDescription("Gunakan perintah ini untuk mendapatkan informasi geolokasi dari sebuah alamat IP.")
            .addFields({ name: "Contoh Penggunaan", value: "`!ip 8.8.8.8`" });
        return message.reply({ embeds: [helpEmbed] });
    }

    // 2. Kirim pesan tunggu
    const processingMessage = await message.reply(`🛰️ Melacak informasi untuk alamat IP **${ipAddress}**...`);

    try {
      // 3. Lakukan Fetch ke API ipwho.is
      const response = await fetch(`https://ipwho.is/${encodeURIComponent(ipAddress)}`);
      const data = await response.json();

      // Cek jika API mengembalikan error
      if (!data.success) {
          throw new Error(data.message || "Alamat IP tidak valid atau tidak ditemukan.");
      }

      // 4. Buat link Google Maps
      const mapLink = `http://googleusercontent.com/maps?q=${data.latitude},${data.longitude}`;

      // 5. Buat embed dengan hasil yang diformat
      const resultEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`📍 Informasi IP: ${data.ip}`)
        .addFields(
            { 
              name: 'Lokasi', 
              value: `${data.flag?.emoji || ''} ${data.city}, ${data.region}, ${data.country}\n[Lihat di Peta](${mapLink})`, 
              inline: false 
            },
            { name: 'ISP', value: data.connection?.isp || 'N/A', inline: true },
            { name: 'Organisasi', value: data.connection?.org || 'N/A', inline: true },
            { name: 'Timezone', value: data.timezone?.id || 'N/A', inline: true }
        )
        .setFooter({ text: `Diminta oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      
      // 6. Siapkan file JSON lengkap untuk lampiran
      const rawJson = JSON.stringify(data, null, 2);
      const filePath = path.join(__dirname, 'ip_data.json');
      fs.writeFileSync(filePath, rawJson);
      const attachment = new AttachmentBuilder(filePath, { name: `${ipAddress}_data.json` });

      // 7. Edit pesan tunggu dengan hasil dan lampiran file
      await processingMessage.edit({ 
        content: `✅ Informasi untuk **${ipAddress}** ditemukan!`,
        embeds: [resultEmbed],
        files: [attachment]
      });

      // 8. Hapus file sementara
      fs.unlinkSync(filePath);

    } catch (error) {
      console.error("[IP LOOKUP ERROR]", error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(`Gagal mengambil data untuk **${ipAddress}**.\n\`\`\`${error.message}\`\`\``);
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};