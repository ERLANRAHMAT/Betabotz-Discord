const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../../config');

/**
 * Fungsi untuk mengambil jadwal sholat dari API Betabotz
 * @param {string} city - Nama kota
 * @returns {Promise<Object|null>}
 */
async function fetchPrayerSchedule(city) {
    const url = `https://api.betabotz.eu.org/api/tools/jadwalshalat?kota=${encodeURIComponent(city)}&apikey=${config.apikey_lann}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status && data.result.code === 200) {
            // Mengambil jadwal untuk hari ini
            const today = new Date().toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '-');
            const schedule = data.result.data.find(d => d.date.gregorian.date === today);
            return schedule?.timings;
        }
    } catch (e) { 
        console.error(`[Tes Sholat API] Gagal mengambil jadwal untuk ${city}:`, e);
    }
    return null;
}

module.exports = {
  prefix: "tessholat",
  category: "tools",
  aliases: ["testpray"],
  
  async execute(message, args, client) {
    const city = args.join(" ");
    if (!city) {
      return message.reply("Masukkan nama kota yang ingin di tes. Contoh: `!tessholat Jakarta`");
    }
    
    const processingMsg = await message.reply(`🕋 Mengambil jadwal sholat untuk **${city}**...`);

    const schedule = await fetchPrayerSchedule(city);

    if (!schedule) {
      return processingMsg.edit(`❌ Lokasi **"${city}"** tidak ditemukan atau API sedang bermasalah.\n\nCoba gunakan nama kota yang lebih umum (misal: "Bandung", bukan "Kota Bandung").`);
    }

    const embed = new EmbedBuilder()
      .setColor("#2ECC71")
      .setTitle(`✅ Jadwal Ditemukan: ${city}`)
      .setDescription("Jadwal sholat untuk hari ini berhasil diambil. Anda bisa menggunakan nama kota ini untuk `/reminder sholat set`.")
      .addFields(
          { name: 'Subuh', value: schedule.Fajr, inline: true },
          { name: 'Dzuhur', value: schedule.Dhuhr, inline: true },
          { name: 'Ashar', value: schedule.Asr, inline: true },
          { name: 'Maghrib', value: schedule.Maghrib, inline: true },
          { name: 'Isya', value: schedule.Isha, inline: true },
          { name: 'Tengah Malam', value: schedule.Midnight, inline: true }
      )
      .setFooter({ text: "Tes berhasil." })
      .setTimestamp();

    await processingMsg.edit({ content: null, embeds: [embed] });
  },
};
