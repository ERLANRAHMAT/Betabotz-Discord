const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

const TIMEZONE = "Asia/Jakarta";
const WINDOW_MINUTES = 2; // window waktu ±2 menit

let todayDate = null;
let jadwalSholat = {}; // { channelId: { date, jadwal } }
let repliedChannels = {}; // { channelId: { Fajr: true, Dhuhr: true, ... } }
let lastCity = {}; // { channelId: "namakota" }

async function fetchJadwalSholat(city) {
  if (!city) return null;
  const url = `https://api.betabotz.eu.org/api/tools/jadwalshalat?kota=${encodeURIComponent(
    city
  )}&apikey=${config.apikey_lann}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data || !data.result || !Array.isArray(data.result.data)) return null;

  // Cari data hari ini
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayString = `${day}-${month}-${year}`;
  for (const item of data.result.data) {
    if (item.date.gregorian.date === todayString) {
      return item.timings;
    }
  }
  return null;
}

function parseTimeToDateObj(timeStr) {
  // Format: "04:37 (WIB)" atau "11:53"
  const clean = timeStr.replace(" (WIB)", "");
  const [h, m] = clean.split(":").map(Number);
  const now = new Date();
  now.setHours(h, m, 0, 0);
  return now;
}

function isWithinWindow(target, now, windowMinutes = WINDOW_MINUTES) {
  const diff = Math.abs(target.getTime() - now.getTime());
  return diff <= windowMinutes * 60 * 1000;
}

function getPrayerNameIndo(key) {
  // Map key ke nama Indonesia
  switch (key) {
    case "Fajr":
      return "Subuh";
    case "Dhuhr":
      return "Dzuhur";
    case "Asr":
      return "Ashar";
    case "Maghrib":
      return "Maghrib";
    case "Isha":
      return "Isya";
    default:
      return key;
  }
}

async function refreshJadwalIfNeeded() {
  const now = new Date();
  const todayStr = now.toLocaleDateString("id-ID");
  if (todayDate !== todayStr) {
    jadwalSholat = (await fetchJadwalSholat(DEFAULT_CITY)) || {};
    todayDate = todayStr;
    repliedChannels = {}; // Reset status reply harian
  }
}

module.exports = {
  prefix: "remindersholat",
  category: "info",
  aliases: ["jadwalsholat", "jadwalshalat"],
  /**
   * Command manual untuk cek jadwal hari ini
   */
  async execute(message, args, client) {
    const city = args.length ? args.join(" ") : null;
    if (!city)
      return message.reply("❌ Masukkan nama kota. Contoh: `.jadwalsholat bandung`");
    const jadwal = await fetchJadwalSholat(city);
    if (!jadwal)
      return message.reply("❌ Tidak bisa mengambil jadwal sholat untuk kota tersebut.");
    // Simpan kota terakhir untuk channel ini
    lastCity[message.channel.id] = city;
    jadwalSholat[message.channel.id] = { date: new Date().toLocaleDateString("id-ID"), jadwal };
    const embed = new EmbedBuilder()
      .setColor("#67DFF4")
      .setTitle(`🕌 Jadwal Sholat Hari Ini (${city})`)
      .setDescription(
        `**Subuh:** ${jadwal.Fajr}\n` +
          `**Dzuhur:** ${jadwal.Dhuhr}\n` +
          `**Ashar:** ${jadwal.Asr}\n` +
          `**Maghrib:** ${jadwal.Maghrib}\n` +
          `**Isya:** ${jadwal.Isha}`
      )
      .setFooter({ text: "BetaBotz • Jadwal Sholat" })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  },
  /**
   * Auto handler: reply jika ada chat di waktu sholat (sekali per channel per waktu)
   */
  async handleMessage(message, client) {
    if (!message.guild || !message.channel) return;
    const channelId = message.channel.id;
    // Hanya kirim reminder jika sudah pernah ada kota di channel ini
    const city = lastCity[channelId];
    if (!city) return;
    // Refresh jadwal jika tanggal berubah
    const todayStr = new Date().toLocaleDateString("id-ID");
    if (
      !jadwalSholat[channelId] ||
      jadwalSholat[channelId].date !== todayStr
    ) {
      const jadwal = await fetchJadwalSholat(city);
      if (!jadwal) return;
      jadwalSholat[channelId] = { date: todayStr, jadwal };
      repliedChannels[channelId] = {};
    }
    const now = new Date();
    if (!repliedChannels[channelId]) repliedChannels[channelId] = {};

    // Cek setiap waktu sholat
    for (const key of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
      if (repliedChannels[channelId][key]) continue; // Sudah reply hari ini
      const waktu = jadwalSholat[channelId].jadwal[key];
      if (!waktu) continue;
      const waktuDate = parseTimeToDateObj(waktu);
      if (isWithinWindow(waktuDate, now)) {
        // Reply embed
        const embed = new EmbedBuilder()
          .setColor("#f1c40f")
          .setTitle("⏰ PENGINGAT SHOLAT")
          .setDescription(
            `🚨 Waktu Sholat **${getPrayerNameIndo(
              key
            )}** telah tiba!\nJam: **${waktu}**\nJangan lupa untuk melaksanakan sholat.`
          )
          .setFooter({ text: "BetaBotz • Jadwal Sholat" })
          .setTimestamp();
        await message.reply({ embeds: [embed] });
        repliedChannels[channelId][key] = true;
        break;
      }
    }
  },
};
