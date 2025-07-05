const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

module.exports = {
  prefix: "ssweb",
  category: "tools",
  aliases: ["sspc", "ss"],
  async execute(message, args, client) {
    if (!args[0]) {
      return message.reply("Input URL!");
    }
    if (args[0].match(/xnxx\.com|hamster\.com|nekopoi\.care/i)) {
      return message.reply("Link tersebut dilarang!");
    }
    await message.reply("_Ｌｏａｄｉｎｇ．．._");
    const url = args[0].startsWith("http") ? args[0] : "https://" + args[0];
    try {
      const apiKey = config.apikey_lann;
      const apiUrl = `https://api.betabotz.eu.org/api/tools/ssweb?url=${encodeURIComponent(
        url
      )}&device=desktop&apikey=${apiKey}`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        return message.reply("Gagal mengambil screenshot dari API.");
      }
      const buffer = await res.buffer();
      const file = new AttachmentBuilder(buffer, { name: "screenshot.jpg" });
      const embed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle("Screenshot Web")
        .setDescription(`URL: ${url}`)
        .setImage("attachment://screenshot.jpg")
        .setFooter({ text: "BetaBotz Screenshot Web" });
      await message.reply({ embeds: [embed], files: [file] });
    } catch (e) {
      console.error("[SSWEB ERROR]", e);
      await message.reply("Terjadi error!");
    }
  },
};
