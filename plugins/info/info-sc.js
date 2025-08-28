const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  prefix: "sc",
  category: "info",
  aliases: ["sourcecode", "script"],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const embed = new EmbedBuilder()
      .setColor(0x7289DA) // Warna biru Discord
      .setTitle("📦 Source Code")
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription("Bot ini dikembangkan dan terinspirasi dari beberapa projek bot open-source. Terima kasih!")
      .setFooter({ text: `Diminta oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    // [PERBAIKAN] Menggunakan tombol untuk link agar lebih rapi
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('AQUA BOT (DanaPutra)')
                .setStyle(ButtonStyle.Link)
                .setURL('https://github.com/DanaPutra133/AQUABOT_DC-V1'),
            new ButtonBuilder()
                .setLabel('Betabotz-Discord (ERLANRAHMAT)')
                .setStyle(ButtonStyle.Link)
                .setURL('https://github.com/ERLANRAHMAT/Betabotz-Discord')
        );

    await message.reply({ embeds: [embed], components: [row] });
  },
};
