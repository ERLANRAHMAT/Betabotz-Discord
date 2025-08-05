const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');
const levelHandler = require('../../level_handler.js');


const JOBS_DATA = {
    polisi: { name: 'Polisi', emoji: '👮', thumbnail: 'https://i.imgur.com/219r62d.jpeg', specialCommand: '`!penjara @user`', rewards: { money: 7000, exp: 150 }, cooldown: 7200000 }, // 2 jam
    dokter: { name: 'Dokter', emoji: '🧑‍⚕️', thumbnail: 'https://i.imgur.com/4QI522f.jpeg', specialCommand: '`!heal @user`', rewards: { money: 8000, exp: 175 }, cooldown: 7200000 }, // 2 jam
    gojek: { name: 'Gojek', emoji: '🛵', thumbnail: 'https://i.imgur.com/u1zP32c.jpeg', specialCommand: '`!antar @user` (Contoh)', rewards: { money: 5000, exp: 100 }, cooldown: 3600000 }, // 1 jam
    kurir: { name: 'Kurir', emoji: '📦', thumbnail: 'https://i.imgur.com/d4L23gP.jpeg', specialCommand: 'Tidak ada', rewards: { money: 4500, exp: 90 }, cooldown: 3600000 }, // 1 jam
    youtuber: { name: 'Youtuber', emoji: '▶️', thumbnail: 'https://i.imgur.com/u1zP32c.jpeg', specialCommand: '`!upload` (Contoh)', rewards: { money: 6000, exp: 120 }, cooldown: 5400000 }, // 1.5 jam
    developer: { name: 'Developer', emoji: '💻', thumbnail: 'https://i.imgur.com/MOKo6m6.jpeg', specialCommand: '`!code` (Contoh)', rewards: { money: 10000, exp: 200 }, cooldown: 10800000 }, // 3 jam
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
        // --- !job (Melihat status pekerjaan) ---
        if (!subCommand) {
            const userData = await api.getUser(authorId, authorUsername);
            const currentJobKey = userData.job?.toLowerCase() || 'pengangguran';

            if (currentJobKey === 'pengangguran') {
                return message.reply("Kamu masih pengangguran. Ketik `!job list` untuk melihat pekerjaan yang tersedia.");
            }

            const jobInfo = JOBS_DATA[currentJobKey];
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`Pekerjaanmu: ${jobInfo.name} ${jobInfo.emoji}`)
                .setThumbnail(jobInfo.thumbnail)
                .addFields(
                    { name: "Gaji per Kerja", value: `💰 ${jobInfo.rewards.money.toLocaleString('id-ID')} | ✨ ${jobInfo.rewards.exp} XP`, inline: true },
                    { name: "Cooldown", value: `🕒 ${msToTime(jobInfo.cooldown).split(':')[0]} jam`, inline: true },
                    { name: "Perintah Spesial", value: jobInfo.specialCommand, inline: false }
                )
                .setFooter({ text: "Gunakan `!job work` untuk bekerja." });
            
            return message.reply({ embeds: [embed] });
        }

        // --- !job list ---
        if (subCommand === 'list') {
            const jobList = Object.entries(JOBS_DATA).map(([key, job]) => {
                return `• **${job.name}** ${job.emoji}`;
            }).join('\n');
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle("📋 Daftar Pekerjaan")
                .setDescription(jobList)
                .setFooter({ text: "Gunakan `!job apply <nama_pekerjaan>` untuk melamar." });
            return message.reply({ embeds: [embed] });
        }

        // --- !job apply <pekerjaan> ---
        if (subCommand === 'apply') {
            const jobKey = args[1]?.toLowerCase();
            if (!jobKey || !JOBS_DATA[jobKey]) {
                return message.reply("Pekerjaan tidak valid. Ketik `!job list` untuk melihat daftar pekerjaan.");
            }
            const userData = await api.getUser(authorId, authorUsername);
            userData.job = JOBS_DATA[jobKey].name;
            await api.updateUser(authorId, userData);
            return message.reply(`✅ Selamat! Kamu sekarang bekerja sebagai **${JOBS_DATA[jobKey].name}**.`);
        }

        // --- !job work ---
        if (subCommand === 'work') {
            const userData = await api.getUser(authorId, authorUsername);
            const currentJobKey = userData.job?.toLowerCase();
            if (!currentJobKey || !JOBS_DATA[currentJobKey]) {
                return message.reply("Kamu pengangguran! Cari pekerjaan dulu dengan `!job apply <nama>`.");
            }

            const jobInfo = JOBS_DATA[currentJobKey];
            const lastWork = userData.lastjobkerja || 0;
            if (Date.now() - lastWork < jobInfo.cooldown) {
                const remaining = jobInfo.cooldown - (Date.now() - lastWork);
                return message.reply(`Kamu baru saja bekerja. Istirahat dulu, kembali lagi dalam **${msToTime(remaining)}**.`);
            }
            
            // Modify & Post
            userData.money += jobInfo.rewards.money;
            userData.rpg.exp += jobInfo.rewards.exp;
            userData.jobexp = (userData.jobexp || 0) + 1;
            userData.lastjobkerja = Date.now();
            await api.updateUser(authorId, userData);

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71).setTitle("💼 Laporan Kerja")
                .setDescription(`Kamu telah bekerja sebagai **${jobInfo.name}** dan mendapatkan:\n\n💰 **+${jobInfo.rewards.money.toLocaleString('id-ID')}** Money\n✨ **+${jobInfo.rewards.exp}** XP`);
            await message.reply({ embeds: [embed] });

            // Cek level up
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