const { EmbedBuilder } = require('discord.js');

module.exports = {
  prefix: "purba",
  category: "fun",
  aliases: [],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    let teks = args.join(" ");
    if (!teks && message.reference?.messageId) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        teks = repliedMsg.content;
      } catch {
        teks = "";
      }
    }
    if (!teks) {
      teks = message.content.replace(/^!purba\s*/i, "");
    }
    if (!teks || !teks.trim()) {
      return message.reply("Masukkan teks yang ingin di-purba-kan!\nContoh: `!purba aku ganteng`");
    }
    const purba = teks.replace(/[aiueo]/gi, '$&ve');
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("Purba Text Generator")
      .addFields(
        { name: "Input", value: teks, inline: false },
        { name: "Output", value: purba, inline: false }
      );
    await message.reply({ embeds: [embed] });
  }
};
