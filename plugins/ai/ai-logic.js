const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

module.exports = {
  prefix: "ai2",
  category: "ai",
  aliases: ["openai2", "chatgpt2"],
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply(
        `Masukkan pertanyaan!\n\n*Contoh:* \`${
          config.prefix || "!"
        }openai2 Siapa Kamu?\``
      );
    }
    const waitMsg = await sendApiProcessing(message, "OpenAI Logic");
    try {
      // Set logic sesuai kebutuhan
      const logic =
        "Hai Saya Adalah BetaBotz-Md Bot Whatsapp Yang Dikembangkan Oleh Lann, Saya Bernama Betabotz-Md, Saya Dibuat Oleh Lann Dengan Penuh Kesempurnaan Yang Tiada Taraa, Jika Kamu Ingin Mencari Tau Lebih Dalam Tentang Ownerku Visit https://api.betabotz.org";
      const q = encodeURIComponent(args.join(" "));
      const apiUrl = `https://api.betabotz.eu.org/api/search/openai-logic?text=${q}&logic=${encodeURIComponent(
        logic
      )}&apikey=${config.apikey_lann}`;
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (json && json.message) {
        await waitMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor("#67DFF4")
              .setTitle("OpenAI Logic")
              .setDescription(json.message)
              .setFooter({ text: "BetaBotz AI Logic" }),
          ],
        });
      } else {
        await sendApiError(
          message,
          "Gagal mendapatkan jawaban dari OpenAI Logic.",
          "OpenAI Logic"
        );
      }
    } catch (err) {
      console.error("[AI-LOGIC ERROR]", err);
      await sendApiError(message, err, "OpenAI Logic");
    }
  },
};
