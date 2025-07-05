const fetch = require('node-fetch');
const config = require('../../config');

module.exports = {
  prefix: "meme",
  category: "fun",
  aliases: [],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    try {
      const url = `https://api.betabotz.eu.org/api/wallpaper/meme?apikey=${config.apikey_lann}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil meme dari API.");
      const buffer = await res.buffer();
      await message.channel.send({
        files: [{ attachment: buffer, name: "meme.jpg" }]
      });
    } catch (e) {
      await message.reply(`Error: ${e.message || e}`);
    }
  }
};
