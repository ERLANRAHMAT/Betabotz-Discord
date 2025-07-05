const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../../config');

module.exports = {
  prefix: "dare",
  category: "game",
  aliases: ["berani", "tantangan"],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    try {
      const dare = await fetch(`https://api.betabotz.eu.org/api/random/dare?apikey=${config.apikey_lann}`)
        .then(res => res.json());
      const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle("DARE / TANTANGAN")
        .setDescription(`“${dare.result}”`)
        .setImage('https://i.ibb.co/305yt26/bf84f20635dedd5dde31e7e5b6983ae9.jpg');
      await message.reply({ embeds: [embed] });
    } catch (e) {
      await message.reply(`Error: ${e.message || e}`);
    }
  }
};
