const { EmbedBuilder } = require('discord.js');

module.exports = {
  prefix: 'ping',
  category: 'info',
  aliases: ['pong'],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const sent = await message.reply({ content: '🏓 Mengukur ping...' });

    const roundtripLatency = sent.createdTimestamp - message.createdTimestamp;
    const websocketLatency = client.ws.ping;

    const pingEmbed = new EmbedBuilder()
      .setColor("#67DFF4")
      .setTitle("🏓 Pong!")
      .setDescription(`Berikut adalah hasil pengukuran latensi bot saat ini.`)
      .addFields(
        { name: 'Latensi Bot (Roundtrip)', value: `\`${roundtripLatency}ms\``, inline: true },
        { name: 'Latensi API (WebSocket)', value: `\`${websocketLatency}ms\``, inline: true }
      )
      .setFooter({
        text: `Diminta oleh ${message.author.username}`,
        iconURL: message.author.displayAvatarURL()
      })
      .setTimestamp();

    await sent.edit({ content: null, embeds: [pingEmbed] });
  },
};
