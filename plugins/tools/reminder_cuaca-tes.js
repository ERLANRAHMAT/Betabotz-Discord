const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

async function fetchCuaca(location) {
  if (!location) return null;
  const url = `https://api.betabotz.eu.org/api/tools/cuaca?query=${encodeURIComponent(location)}&apikey=${config.apikey_lann}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data?.result;
  } catch (e) {
    console.error(`[Tes Cuaca API] Gagal fetch:`, e);
    return null;
  }
}

module.exports = {
  prefix: "tescuaca",
  category: "tools",
  aliases: ["testweather"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const location = args.join(" ");
    if (!location) {
      return message.reply("Masukkan nama kota yang ingin di tes. Contoh: `!tescuaca Jakarta`");
    }
    
    const processingMsg = await message.reply(`🔍 Menguji pencarian cuaca untuk **${location}**...`);

    const info = await fetchCuaca(location);

    if (!info) {
      return processingMsg.edit(`❌ Lokasi **"${location}"** tidak ditemukan.\n\nCoba gunakan nama kota yang lebih umum atau dalam Bahasa Inggris (misal: "Tokyo" bukan "Tokio").`);
    }

    const embed = new EmbedBuilder()
      .setColor("#2ECC71")
      .setTitle(`✅ Lokasi Ditemukan: ${info.location}`)
      .setDescription("Data cuaca berhasil diambil untuk lokasi ini. Anda bisa menggunakan nama ini untuk `!reminder cuaca set`.")
      .addFields(
          { name: '🌡️ Suhu Saat Ini', value: info.currentTemp, inline: true },
          { name: '🌦️ Cuaca', value: info.weather, inline: true }
      )
      .setFooter({ text: "Tes berhasil." })
      .setTimestamp();

    await processingMsg.edit({ content: null, embeds: [embed] });
  },
};