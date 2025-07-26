const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  // [BARU] Properti 'data' untuk mendefinisikan slash command
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Memeriksa latensi bot dan API Discord.'),
  
  category: 'info', // Kategori tetap ada untuk loader Anda
  
  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    // Kirim pesan awal dan tunggu balasannya untuk diukur
    const sent = await interaction.reply({ content: '🏓 Mengukur ping...', fetchReply: true });

    // Hitung latensi bolak-balik (Roundtrip)
    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
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
        text: `Diminta oleh ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Edit pesan awal dengan hasil akhir
    await interaction.editReply({ content: null, embeds: [pingEmbed] });
  },
};