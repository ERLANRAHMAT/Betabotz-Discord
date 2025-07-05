const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

module.exports = {
  prefix: "spek",
  aliases: ["gsmarena", "spesifikasi"],
  category: "internet",
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const query = args.join(" ");
    if (!query) {
      return message.reply("❗ Contoh: `!spek Infinix Hot 40 Pro`");
    }
    const waitMsg = await message.reply("🔎 Mencari spesifikasi HP...");
    try {
      const apiUrl = `https://api.betabotz.eu.org/api/webzone/gsmarena?query=${encodeURIComponent(
        query
      )}&apikey=${config.apikey_lann}`;
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (!json.result || !json.result.specifications) {
        await waitMsg.edit(
          "❌ Tidak ditemukan spesifikasi untuk pencarian tersebut."
        );
        return;
      }
      const spec = json.result.specifications;
      // Build embed
      const embed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle(json.result.name || "Device Info")
        .setThumbnail(json.result.image)
        .setURL(json.result.url)
        .setDescription(
          `**Network:** ${spec.network?.technology || "-"}\n` +
            `**Platform:** ${[
              spec.platform?.chipset,
              spec.platform?.cpu,
              spec.platform?.gpu,
              spec.platform?.os,
            ]
              .filter(Boolean)
              .join(", ")}\n` +
            `**Display:** ${[
              spec.display?.type,
              spec.display?.size,
              spec.display?.resolution,
            ]
              .filter(Boolean)
              .join(", ")}\n` +
            `**Memory:** ${spec.memory?.internal || "-"} (Card: ${
              spec.memory?.cardSlot || "-"
            })\n` +
            `**Main Camera:** ${[
              spec.mainCamera?.dual,
              spec.mainCamera?.features,
              spec.mainCamera?.video,
            ]
              .filter(Boolean)
              .join(", ")}\n` +
            `**Battery:** ${spec.battery?.type || "-"}, Charging: ${
              spec.battery?.charging || "-"
            }\n` +
            `**Sensors:** ${spec.features?.sensors || "-"}\n` +
            `**Colors:** ${
              Array.isArray(spec.colors)
                ? spec.colors.join(", ")
                : spec.colors || "-"
            }\n` +
            `**Performance:**\n${
              Array.isArray(spec.performance)
                ? spec.performance.join("\n")
                : spec.performance || "-"
            }`
        )
        .setFooter({ text: "BetaBotz • GSM Arena" })
        .setTimestamp();

      await waitMsg.edit({ content: null, embeds: [embed] });
    } catch (e) {
      console.error("[SPEK ERROR]", e);
      await waitMsg.edit("❌ Terjadi error saat mencari spesifikasi.");
    }
  },
};
