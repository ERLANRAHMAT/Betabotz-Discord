const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const uploader = require("../../lib/uploadImage");
const uploadFile = require("../../lib/uploadFile");
const config = require("../../config");

module.exports = {
  prefix: "bardimg",
  category: "ai",
  aliases: ["bardimage", "bardvideo", "bardaudio"],
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply(
        `kirim Gambar/Audio/Video dengan caption dan command \`${
          config.prefix || "!"
        }bardimg pertanyaanmu\``
      );
    }
    const attachment = message.attachments.first();
    if (!attachment) {
      return message.reply("❌ kirim Gambar/Audio/Video dengan caption dan command.");
    }
    const mime = attachment.contentType || "";
    let urlAPI, mediaUrl;
    const waitMsg = await sendApiProcessing(message, "Bard AI Image/Media");

    try {
      // Download attachment
      let fetchBuffer;
      const res = await fetch(attachment.url);
      if (typeof res.buffer === "function") {
        fetchBuffer = await res.buffer();
      } else {
        fetchBuffer = Buffer.from(await res.arrayBuffer());
      }
      // Upload ke server
      if (/image/g.test(mime) && !/webp/g.test(mime)) {
        mediaUrl = await uploader(fetchBuffer, "false", config.apikey_lann);
        urlAPI = `https://api.betabotz.eu.org/api/search/bard-img?url=${mediaUrl}&text=${encodeURIComponent(
          args.join(" ")
        )}&apikey=${config.apikey_lann}`;
      } else if (/video/g.test(mime)) {
        if (attachment.duration && attachment.duration > 60) {
          return waitMsg.edit({
            content: "❌ Maximum video duration is 60 seconds!",
          });
        }
        mediaUrl = await uploadFile(fetchBuffer);
        urlAPI = `https://api.betabotz.eu.org/api/search/bard-video?url=${mediaUrl}&text=${encodeURIComponent(
          args.join(" ")
        )}&apikey=${config.apikey_lann}`;
      } else if (/audio/g.test(mime)) {
        mediaUrl = await uploadFile(fetchBuffer);
        urlAPI = `https://api.betabotz.eu.org/api/search/bard-audio?url=${mediaUrl}&text=${encodeURIComponent(
          args.join(" ")
        )}&apikey=${config.apikey_lann}`;
      } else {
        return waitMsg.edit({
          content: `❌ kirim Gambar/Audio/Video dengan caption dan command \`${
            config.prefix || "!"
          }bardimg pertanyaanmu\``,
        });
      }

      const json = await (await fetch(urlAPI)).json();
      if (json.status && json.result) {
        await waitMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor("#67DFF4")
              .setTitle("Bard AI Media")
              .setDescription(json.result)
              .setFooter({ text: "BetaBotz Bard AI" }),
          ],
        });
      } else {
        await sendApiError(
          message,
          "Failed to get response from Bard",
          "Bard AI Media"
        );
      }
    } catch (err) {
      console.error("[BARDIMG ERROR]", err);
      await sendApiError(message, err, "Bard AI Media");
    }
  },
};
