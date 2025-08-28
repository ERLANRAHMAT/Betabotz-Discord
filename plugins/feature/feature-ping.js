const { EmbedBuilder } = require('discord.js');

module.exports = {
  // [DIUBAH] Kembali ke struktur prefix command
  prefix: 'ping',
  category: 'info',
  aliases: ['pong'],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    // Hitung latensi bolak-balik (Roundtrip) langsung
    const roundtripLatency = Date.now() - message.createdTimestamp;
    // Ambil latensi WebSocket (koneksi inti bot ke Discord)
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

    // Kirim pesan langsung dengan hasil pengukuran
    await message.reply({ embeds: [pingEmbed] });
  },
};
