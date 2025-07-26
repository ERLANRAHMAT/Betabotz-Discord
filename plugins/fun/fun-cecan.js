const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config");

// Daftar semua kategori/negara yang valid
const categories = [
    { name: 'China', value: 'china' },
    { name: 'Vietnam', value: 'vietnam' },
    { name: 'Thailand', value: 'thailand' },
    { name: 'Indonesia', value: 'indonesia' },
    { name: 'Korea', value: 'korea' },
    { name: 'Japan', value: 'japan' },
    { name: 'Malaysia', value: 'malaysia' },
    { name: 'Justinaxie', value: 'justinaxie' },
    { name: 'Jeni', value: 'jeni' },
    { name: 'Jiso', value: 'jiso' },
    { name: 'Ryujin', value: 'ryujin' },
    { name: 'Rose', value: 'rose' },
    { name: 'Hijaber', value: 'hijaber' }
];

module.exports = {
  // [BARU] Properti 'data' untuk mendefinisikan slash command
  data: new SlashCommandBuilder()
    .setName('cecan')
    .setDescription('Mengirim gambar cecan acak berdasarkan kategori.')
    .addStringOption(option =>
      option.setName('kategori')
            .setDescription('Pilih kategori gambar yang diinginkan')
            .setRequired(true)
            .addChoices(...categories)), 
  
  category: "fun",
  
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    // 1. Balas interaksi terlebih dahulu untuk menghindari timeout
    await interaction.deferReply();

    // 2. Ambil kategori dari pilihan pengguna
    const category = interaction.options.getString('kategori');

    const api1 = `https://api.betabotz.eu.org/api/cecan/${category}?apikey=${config.apikey_lann}`;
    const api2 = `https://api.botcahx.eu.org/api/cecan/${category}?apikey=${config.btc}`;
    
    let imageBuffer;

    try {
      // Coba API pertama
      let response = await fetch(api1);
      if (!response.ok) throw new Error(`API 1 gagal: ${response.status}`);
      imageBuffer = await response.buffer();
      console.log(`[Cecan] Berhasil dari API 1 untuk ${category}.`);

    } catch (error) {
      console.warn(`[Cecan] API 1 gagal: ${error.message}. Mencoba API 2...`);
      try {
        // Jika API pertama gagal, coba API kedua
        let response2 = await fetch(api2);
        if (!response2.ok) throw new Error(`API 2 juga gagal: ${response2.status}`);
        imageBuffer = await response2.buffer();
        console.log(`[Cecan] Berhasil dari API 2 untuk ${category}.`);
      } catch (finalError) {
        console.error(`[Cecan] Kedua API gagal untuk ${category}: ${finalError.message}`);
        return interaction.editReply("❌ Maaf, kedua sumber gambar sedang bermasalah. Coba lagi nanti.");
      }
    }
    
    try {
        const attachment = new AttachmentBuilder(imageBuffer, { name: `${category}.jpg` });
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle(`Random ${category.charAt(0).toUpperCase() + category.slice(1)}`)
            .setImage(`attachment://${category}.jpg`)
            .setFooter({ text: `Diminta oleh: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        // Edit balasan awal dengan hasil akhir
        await interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (sendError) {
        console.error("[Cecan] Gagal mengirim pesan:", sendError);
        await interaction.editReply("❌ Terjadi kesalahan saat mencoba menampilkan gambar.");
    }
  },
};