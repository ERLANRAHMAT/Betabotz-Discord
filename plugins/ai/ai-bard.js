const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bard")
    .setDescription("Bertanya kepada Bard AI.")
    .addStringOption(option =>
      option.setName('pertanyaan')
            .setDescription('Tulis pertanyaan yang ingin kamu ajukan')
            .setRequired(true)), 
  
  category: "ai",
  
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    const question = interaction.options.getString('pertanyaan');

    try {
      const q = encodeURIComponent(question);
      const apiUrl = `https://api.betabotz.eu.org/api/search/bard-ai?apikey=${config.apikey_lann}&text=${q}`;
      
      const res = await fetch(apiUrl);
      const json = await res.json();
      
      if (json && json.message) {
        const embed = new EmbedBuilder()
          .setColor("#67DFF4")
          .setAuthor({ name: "Bard AI", iconURL: "https://i.imgur.com/Kxysn2y.png" }) // Menambahkan ikon Bard
          .setDescription(json.message)
          .setFooter({ text: `Diminta oleh: ${interaction.user.username}` });
                await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply("❌ Maaf, gagal mendapatkan jawaban dari Bard saat ini.");
      }
    } catch (err) {
      console.error("[BARD CMD ERROR]", err);
      await interaction.editReply(`❌ Terjadi kesalahan saat menghubungi Bard AI: ${err.message}`);
    }
  },
};