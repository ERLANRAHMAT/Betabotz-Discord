const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

const CUACA_HOURS = [7, 12, 18];
const WINDOW_MINUTES = 2;

let todayDate = null;
let cuacaInfo = {}; // { channelId: { date, info } }
let repliedChannels = {}; // { channelId: { 7: true, 12: true, 18: true } }
let lastLocation = {}; // { channelId: "namakota" }

async function fetchCuaca(location) {
  if (!location) return null;
  const url = `https://api.betabotz.eu.org/api/tools/cuaca?query=${encodeURIComponent(
    location
  )}&apikey=${config.apikey_lann}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data || !data.result) return null;
  return data.result;
}

function isWithinHourWindow(targetHour, now, windowMinutes = WINDOW_MINUTES) {
  const target = new Date(now);
  target.setHours(targetHour, 0, 0, 0);
  const diff = Math.abs(target.getTime() - now.getTime());
  return diff <= windowMinutes * 60 * 1000;
}

module.exports = {
  prefix: "remindercuaca",
  category: "info",
  aliases: ["cuaca", "infocuaca"],
  async execute(message, args, client) {
    const location = args.length ? args.join(" ") : null;
    if (!location)
      return message.reply("❌ Masukkan nama kota. Contoh: `.cuaca bandung`");
    const info = await fetchCuaca(location);
    if (!info)
      return message.reply("❌ Tidak bisa mengambil data cuaca untuk lokasi tersebut.");
    // Simpan lokasi terakhir untuk channel ini
    lastLocation[message.channel.id] = location;
    cuacaInfo[message.channel.id] = { date: new Date().toLocaleDateString("id-ID"), info };
    const embed = new EmbedBuilder()
      .setColor("#67DFF4")
      .setTitle(`🌤️ Info Cuaca Hari Ini (${info.location})`)
      .setDescription(
        `🌍 Negara: ${info.country}\n` +
          `🌦️ Cuaca: ${info.weather}\n` +
          `🌡️ Suhu saat ini: ${info.currentTemp}\n` +
          `🌡️ Suhu tertinggi: ${info.maxTemp}\n` +
          `🌡️ Suhu terendah: ${info.minTemp}\n` +
          `💧 Kelembapan: ${info.humidity}\n` +
          `🌬️ Angin: ${info.windSpeed}`
      )
      .setFooter({ text: "BetaBotz • Info Cuaca" })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  },
  async handleMessage(message, client) {
    if (!message.guild || !message.channel) return;
    const channelId = message.channel.id;
    // Hanya kirim reminder jika sudah pernah ada lokasi di channel ini
    const location = lastLocation[channelId];
    if (!location) return;
    // Refresh info cuaca jika tanggal berubah
    const todayStr = new Date().toLocaleDateString("id-ID");
    if (
      !cuacaInfo[channelId] ||
      cuacaInfo[channelId].date !== todayStr
    ) {
      const info = await fetchCuaca(location);
      if (!info) return;
      cuacaInfo[channelId] = { date: todayStr, info };
      repliedChannels[channelId] = {};
    }
    const now = new Date();
    if (!repliedChannels[channelId]) repliedChannels[channelId] = {};
    for (const hour of CUACA_HOURS) {
      if (repliedChannels[channelId][hour]) continue;
      if (isWithinHourWindow(hour, now)) {
        const info = cuacaInfo[channelId].info;
        const embed = new EmbedBuilder()
          .setColor("#67DFF4")
          .setTitle(`🌤️ PENGINGAT CUACA (${info.location})`)
          .setDescription(
            `📍 Lokasi: ${info.location}\n` +
              `🌍 Negara: ${info.country}\n` +
              `🌦️ Cuaca: ${info.weather}\n` +
              `🌡️ Suhu saat ini: ${info.currentTemp}\n` +
              `🌡️ Suhu tertinggi: ${info.maxTemp}\n` +
              `🌡️ Suhu terendah: ${info.minTemp}\n` +
              `💧 Kelembapan: ${info.humidity}\n` +
              `🌬️ Angin: ${info.windSpeed}\n\nTetap waspada dan jaga kesehatan!`
          )
          .setFooter({ text: "BetaBotz • Info Cuaca" })
          .setTimestamp();
        await message.reply({ embeds: [embed] });
        repliedChannels[channelId][hour] = true;
        break;
      }
    }
  },
};
