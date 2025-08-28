const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config");
const api = require('../../api_handler.js');

const gameSessions = new Map();
const initialAttempts = 3;
const apiUrl = `https://api.danafxc.my.id/api/proxy/games/math?apikey=${config.apikey_dana}`;

// --- Konfigurasi Hadiah & Denda ---
const rewardAmounts = {
    noob: 1000, easy: 5000, medium: 25000, hard: 75000, master: 150000,
    grandmaster: 300000, legendary: 500000, mythic: 750000, god: 1000000,
};
const penaltyAmount = 1000;
const defaultReward = 10000;
// ---

const timeLimits = {
    noob: 30000, easy: 45000, medium: 60000, hard: 90000, master: 120000,
    grandmaster: 150000, legendary: 180000, mythic: 240000, god: 300000,
};
const defaultTime = 60000;

async function fetchAllQuestions() {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API soal Math gagal merespons.`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Format data soal Math tidak valid.");
    return data;
  } catch (error) {
    console.error("[MATH API] Gagal mengambil data soal:", error);
    return null;
  }
}

function normalizeAnswer(str) {
    return str.replace(/\s+/g, '').toLowerCase();
}

module.exports = {
  prefix: "math",
  category: "game",
  aliases: ["mtk"],

  async execute(message, args, client) {
    const channelId = message.channel.id;
    const mode = args[0]?.toLowerCase();
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    // ==================== PERBAIKAN UTAMA DI SINI ====================
    // Blok ini akan berjalan jika user hanya mengetik `!math`
    if (!mode) {
        const loadingHelp = await message.reply("🔍 Mengambil daftar level yang tersedia...");
        const allQuestions = await fetchAllQuestions();
        
        if (!allQuestions) {
            return loadingHelp.edit("❌ Gagal mengambil daftar level dari API.");
        }
        if (!Array.isArray(allQuestions)) {
            return loadingHelp.edit("❌ Format data level dari API tidak benar.");
        }

        const availableModes = [...new Set(allQuestions.map(q => q.level))];
        const modeOrder = ['noob', 'easy', 'medium', 'hard', 'master', 'grandmaster', 'legendary', 'mythic', 'god'];
        const sortedModes = availableModes.sort((a, b) => modeOrder.indexOf(a) - modeOrder.indexOf(b));

        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("❓ Bantuan Permainan Math")
            .setDescription("Uji kemampuan matematikamu dari level dasar hingga dewa!")
            .addFields(
                { name: "Cara Bermain", value: `Gunakan perintah \`!math <mode>\`\nContoh: \`!math god\`` },
                { name: "Mode yang Tersedia", value: `\`${sortedModes.join('`, `')}\`` }
            );
        // Hentikan eksekusi setelah mengirim bantuan
        return loadingHelp.edit({ content: null, embeds: [helpEmbed] });
    }
    // ==================== AKHIR PERBAIKAN ====================
    
    try {
        const authorData = await api.getUser(authorId, authorUsername);
        if (authorData.money < penaltyAmount) {
            return message.reply(`💰 Uangmu tidak cukup untuk bermain. Butuh **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
        }

        if (gameSessions.has(channelId)) {
            return message.reply("❗ Masih ada soal matematika di channel ini.");
        }
        
        const loadingMessage = await message.reply(`🔍 Mencari soal level **${mode}**...`);
        const allQuestions = await fetchAllQuestions();
        if (!allQuestions) return loadingMessage.edit("❌ Gagal mengambil soal dari API.");

        const questionsForLevel = allQuestions.filter(q => q.level.toLowerCase() === mode);
        if (questionsForLevel.length === 0) {
            return loadingMessage.edit(`❌ Maaf, tidak ditemukan soal untuk level **${mode}**. Coba level lain.`);
        }

        const question = questionsForLevel[Math.floor(Math.random() * questionsForLevel.length)];
        const time = timeLimits[question.level] || defaultTime;
        const reward = rewardAmounts[question.level] || defaultReward;

        const gameEmbed = new EmbedBuilder()
          .setColor(0xF1C40F).setTitle(`🧮 Matematika Level: ${question.level}`)
          .setDescription(`**Deskripsi:** ${question.deskripsi}`).addFields(
              { name: 'Soal', value: `\`\`\`${question.soal}\`\`\`` },
              { name: "Waktu", value: `⏳ ${(time / 1000)} detik`, inline: true },
              { name: "Hadiah", value: `💰 ${reward.toLocaleString('id-ID')}`, inline: true },
              { name: "Denda", value: `💸 ${penaltyAmount.toLocaleString('id-ID')}`, inline: true },
              { name: "Kesempatan", value: `❤️ ${initialAttempts} kali`, inline: false }
          ).setFooter({ text: "Ketik jawabanmu langsung di channel ini!" });

        await loadingMessage.edit({ content: "Soal ditemukan!", embeds: [gameEmbed] });

        const collector = message.channel.createMessageCollector({ time });
        gameSessions.set(channelId, {
            answer: question.jawaban, reward: reward, attempts: initialAttempts,
        });

        collector.on('collect', async msg => {
            if (msg.author.bot) return;
            const session = gameSessions.get(channelId);
            if (!session) return collector.stop();
            
            if (normalizeAnswer(msg.content) === normalizeAnswer(session.answer)) {
                try {
                    const winnerData = await api.getUser(msg.author.id, msg.author.username);
                    winnerData.money += session.reward;
                    await api.updateUser(msg.author.id, winnerData);
                    await msg.reply(`✅ **Jenius!**\nSelamat, <@${msg.author.id}>, kamu menang +**${session.reward.toLocaleString('id-ID')}** Money!`);
                } catch(e) {
                    console.error("[MATH GAME] Gagal menyimpan hadiah:", e);
                    await msg.reply(`✅ **Jenius!** Jawaban benar, tapi gagal menyimpan hadiahmu.`);
                }
                collector.stop('correct');
            } else {
                session.attempts--;
                if (session.attempts <= 0) {
                    collector.stop('no_attempts');
                } else {
                    msg.react('❌');
                    msg.reply(`Jawaban salah! Sisa **${session.attempts}** kesempatan.`).then(replyMsg => {
                        setTimeout(() => replyMsg.delete().catch(() => {}), 7000);
                    });
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            const session = gameSessions.get(channelId);
            if (!session) return;
            gameSessions.delete(channelId);
            if (['time', 'no_attempts'].includes(reason)) {
                try {
                    const authorDataOnEnd = await api.getUser(authorId, authorUsername);
                    authorDataOnEnd.money = Math.max(0, authorDataOnEnd.money - penaltyAmount);
                    await api.updateUser(authorId, authorDataOnEnd);
                    const reasonText = reason === 'time' ? '⏰ **Waktu habis!**' : '❌ **Kesempatan Habis!**';
                    message.channel.send(`${reasonText}\nJawaban: **${session.answer}**.\n<@${authorId}> kehilangan **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
                } catch(e) {
                    console.error("[MATH GAME] Gagal menyimpan denda:", e);
                    message.channel.send(`Waktu/kesempatan habis. Jawaban: **${session.answer}**.\n*(Gagal menyimpan denda ke database.)*`);
                }
            }
        });

    } catch (error) {
        console.error("[MATH CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  }
};