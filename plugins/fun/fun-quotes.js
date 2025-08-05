const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config");

// Konfigurasi untuk setiap jenis quote.
// Memetakan nama perintah ke path API dan kunci hasil JSON-nya.
const quoteTypes = {
    'bucin': { path: 'katabucin', key: 'bucin' },
    'katailham': { path: 'katailham', key: 'hasil' },
    'katadilan': { path: 'katadilan', key: 'dilan' },
    'fiersa': { path: 'fiersa', key: 'fiersa' },
    'fakta': { path: 'fakta', key: 'result' },
    'nyindir': { path: 'nyindir', key: 'hasl' },
    'ngawur': { path: 'ngawur', key: 'hasl' },
    'jawa': { path: 'quotesjawa', key: 'quotes' },
    'quotes': { path: 'quotes', key: 'quotes' },
    'sunda': { path: 'sunda', key: 'hasl' },
    'batak': { path: 'batak', key: 'hasl' },
    'aceh': { path: 'aceh', key: 'hasl' },
    'cina': { path: 'china', key: 'hasl' },
    'minangkabau': { path: 'minangkabau', key: 'hasl' },
    'remaja': { path: 'cerpen?type=remaja', key: 'cerita', titlePrefix: 'Cerpen Remaja' }, // Contoh jika mau menambahkan cerpen
    // Tambahkan jenis lain di sini jika perlu
};

module.exports = {
  // Prefix ini sebenarnya tidak akan banyak digunakan karena kita mengandalkan alias.
  // Tapi kita tetap butuh satu file utama.
  prefix: "randomtext", 
  category: "fun",
  // Daftarkan semua perintah sebagai alias. index.js akan membuat semuanya bisa dieksekusi.
  aliases: Object.keys(quoteTypes),
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    // Dapatkan nama perintah yang sebenarnya diketik oleh pengguna
    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();

    const typeInfo = quoteTypes[command];
    if (!typeInfo) {
        return message.reply("❌ Perintah quote tidak dikenal.");
    }
    
    // Pesan tunggu
    const processingMessage = await message.reply(`✍️ Mencari *${command}*...`);

    try {
      // Panggil API secara dinamis berdasarkan konfigurasi
      const apiUrl = `https://api.betabotz.eu.org/api/random/${typeInfo.path}?apikey=${config.apikey_lann}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      // Cek status dan hasil dari API
      if (!data.status && !data[typeInfo.key]) { // Beberapa API mungkin tidak punya 'status'
        throw new Error("API tidak memberikan hasil yang valid untuk kategori ini.");
      }

      // Ambil teks hasil menggunakan kunci yang dinamis
      const resultText = data[typeInfo.key] || data.result || data.hasil || data.hasl; // Fallback untuk berbagai kemungkinan kunci
      
      if (!resultText) {
          throw new Error("Teks hasil tidak ditemukan dalam respons API.");
      }

      // Buat embed untuk menampilkan hasilnya
      const title = typeInfo.titlePrefix || `Quotes ${command.charAt(0).toUpperCase() + command.slice(1)}`;
      const resultEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`"${title}"`)
        .setDescription(resultText)
        .setFooter({ text: `Diminta oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      
      await processingMessage.edit({ content: "✅ Berhasil!", embeds: [resultEmbed] });

    } catch (error) {
      console.error(`[QUOTES ERROR] Perintah ${command}:`, error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(`Gagal mengambil data untuk **${command}**.\n\`\`\`${error.message}\`\`\``);
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};