const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

module.exports = {
  prefix: "kolam",
  category: "rpg",
  aliases: ["fishpond"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first() || message.author;
    const processingMsg = await message.reply(`🌊 Memeriksa isi kolam milik **${targetUser.username}**...`);

    try {
        const userData = await api.getUser(targetUser.id, targetUser.username);
        const fishList = `
        🐋 **Paus**: ${userData.paus || 0}
        🦀 **Kepiting**: ${userData.kepiting || 0}
        🐙 **Gurita**: ${userData.gurita || 0}
        🦑 **Cumi**: ${userData.cumi || 0}
        🐡 **Ikan Buntal**: ${userData.buntal || 0}
        🐠 **Ikan Dory**: ${userData.dory || 0}
        🐬 **Lumba-Lumba**: ${userData.lumba || 0}
        🦞 **Lobster**: ${userData.lobster || 0}
        🦈 **Hiu**: ${userData.hiu || 0}
        🦐 **Udang**: ${userData.udang || 0}
        🐟 **Ikan lele**: ${userData.ikan || 0}
        🐟 **Ikan bawal**: ${userData.bawal || 0}
        🐱🐟 **Ikan lele**: ${userData.lele || 0}
        🐳 **Orca**: ${userData.orca || 0}
        `.trim();
        
        const embed = new EmbedBuilder()
            .setColor(0x00AEEF)
            .setTitle(`🐟 Kolam Ikan Milik ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setDescription(fishList)
            .addFields({ name: 'Peralatan', value: `🎣 **Pancingan**: ${userData.pancingan || 0}` })
            .setTimestamp();

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error("[KOLAM CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan saat mengambil data kolam: ${error.message}`);
    }
  },
};