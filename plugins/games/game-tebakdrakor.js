const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const similarity = require('similarity');
const config = require("../../config");
const api = require('../../api_handler.js'); // <-- Mengimpor handler API

// --- Konfigurasi Game ---
const gameSessions = new Map();
const gameTimeout = 120000;
const rewardPoint = 10000;
const penaltyAmount = 500; // Denda jika menyerah/waktu habis
const similarityThreshold = 0.72;
// ---

async function fetchQuestion() {
    try {
        const response = await fetch(`https://api.betabotz.eu.org/api/game/tebakdrakor?apikey=${config.apikey_lann}`);
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        return data[Math.floor(Math.random() * data.length)];
    } catch (error) {
        console.error("[TEBAK DRAKOR] Gagal mengambil data dari API:", error);
        return null;
    }
}

module.exports = {
  prefix: "tebakdrakor",
  category: "game",
  aliases: ["drakor"],

  async execute(message, args, client) {
    const channelId = message.channel.id;
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    try {
        // 1. GET: Ambil data user untuk cek uang
        const authorData = await api.getUser(authorId, authorUsername);
        if (authorData.money < penaltyAmount) {
            return message.reply(`💰 Uangmu tidak cukup untuk bermain. Kamu butuh setidaknya **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
        }

        if (gameSessions.has(channelId)) {
            return message.reply("❗ Masih ada sesi Tebak Drakor yang sedang berlangsung di channel ini.");
        }

        const question = await fetchQuestion();
        if (!question || !question.img) {
            return message.reply("❌ Maaf, gagal memulai permainan. Tidak bisa mengambil soal dari server saat ini.");
        }

        const gameEmbed = new EmbedBuilder()
          .setColor(0x00AEEF)
          .setTitle("📺 Tebak Judul Drama Korea!")
          .setDescription(`**Petunjuk:**\n> ${question.deskripsi}`)
          .setImage(question.img)
          .addFields(
              { name: "Waktu", value: `⏳ ${gameTimeout / 1000} detik`, inline: true },
              { name: "Hadiah", value: `💰 ${rewardPoint.toLocaleString('id-ID')}`, inline: true }
          )
          .setFooter({ text: "Ketik jawabanmu, !tdkt untuk bantuan, atau !suren untuk menyerah." });

        await message.channel.send({ embeds: [gameEmbed] });

        const collector = message.channel.createMessageCollector({ time: gameTimeout });
        gameSessions.set(channelId, {
            answer: question.jawaban,
            collector: collector
        });

        collector.on('collect', async msg => {
            if (msg.author.bot) return;

            const session = gameSessions.get(channelId);
            if (!session) return; 

            const userGuess = msg.content.toLowerCase().trim();
            const winnerId = msg.author.id;
            const winnerUsername = msg.author.username;

            if (userGuess === "!tdkt") {
                const hint = session.answer.replace(/[bcdfghjklmnpqrstvwxyz]/gi, '_');
                return msg.reply(`**Bantuan:** \`${hint}\``);
            }
            if (userGuess === "!suren") {
                return collector.stop('surrender');
            }

            if (userGuess === session.answer.toLowerCase()) {
                // Pola GET -> MODIFY -> POST untuk pemenang
                const winnerData = await api.getUser(winnerId, winnerUsername);
                winnerData.money += rewardPoint;
                await api.updateUser(winnerId, winnerData);
                
                await msg.reply(`✅ **Daebak!** Jawabannya adalah **${session.answer}**.\nSelamat <@${winnerId}>, kamu dapat +**${rewardPoint.toLocaleString('id-ID')}** Money!`);
                collector.stop('correct');
            } else if (similarity(userGuess.toLowerCase(), session.answer.toLowerCase()) >= similarityThreshold) {
                msg.reply("❗ **Hampir benar!** Coba periksa lagi judulnya.");
            } else {
                msg.react('❌').catch(() => {});
            }
        });

        collector.on('end', async (collected, reason) => {
            const session = gameSessions.get(channelId);
            if (!session) return;

            if (reason === 'surrender' || reason === 'time') {
                // Pola GET -> MODIFY -> POST untuk yang kalah
                const authorDataOnEnd = await api.getUser(authorId, authorUsername);
                authorDataOnEnd.money = Math.max(0, authorDataOnEnd.money - penaltyAmount);
                await api.updateUser(authorId, authorDataOnEnd);
                
                const reasonText = reason === 'time' ? '⏰ **Waktu habis!**' : 'Kamu menyerah...';
                message.channel.send(`${reasonText}\nJawaban yang benar adalah **${session.answer}**.\nKamu kehilangan **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
            }
            
            gameSessions.delete(channelId);
        });
    } catch (error) {
        console.error("[TEBAKDRAKOR CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  }
};