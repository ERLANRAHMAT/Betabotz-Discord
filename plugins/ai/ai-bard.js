const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config.js");

module.exports = {
  prefix: "bard",
  category: "ai",
  aliases: ["bardai"],
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply(
        `Masukkan pertanyaan!\n\n*Contoh:* \`${
          config.prefix || "!"
        }bard Siapa presiden Indonesia?\``
      );
    }
    const waitMsg = await sendApiProcessing(message, "Bard AI");
    try {
      const q = encodeURIComponent(args.join(" "));
      const apiUrl = `https://api.betabotz.eu.org/api/search/bard-ai?apikey=${config.apikey_lann}&text=${q}`;
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (json && json.message) {
        await waitMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor("#67DFF4")
              .setTitle("Bard AI")
              .setDescription(json.message)
              .setFooter({ text: "BetaBotz Bard AI" }),
          ],
        });
      } else {
        await sendApiError(
          message,
          "Gagal mendapatkan jawaban dari Bard.",
          "Bard AI"
        );
      }
    } catch (err) {
      console.error("[BARD ERROR]", err);
      await sendApiError(message, err, "Bard AI");
    }
  },
};
