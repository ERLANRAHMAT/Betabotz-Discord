const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js'); 

const weeklyMoneyReward = 25000; 
const weeklyLimitReward = 2;
const weeklydiamondtReward = 1; 
const weeklyExp = 150; 
const cooldown = 604800000; 


function msToTime(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    return `${days} hari ${hours} jam ${minutes} menit`;
}

module.exports = {
  prefix: "weekly",
  category: "rpg",
  aliases: ["mingguan"],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    
    const processingMsg = await message.reply("⏳ Memeriksa data mingguanmu...");

    try {

        const userData = await api.getUser(authorId, authorUsername);

        const lastClaim = userData.lastWeekly || 0;
        const currentTime = Date.now();

        if (currentTime - lastClaim < cooldown) {
            const remainingTime = cooldown - (currentTime - lastClaim);
            return processingMsg.edit(`🎁 Anda sudah mengambil hadiah mingguan.\nSilakan kembali lagi dalam **${msToTime(remainingTime)}**.`);
        }
        userData.money += weeklyMoneyReward;
        userData.limit += weeklyLimitReward;
        userData.diamond += weeklydiamondtReward;
        userData.rpg.exp += weeklyExp;
        userData.lastWeekly = currentTime;

        await api.updateUser(authorId, userData);
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("🎉 Hadiah Mingguan Berhasil Diklaim!")
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(`Kamu mendapatkan hadiah mingguan spesial!`)
            .addFields(
                { name: 'Hadiah yang Diterima', value: `💰 **+${weeklyMoneyReward.toLocaleString('id-ID')}** Money\n🎟️ **+${weeklyLimitReward}** Limit\n💎 **+${weeklydiamondtReward}** diamond\n **+${weeklyExp.toLocaleString('id-ID')}** Exp` },
                { name: 'Total Milikmu Sekarang', value: `💰 **${userData.money.toLocaleString('id-ID')}** Money\n🎟️ **${userData.limit}** Limit\n💎 **+${userData.diamond}** diamond` }
            )
            .setFooter({ text: "Kembali lagi minggu depan untuk hadiah lainnya!" })
            .setTimestamp();

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error("[WEEKLY CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan saat memproses hadiah mingguan: ${error.message}`);
    }
  },
};