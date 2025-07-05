const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../../config');

module.exports = {
  prefix: "taugasih",
  category: "fun",
  aliases: [],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    try {
      const url = `https://api.betabotz.eu.org/api/random/taugasih?apikey=${config.apikey_lann}`;
      const res = await fetch(url);
      const data = await res.json();
      const embed = new EmbedBuilder()
        .setColor(0x00bfff)
        .setTitle("Tau Gak Sih?")
        .setDescription(`“${data.taugasih}”`);
      await message.reply({ embeds: [embed] });
    } catch (e) {
      await message.reply(`Error: ${e.message || e}`);
    }
  }
};
