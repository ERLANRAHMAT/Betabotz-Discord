const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

module.exports = {
  prefix: "lirik",
  aliases: ["lyrics", "lyric"],
  category: "internet",
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const query = args.join(" ");
    if (!query) {
      return message.reply("❗ Contoh: `!lirik Bawa dia kembali`");
    }
    const waitMsg = await message.reply("🔎 Mencari lirik lagu...");
    try {
      const apiUrl = `https://api.betabotz.eu.org/api/search/lirik?lirik=${encodeURIComponent(
        query
      )}&apikey=${config.apikey_lann}`;
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (!data.result || !data.result.lyrics) {
        await waitMsg.edit(
          "❌ Tidak ditemukan lirik untuk pencarian tersebut."
        );
        return;
      }
      const embed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle(`🎵 ${data.result.title || query}`)
        .setDescription(data.result.lyrics)
        .addFields(
          { name: "Artist", value: data.result.artist || "-", inline: true },
          { name: "Link", value: data.result.image || "-", inline: true }
        )
        .setThumbnail(data.result.image)
        .setFooter({ text: "BetaBotz • Lirik Lagu" })
        .setTimestamp();

      await waitMsg.edit({ content: null, embeds: [embed] });
    } catch (e) {
      console.error("[LYRIC ERROR]", e);
      await waitMsg.edit("❌ Terjadi error saat mencari lirik.");
    }
  },
};
