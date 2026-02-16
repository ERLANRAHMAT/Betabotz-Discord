const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

module.exports = {
  prefix: "kandang",
  category: "rpg",
  aliases: ["kandang"],

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first() || message.author;
    const processingMsg = await message.reply(
      `Memeriksa isi kandang milik **${targetUser.username}**...`,
    );

    try {
      const userData = await api.getUser(targetUser.id, targetUser.username);
      const fishList = `
        🐓 **ayam**: ${userData.ayam || 0}
        🐖 **babi**: ${userData.babi || 0}
        🐄 **sapi**: ${userData.sapi || 0}
        🐐 **kambing**: ${userData.kambing || 0}
        🐃 **kerbau**: ${userData.kerbau || 0}
        `.trim();

      const embed = new EmbedBuilder()
        .setColor(0x00aeef)
        .setTitle(`kandang Hewan Milik ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription(fishList)
        .addFields({
          name: "Peralatan",
          value: `⚔️ **sword**: ${userData.sword || 0}`,
          value: `🏹 **bow**: ${userData.bow || 0}`,
        })
        .setTimestamp();

      await processingMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
      console.error("[KANDANG CMD ERROR]", error);
      await processingMsg.edit(
        `❌ Terjadi kesalahan saat mengambil data kandang: ${error.message}`,
      );
    }
  },
};