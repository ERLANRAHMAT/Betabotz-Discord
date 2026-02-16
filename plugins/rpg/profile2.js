const { EmbedBuilder } = require('discord.js');
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
  // Ganti 'data' SlashCommandBuilder dengan properti command biasa
  prefix: "profile",
  aliases: ["me"], // Alias agar bisa dipanggil dengan !p atau !stat
  description: "Menampilkan profil dan statistik RPG Anda atau pengguna lain.",
  category: "rpg",

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    // 1. Tentukan target user
    // Jika ada mention (@user), pakai itu. Jika tidak, pakai diri sendiri (message.author)
    const targetUser = message.mentions.users.first() || message.author;

    // 2. Kirim pesan loading (pengganti deferReply)
    const processingMsg = await message.reply(
      `🔍 Mengambil profil **${targetUser.username}**...`,
    );

    try {
      // GET data dari API
      const userData = await api.getUser(targetUser.id, targetUser.username);

      // Cek jika data rpg belum ada
      if (!userData || !userData.rpg) {
        return processingMsg.edit(
          `❌ Data RPG untuk **${targetUser.username}** belum ditemukan/dibuat.`,
        );
      }

      const rpg = userData.rpg;
      const requiredExp = expForNextLevel(rpg.level);
      const expProgress = createProgressBar(rpg.exp, requiredExp);

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`⚔️ Profil RPG: ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "🌟 Level", value: `\`${rpg.level}\``, inline: true },
          { name: "❤️ Health", value: `\`${rpg.health}\``, inline: true },
          { name: "💧 Mana", value: `\`${rpg.mana}\``, inline: true },
          {
            name: "✨ Experience (XP)",
            value: `${expProgress} ${rpg.exp.toLocaleString("id-ID")} / ${requiredExp.toLocaleString("id-ID")}`,
          },
          {
            name: "👤 Pangkat",
            value: `\`${userData.role || "User"}\``,
            inline: false,
          },
          {
            name: "💰 Money",
            value: `Rp ${(userData.money || 0).toLocaleString("id-ID")}`,
            inline: true,
          },
          {
            name: "🎟️ Limit",
            value: `\`${userData.limit || 0}\``,
            inline: true,
          },
        )
        .setFooter({
          text: `Requested by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        });

      // Edit pesan loading dengan hasil akhir
      await processingMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
      console.error(error);
      // Pastikan processingMsg masih ada sebelum diedit
      if (processingMsg.editable) {
        await processingMsg.edit(`❌ Gagal mengambil profil: ${error.message}`);
      }
    }
  },
};