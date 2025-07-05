const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

let lastStockHash = null;
let lastStockData = null;
let pollingStarted = false;

async function fetchStocks() {
  const apiUrl = `https://api.betabotz.eu.org/api/webzone/grow-and-garden-stock?apikey=${config.apikey_lann}`;
  try {
    const res = await fetch(apiUrl);
    console.log("[GROWGARDEN API] Fetch status:", res.status);
    if (!res.ok) {
      console.error(
        `[GROWGARDEN API] HTTP Error: ${res.status} ${res.statusText}`
      );
      return null;
    }
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (!data || !data.status || !data.result || !data.result.data) {
        console.error(
          "[GROWGARDEN API] Invalid data structure:",
          JSON.stringify(data, null, 2)
        );
        return null;
      }
      return data.result.data;
    } catch (e) {
      console.error(
        "[GROWGARDEN API] Invalid JSON response:",
        text.slice(0, 200)
      );
      return null;
    }
  } catch (err) {
    console.error("[GROWGARDEN API] Fetch error:", err);
    return null;
  }
}

function generateStockHash(data) {
  // Buat hash sederhana berdasarkan nama dan jumlah stok
  return JSON.stringify(
    data.map((item) => `${item.category}:${item.name}:${item.count}`).sort()
  );
}

function startStockPolling(client) {
  if (pollingStarted) return;
  pollingStarted = true;
  setInterval(async () => {
    const data = await fetchStocks();
    if (!data) {
      console.log("[GROWGARDEN POLLING] No valid data received from API");
      return;
    }

    // Buat hash untuk data stok saat ini
    const stockHash = generateStockHash(data);
    console.log(
      "[GROWGARDEN POLLING] Checking stockHash:",
      stockHash.slice(0, 100)
    );

    // Hanya kirim notifikasi jika data berubah
    if (lastStockHash !== stockHash) {
      lastStockHash = stockHash;
      lastStockData = data;
      console.log("[GROWGARDEN POLLING] New stock data detected");

      // Kirim ke channel khusus dari config
      const channelId = config.growgardenChannelId;
      if (!channelId) {
        console.error(
          "[GROWGARDEN POLLING] No growgardenChannelId set in config.js"
        );
        return;
      }

      const channel = client.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(
          `[GROWGARDEN POLLING] Channel with ID ${channelId} not found or not text-based`
        );
        return;
      }

      try {
        const gearStocks = data.filter(
          (item) => item.category === "GEAR STOCKS"
        );
        const eggStocks = data.filter((item) => item.category === "EGG STOCKS");
        const seedsStocks = data.filter(
          (item) => item.category === "SEEDS STOCKS"
        );
        const eventStocks = data.filter(
          (item) => item.category === "EVENT STOCKS"
        );

        const description =
          `**🛠️ Gear Stocks:**\n${
            gearStocks.length > 0
              ? gearStocks
                  .map((item) => `- ${item.name}: ${item.count}`)
                  .join("\n")
              : "Tidak ada data"
          }\n\n` +
          `**🥚 Egg Stocks:**\n${
            eggStocks.length > 0
              ? eggStocks
                  .map((item) => `- ${item.name}: ${item.count}`)
                  .join("\n")
              : "Tidak ada data"
          }\n\n` +
          `**🌾 Seeds Stocks:**\n${
            seedsStocks.length > 0
              ? seedsStocks
                  .map((item) => `- ${item.name}: ${item.count}`)
                  .join("\n")
              : "Tidak ada data"
          }\n\n` +
          `**🎉 Event Stocks:**\n${
            eventStocks.length > 0
              ? eventStocks
                  .map((item) => `- ${item.name}: ${item.count}`)
                  .join("\n")
              : "Tidak ada data"
          }`;

        const embed = new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("🌱 Grow & Garden Stocks - Pembaruan Otomatis")
          .setDescription(description)
          .setFooter({ text: "BetaBotz • Grow & Garden" })
          .setTimestamp();

        await channel.send({ embeds: [embed] });
        console.log(
          `[GROWGARDEN POLLING] Sent notification to channel ${channelId}`
        );
      } catch (e) {
        console.error(
          `[GROWGARDEN POLLING] Error sending to channel ${channelId}:`,
          e
        );
      }
    } else {
      console.log("[GROWGARDEN POLLING] No new stock data");
    }
  }, 300 * 1000); // 5 menit
}

module.exports = {
  prefix: "growgarden",
  category: "internet",
  aliases: ["growgarden"],
  async execute(message, args, client) {
    console.log(`[GROWGARDEN] Command triggered by: ${message.author.tag}`);

    // Mulai polling jika belum jalan
    startStockPolling(client);

    const waitMsg = await message.reply(
      "⏳ Sedang memproses data stok Grow & Garden..."
    );
    const apiKey = config.apikey_lann;
    console.log("[GROWGARDEN] apiKey:", apiKey);

    try {
      const data = await fetchStocks();
      if (!data) {
        console.error("[GROWGARDEN] No valid data received from API");
        await waitMsg.edit({
          content: "[ ! ] Data stok Grow & Garden tidak ditemukan.",
        });
        return;
      }

      // Perbarui lastStockData dan lastStockHash untuk perintah manual
      lastStockHash = generateStockHash(data);
      lastStockData = data;

      const gearStocks = data.filter((item) => item.category === "GEAR STOCKS");
      const eggStocks = data.filter((item) => item.category === "EGG STOCKS");
      const seedsStocks = data.filter(
        (item) => item.category === "SEEDS STOCKS"
      );
      const eventStocks = data.filter(
        (item) => item.category === "EVENT STOCKS"
      );

      const description =
        `**🛠️ Gear Stocks:**\n${
          gearStocks.length > 0
            ? gearStocks
                .map((item) => `- ${item.name}: ${item.count}`)
                .join("\n")
            : "Tidak ada data"
        }\n\n` +
        `**🥚 Egg Stocks:**\n${
          eggStocks.length > 0
            ? eggStocks
                .map((item) => `- ${item.name}: ${item.count}`)
                .join("\n")
            : "Tidak ada data"
        }\n\n` +
        `**🌾 Seeds Stocks:**\n${
          seedsStocks.length > 0
            ? seedsStocks
                .map((item) => `- ${item.name}: ${item.count}`)
                .join("\n")
            : "Tidak ada data"
        }\n\n` +
        `**🎉 Event Stocks:**\n${
          eventStocks.length > 0
            ? eventStocks
                .map((item) => `- ${item.name}: ${item.count}`)
                .join("\n")
            : "Tidak ada data"
        }`;

      const embed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("🌱 Grow & Garden Stocks")
        .setDescription(description)
        .setFooter({ text: "BetaBotz • Grow & Garden" })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      await waitMsg.delete().catch(() => {});
      console.log("[GROWGARDEN] Successfully sent stock data");
    } catch (e) {
      console.error("[GROWGARDEN ERROR]:", e);
      await waitMsg.edit({
        content: "[ ! ] Terjadi kesalahan saat memproses data stok.",
      });
    }
  },
  handleMessage: (message, client) => {
    // Mulai polling saat bot menerima pesan
    startStockPolling(client);
  },
};
