const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  // [BARU] Properti 'data' untuk mendefinisikan slash command
  data: new SlashCommandBuilder()
    .setName('alay')
    .setDescription('Mengubah teks menjadi format aL4y g3nErAt0r.')
    .addStringOption(option => 
      option.setName('teks')
            .setDescription('Teks yang ingin diubah menjadi alay')
            .setRequired(true)), // Argumen ini wajib diisi
  
  category: 'fun',
  
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    // 1. Ambil teks langsung dari opsi slash command
    const teks = interaction.options.getString('teks');

    // 2. Logika untuk mengubah teks menjadi alay (tidak berubah)
    let alay = teks.replace(/[a-z]/gi, v =>
      Math.random() > 0.5
        ? v[["toLowerCase", "toUpperCase"][Math.floor(Math.random() * 2)]]()
        : v
    ).replace(/[abegiors]/gi, v => {
      if (Math.random() > 0.5) return v;
      switch (v.toLowerCase()) {
        case "a": return "4";
        case "b": return Math.random() > 0.5 ? "8" : "13";
        case "e": return "3";
        case "g": return Math.random() > 0.5 ? "6" : "9";
        case "i": return "1";
        case "o": return "0";
        case "r": return "12";
        case "s": return "5";
      }
      return v; // Tambahkan default return untuk switch
    });

    // 3. Kirim hasilnya sebagai balasan
    await interaction.reply(alay);
  },
};