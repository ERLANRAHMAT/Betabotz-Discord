const { EmbedBuilder } = require('discord.js');

module.exports = {
  prefix: "rate",
  category: "fun",
  aliases: ["seberapa", "cocok", "kece"],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply("Masukkan sesuatu untuk dirate!\nContoh: `!rate seberapa cocok aku dan dia`");
    }
    const rating = Math.floor(Math.random() * 100) + 1;
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("📊 Rate Result")
      .addFields(
        { name: "Pertanyaan", value: args.join(" "), inline: false },
        { name: "Jawaban", value: `${rating}%`, inline: true }
      );
    await message.reply({ embeds: [embed] });
  }
};
