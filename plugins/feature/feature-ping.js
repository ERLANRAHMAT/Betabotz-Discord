const { EmbedBuilder } = require("discord.js");

module.exports = {
  prefix: 'ping',
  category: 'feature',
  aliases: [],
  async execute(message, args, client) {
    if (message.author.bot) return;
    const start = Date.now();
    const sent = await message.reply('Mengukur ping...');
    const responseTime = Date.now() - start;

    const pingEmbed = new EmbedBuilder()
      .setColor("#67DFF4")
      .setTitle("🏓 Pong!")
      .setDescription(`Halo ${message.author.username}, bot aktif!\nBerhasil respons dalam **${responseTime}ms**`)
      .setFooter({
        text: "ArteonStudio Ping",
        iconURL: message.client.user.displayAvatarURL()
      })
      .setTimestamp();

    await sent.edit({ content: null, embeds: [pingEmbed] });
  },
};