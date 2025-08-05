const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config"); // Sesuaikan path jika direktori config berbeda

module.exports = {
  prefix: "whois",
  category: "tools",
  aliases: ["whoislookup", "domaininfo"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const domain = args[0];

    // 1. Validasi Input
    if (!domain) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("Bantuan Perintah WHOIS")
            .setDescription("Gunakan perintah ini untuk mendapatkan informasi WHOIS dari sebuah domain.")
            .addFields({ name: "Contoh Penggunaan", value: "`!whois google.com`" });
        return message.reply({ embeds: [helpEmbed] });
    }

    // Validasi untuk memastikan tidak ada http/https
    if (domain.includes('https://') || domain.includes('http://')) {
        return message.reply("❌ URL tidak valid. Harap masukkan domain saja tanpa `http://` atau `https://`.\nContoh: `google.com`");
    }

    // 2. Kirim pesan tunggu
    const processingMessage = await message.reply(`🔍 Mencari informasi WHOIS untuk **${domain}**...`);

    try {
      // 3. Lakukan Fetch ke API
      const response = await fetch(`https://api.betabotz.eu.org/api/webzone/whois?query=${encodeURIComponent(domain)}&apikey=${config.apikey_lann}`);
      const data = await response.json();

      // 4. Cek jika response sukses dan ada data hasil
      if (!data.status || !data.result) {
          throw new Error(data.message || "Domain tidak ditemukan atau informasi tidak tersedia.");
      }

      const whoisInfo = data.result;
      
      // Batasi panjang output untuk deskripsi embed
      const shortInfo = whoisInfo.length > 4000 ? whoisInfo.substring(0, 3997) + "..." : whoisInfo;

      // 5. Buat embed dengan hasil
      const resultEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`🌐 Informasi WHOIS: ${domain}`)
        .setDescription("```\n" + shortInfo.trim() + "\n```") // Menggunakan code block agar format rapi
        .setFooter({ text: `Diminta oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      
      // 6. Edit pesan tunggu dengan hasil
      await processingMessage.edit({ 
        content: `✅ Informasi untuk **${domain}** ditemukan!`,
        embeds: [resultEmbed]
      });

    } catch (error) {
      console.error("[WHOIS ERROR]", error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(`Gagal mengambil data WHOIS untuk **${domain}**.\n\`\`\`${error.message}\`\`\``);
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};