const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

module.exports = {
  prefix: "google",
  category: "internet",
  aliases: [],
  async execute(message, args, client) {
    const query = args.join(" ");
    if (!query) {
      return message.reply(
        "❗ Masukkan kata kunci pencarian. Contoh: `!google discord bot`"
      );
    }
    const waitMsg = await message.reply("🔎 Mencari di Google...");
    try {
      const apiUrl = `https://api.betabotz.eu.org/api/search/google?text1=${encodeURIComponent(
        query
      )}&apikey=${config.apikey_lann}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (
        !data.status ||
        !Array.isArray(data.result) ||
        data.result.length === 0
      ) {
        await waitMsg.edit(
          "❌ Tidak ditemukan hasil untuk pencarian tersebut."
        );
        return;
      }

      const results = data.result
        .slice(0, 5)
        .map(
          ({ title, url, description }, i) =>
            `**${i + 1}. [${title}](${url})**\n${
              description || "_Tidak ada deskripsi_"
            }`
        )
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle(`Hasil Google: "${query}"`)
        .setDescription(results)
        .setFooter({ text: "BetaBotz • Google Search" })
        .setTimestamp();

      await waitMsg.edit({ content: null, embeds: [embed] });
    } catch (e) {
      console.error("[GOOGLE ERROR]", e);
      await waitMsg.edit("❌ Terjadi error saat mencari di Google.");
    }
  },
};
