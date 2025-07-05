const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

module.exports = {
  prefix: "darkjokes",
  category: "fun",
  aliases: [],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    await message.react("⏳");
    try {
      const apiUrl = `https://api.betabotz.eu.org/api/wallpaper/darkjokes?apikey=${config.apikey_lann}`;
      const imgBuffer = await fetch(apiUrl).then(res => res.buffer());

      const embed = new EmbedBuilder()
        .setColor("#222222")
        .setTitle("🖤 Dark Jokes")
        .setImage("attachment://file.jpg")
        .setFooter({ text: "BetaBotz • ArteonStudio" })
        .setTimestamp();

      await message.channel.send({
        embeds: [embed],
        files: [new AttachmentBuilder(imgBuffer, { name: "file.jpg" })],
      });

      await message.reactions.removeAll().catch(() => {});
    } catch (e) {
      console.error(e);
      await message.reply("Error mengambil darkjokes.");
      await message.reactions.removeAll().catch(() => {});
      await message.react("❌").catch(() => {});
    }
  },
};
