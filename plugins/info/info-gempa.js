const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

const WINDOW_MINUTES = 5;
let lastGempaId = null;
let lastGempaData = null;
let pollingStarted = false;
let notificationSent = false; // Flag untuk menandai apakah notifikasi sudah dikirim

async function fetchGempa() {
  const url = `https://api.betabotz.eu.org/api/search/gempa?apikey=${config.apikey_lann}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[GEMPA API] HTTP Error: ${res.status} ${res.statusText}`);
      return null;
    }
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      // Perbaikan: ambil dari data.result.result
      const result =
        data &&
        data.result &&
        typeof data.result === "object" &&
        data.result.result
          ? data.result.result
          : null;
      if (!result) {
        console.error("[GEMPA API] Invalid data structure:", data);
        return null;
      }
      return result;
    } catch (e) {
      console.error("[GEMPA API] Invalid JSON response:", text.slice(0, 200));
      return null;
    }
  } catch (err) {
    console.error("[GEMPA API] Fetch error:", err);
    return null;
  }
}

function parseGempaTime(str) {
  if (!str) return new Date();
  const [tgl, bln, thn, jam, menit, detik, wib] = str
    .replace("WIB", "")
    .trim()
    .split(/[\s:]+/);
  const monthMap = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const month = monthMap[bln] ?? 0;
  return new Date(
    Number(thn),
    month,
    Number(tgl),
    Number(jam),
    Number(menit),
    Number(detik)
  );
}

async function checkAndNotifyGempa(client) {
  const data = await fetchGempa();
  if (!data) {
    console.log("[GEMPA POLLING] No valid data received from API");
    return;
  }

  const gempaId = `${data.waktu}-${data.Wilayah}`;
  if (lastGempaId !== gempaId) {
    lastGempaId = gempaId;
    lastGempaData = data;
    notificationSent = false; // Reset flag saat ada gempa baru
    console.log("[GEMPA POLLING] New earthquake detected:", gempaId);
  }

  if (!notificationSent && lastGempaData) {
    // Kirim notifikasi hanya jika belum dikirim untuk gempa ini
    const channelId = config.gempaChannelId;
    if (!channelId) {
      console.error("[GEMPA POLLING] No gempaChannelId set in config.js");
      return;
    }

    const channel = client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      console.error(
        `[GEMPA POLLING] Channel with ID ${channelId} not found or not text-based`
      );
      return;
    }

    try {
      const embed = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("🌋 GEMPA TERBARU TERDETEKSI")
        .setDescription(
          `📅 Tanggal: ${lastGempaData.tanggal}\n` +
            `🕒 Jam: ${lastGempaData.jam}\n` +
            `📍 Wilayah: ${lastGempaData.Wilayah}\n` +
            `📏 Magnitudo: ${lastGempaData.Magnitudo}\n` +
            `📏 Kedalaman: ${lastGempaData.Kedalaman}\n` +
            `📡 Potensi: ${lastGempaData.Potensi || "-"}\n` +
            `\n${
              lastGempaData.image
                ? `[Peta Guncangan](${lastGempaData.image})`
                : ""
            }`
        )
        .setImage(lastGempaData.image || null)
        .setFooter({ text: "BetaBotz • Info Gempa" })
        .setTimestamp();
      await channel.send({ embeds: [embed] });
      console.log(`[GEMPA POLLING] Sent notification to channel ${channelId}`);
      notificationSent = true; // Tandai notifikasi sudah dikirim
    } catch (e) {
      console.error(
        `[GEMPA POLLING] Error sending to channel ${channelId}:`,
        e
      );
    }
  } else {
    console.log("[GEMPA POLLING] No new notification needed");
  }
}

function startGempaPolling(client) {
  if (pollingStarted) return;
  pollingStarted = true;
  (async () => {
    while (true) {
      await checkAndNotifyGempa(client);
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000)); // Tunggu 1 menit
    }
  })();
}

module.exports = {
  prefix: "remindergempa",
  category: "info",
  aliases: ["gempa", "infogempa"],
  async execute(message, args, client) {
    // Mulai polling jika belum jalan
    startGempaPolling(client);

    if (!lastGempaData) {
      return message.reply(
        "❌ Tidak bisa mengambil data gempa terbaru. (API error atau belum ada data)\nSilakan cek status API atau hubungi developer."
      );
    }

    const data = lastGempaData;
    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("🌋 Info Gempa Terbaru")
      .setDescription(
        `📅 Tanggal: ${data.tanggal}\n` +
          `🕒 Jam: ${data.jam}\n` +
          `📍 Wilayah: ${data.Wilayah}\n` +
          `📏 Magnitudo: ${data.Magnitudo}\n` +
          `📏 Kedalaman: ${data.Kedalaman}\n` +
          `📡 Potensi: ${data.Potensi || "-"}\n` +
          `\n${data.image ? `[Peta Guncangan](${data.image})` : ""}`
      )
      .setImage(data.image || null)
      .setFooter({ text: "BetaBotz • Info Gempa" })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  },
  handleMessage: (message, client) => {
    startGempaPolling(client);
  },
};
