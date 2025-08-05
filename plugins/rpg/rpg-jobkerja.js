const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');
const levelHandler = require('../../level_handler.js');

// ==================== PUSAT DATA PEKERJAAN ====================
// Hadiah sekarang berupa nilai maksimal yang bisa didapat secara acak
const JOBS_DATA = {
    gojek: { name: 'Gojek', emoji: '🛵', specialCommand: '`!antar @user`', rewards: { moneyMax: 11000, expMax: 100 }, cooldown: 3600000 }, // 1 jam
    kurir: { name: 'Kurir', emoji: '📦', specialCommand: 'Tidak ada', rewards: { moneyMax: 15000, expMax: 90 }, cooldown: 3600000 }, // 1 jam
    'karyawan indomaret': { name: 'Karyawan Indomaret', emoji: '🏪', specialCommand: 'Tidak ada', rewards: { moneyMax: 27000, expMax: 120 }, cooldown: 5400000 }, // 1.5 jam
    polisi: { name: 'Polisi', emoji: '👮', specialCommand: '`!penjara @user`', rewards: { moneyMax: 31000, expMax: 150 }, cooldown: 7200000 }, // 2 jam
    dokter: { name: 'Dokter', emoji: '🧑‍⚕️', specialCommand: '`!heal @user`', rewards: { moneyMax: 150000, expMax: 300 }, cooldown: 10800000 }, // 3 jam
    developer: { name: 'Developer', emoji: '💻', specialCommand: '`!code` (Contoh)', rewards: { moneyMax: 200000, expMax: 400 }, cooldown: 14400000 }, // 4 jam
    trader: { name: 'Trader', emoji: '📈', specialCommand: '`!invest` (Contoh)', rewards: { moneyMax: 500000, expMax: 250 }, cooldown: 7200000 }, // 2 jam
};
// =========================================================

function msToTime(ms) {
    let h = Math.floor(ms / 3600000);
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

module.exports = {
  prefix: "job",
  category: "rpg",
  aliases: ["pekerjaan"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const subCommand = args[0]?.toLowerCase();

    try {
        if (!subCommand) {
            const userData = await api.getUser(authorId, authorUsername);
            const currentJobKey = userData.job?.toLowerCase().replace(/ /g, '') || 'pengangguran';
            if (currentJobKey === 'pengangguran' || !JOBS_DATA[currentJobKey]) {
                return message.reply("Kamu masih pengangguran. Ketik `!job list` untuk melihat pekerjaan.");
            }
            const jobInfo = JOBS_DATA[currentJobKey];
            const embed = new EmbedBuilder().setColor(0x0099FF).setTitle(`Pekerjaanmu: ${jobInfo.name} ${jobInfo.emoji}`)
                .addFields(
                    { name: "Potensi Gaji", value: `💰 Hingga ${jobInfo.rewards.moneyMax.toLocaleString('id-ID')} | ✨ Hingga ${jobInfo.rewards.expMax} XP`, inline: true },
                    { name: "Cooldown", value: `🕒 ${msToTime(jobInfo.cooldown).split(':')[0]} jam`, inline: true },
                    { name: "Perintah Spesial", value: jobInfo.specialCommand, inline: false }
                ).setFooter({ text: "Gunakan `!job work` untuk bekerja." });
            return message.reply({ embeds: [embed] });
        }

        if (subCommand === 'list') {
            const jobList = Object.values(JOBS_DATA).map(job => `• **${job.name}** ${job.emoji}`).join('\n');
            const embed = new EmbedBuilder().setColor(0x3498DB).setTitle("📋 Daftar Pekerjaan").setDescription(jobList)
                .setFooter({ text: "Gunakan `!job apply <nama_pekerjaan>`." });
            return message.reply({ embeds: [embed] });
        }

        if (subCommand === 'apply') {
            const jobKey = args.slice(1).join('').toLowerCase();
            if (!jobKey || !JOBS_DATA[jobKey]) {
                return message.reply("Pekerjaan tidak valid. Ketik `!job list` untuk melihat daftar.");
            }
            const userData = await api.getUser(authorId, authorUsername);
            userData.job = JOBS_DATA[jobKey].name;
            await api.updateUser(authorId, userData);
            return message.reply(`✅ Selamat! Kamu sekarang bekerja sebagai **${JOBS_DATA[jobKey].name}**.`);
        }

        if (subCommand === 'work') {
            const userData = await api.getUser(authorId, authorUsername);
            
            if (userData.jail) return message.reply("⛓️ Kamu tidak bisa bekerja karena ada di penjara!");

            const currentJobKey = userData.job?.toLowerCase().replace(/ /g, '');
            if (!currentJobKey || !JOBS_DATA[currentJobKey]) {
                return message.reply("Kamu pengangguran! Cari pekerjaan dulu dengan `!job apply <nama>`.");
            }

            const jobInfo = JOBS_DATA[currentJobKey];
            const lastWork = userData.lastjobkerja || 0;
            if (Date.now() - lastWork < jobInfo.cooldown) {
                const remaining = jobInfo.cooldown - (Date.now() - lastWork);
                return message.reply(`Kamu baru saja bekerja. Istirahat dulu, kembali lagi dalam **${msToTime(remaining)}**.`);
            }
            
            const moneyGained = Math.floor(Math.random() * jobInfo.rewards.moneyMax);
            const expGained = Math.floor(Math.random() * jobInfo.rewards.expMax);

            userData.money += moneyGained;
            userData.rpg.exp += expGained;
            userData.jobexp = (userData.jobexp || 0) + 1;
            userData.lastjobkerja = Date.now();
            await api.updateUser(authorId, userData);

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71).setTitle("💼 Laporan Kerja")
                .setDescription(`Kamu telah bekerja sebagai **${jobInfo.name}** dan mendapatkan:\n\n💰 **+${moneyGained.toLocaleString('id-ID')}** Money\n✨ **+${expGained}** XP`);
            await message.reply({ embeds: [embed] });

            const levelUpInfo = await levelHandler.checkLevelUp(authorId, authorUsername);
            if (levelUpInfo.leveledUp) {
                const levelUpEmbed = new EmbedBuilder().setColor(0xFFD700).setTitle("🎉 LEVEL UP!")
                    .setDescription(`Selamat, kamu telah mencapai **Level ${levelUpInfo.newLevel}**!`);
                await message.channel.send({ embeds: [levelUpEmbed] });
            }
        }
    } catch (error) {
        console.error("[JOB CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};