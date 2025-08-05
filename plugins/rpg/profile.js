const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const api = require('../../api_handler.js');
const { expForNextLevel } = require('../../level_handler.js');

/**
 * Membuat progress bar teks sederhana.
 */
function createProgressBar(currentValue, maxValue, size = 10) {
    const percentage = Math.max(0, Math.min(1, currentValue / maxValue));
    const progress = Math.round(size * percentage);
    const emptyProgress = size - progress;
    return `[${'█'.repeat(progress)}${'▒'.repeat(emptyProgress)}]`;
}

module.exports = {
  // [BARU] Properti 'data' untuk mendefinisikan slash command
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Menampilkan profil dan statistik RPG Anda atau pengguna lain.')
    .addUserOption(option => 
      option.setName('user')
            .setDescription('Pengguna yang profilnya ingin dilihat (opsional)')
            .setRequired(false)), // Argumen ini tidak wajib diisi
  
  category: "rpg",
  
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction, client) {
    // Balas interaksi terlebih dahulu untuk menghindari timeout
    await interaction.deferReply();

    // Ambil target dari opsi, jika tidak ada, gunakan pengguna yang menjalankan perintah
    const targetUser = interaction.options.getUser('user') || interaction.user;

    try {
        // GET data dari API
        const userData = await api.getUser(targetUser.id, targetUser.username);
        const rpg = userData.rpg;
        
        const requiredExp = expForNextLevel(rpg.level);
        const expProgress = createProgressBar(rpg.exp, requiredExp);

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle(`⚔️ Profil RPG: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '🌟 Level', value: `\`${rpg.level}\``, inline: true },
                { name: '❤️ Health', value: `\`${rpg.health}\``, inline: true },
                { name: '💧 Mana', value: `\`${rpg.mana}\``, inline: true },
                { name: '✨ Experience (XP)', value: `${expProgress} ${rpg.exp.toLocaleString('id-ID')} / ${requiredExp.toLocaleString('id-ID')}` },
                { name: '👤 Pangkat', value: `\`${userData.role}\``, inline: false },
                { name: '💰 Money', value: `Rp ${(userData.money || 0).toLocaleString('id-ID')}`, inline: true },
                { name: '🎟️ Limit', value: `\`${(userData.limit || 0)}\``, inline: true }
            );

        // Edit balasan awal dengan hasil akhir
        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        await interaction.editReply(`❌ Gagal mengambil profil: ${error.message}`);
    }
  },
};