const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// Fungsi untuk format waktu
function msToTime(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    
    let timeString = "";
    if (hours > 0) timeString += `${hours} jam `;
    if (minutes > 0) timeString += `${minutes} menit `;
    if (seconds > 0) timeString += `${seconds} detik`;

    return timeString.trim() || "beberapa saat";
}

module.exports = {
  prefix: "checkjail",
  category: "rpg",
  aliases: ["cj", "jailstatus"],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first() || message.author;
    const processingMsg = await message.reply(`🔍 Memeriksa status penjara untuk **${targetUser.username}**...`);

    try {
        const userData = await api.getUser(targetUser.id, targetUser.username);

        const jailInfo = userData.jail || { status: false, reason: null, until: 0 };
        const currentTime = Date.now();

        if (jailInfo.status) {
            if (currentTime >= jailInfo.until) {
                userData.jail = { status: false, reason: null, until: 0 };
                await api.updateUser(targetUser.id, userData);
                
                return await processingMsg.edit(`🎉 **${targetUser.username}** telah dibebaskan dari penjara!`);
            } else {
                const remainingTime = jailInfo.until - currentTime;
                const embed = new EmbedBuilder()
                    .setColor(0x34495E)
                    .setTitle(`⛓️ Status Penjara: ${targetUser.username}`)
                    .setDescription(`**${targetUser.username}** saat ini berada di dalam penjara.`)
                    .addFields(
                        { name: "Alasan", value: `*${jailInfo.reason || 'Tidak ada alasan'}*` },
                        { name: "Sisa Waktu", value: `**${msToTime(remainingTime)}**` }
                    );
                return await processingMsg.edit({ content: null, embeds: [embed] });
            }
        } else {
            return await processingMsg.edit(`✅ **${targetUser.username}** tidak sedang berada di dalam penjara.`);
        }

    } catch (error) {
        console.error("[CHECKJAIL CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};