const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config");
const api = require('../../api_handler.js'); // <-- Mengimpor handler API

// --- Konfigurasi Game ---
const gameSessions = new Map();
const gameTimeout = 120000;
const rewardPoint = 10000;
const penaltyAmount = 500; // Denda jika menyerah/waktu habis
// ---

async function fetchQuestion() {
    try {
        const response = await fetch(`https://api.betabotz.eu.org/api/game/tebaktempat?apikey=${config.apikey_lann}`);
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        return data[Math.floor(Math.random() * data.length)];
    } catch (error) {
        console.error("[TEBAK TEMPAT] Gagal mengambil data dari API:", error);
        return null;
    }
}

module.exports = {
  prefix: "tebaktempat",
  category: "game",
  aliases: ["tempat"],

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
            return message.reply("❗ Masih ada sesi Tebak Tempat yang sedang berlangsung di channel ini.");
        }

        const question = await fetchQuestion();
        if (!question || !question.img) {
            return message.reply("❌ Maaf, gagal memulai permainan. Tidak bisa mengambil soal dari server saat ini.");
        }

        const options = question.pilihan.map((opt, i) => `**${String.fromCharCode(65 + i)}.** ${opt}`).join('\n');

        const gameEmbed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle("🌍 Di Manakah Tempat Ini?")
          .setDescription(question.soal)
          .setImage(question.img)
          .addFields({ name: "Pilih Jawaban yang Benar:", value: options })
          .addFields(
              { name: "Waktu", value: `⏳ ${gameTimeout / 1000} detik`, inline: true },
              { name: "Hadiah", value: `💰 ${rewardPoint.toLocaleString('id-ID')}`, inline: true }
          )
          .setFooter({ text: "Jawab dengan huruf (A, B, C, D), !tpc untuk bantuan, atau !suren untuk menyerah." });

        await message.channel.send({ embeds: [gameEmbed] });

        const collector = message.channel.createMessageCollector({ time: gameTimeout });
        gameSessions.set(channelId, {
            question: question,
            collector: collector
        });

        collector.on('collect', async msg => {
            if (msg.author.bot) return;

            const session = gameSessions.get(channelId);
            if (!session) return; 

            const userGuess = msg.content.toLowerCase().trim();

            if (userGuess === "!tpc") {
                const hint = session.question.jawaban.replace(/[bcdfghjklmnpqrstvwxyz123456789]/gi, '_');
                return msg.reply(`**Bantuan:** \`${hint}\``);
            }
            if (userGuess === "!suren") {
                return collector.stop('surrender');
            }

            if (/^[a-d]$/.test(userGuess)) {
                const answerIndex = userGuess.charCodeAt(0) - 'a'.charCodeAt(0);
                const chosenOption = session.question.pilihan[answerIndex];

                if (chosenOption.toLowerCase() === session.question.jawaban.toLowerCase()) {
                    // Pola GET -> MODIFY -> POST untuk pemenang
                    const winnerId = msg.author.id;
                    const winnerUsername = msg.author.username;
                    const winnerData = await api.getUser(winnerId, winnerUsername);
                    winnerData.money += rewardPoint;
                    await api.updateUser(winnerId, winnerData);

                    await msg.reply(`✅ **Luar Biasa!** Jawabanmu benar, <@${winnerId}>!\nKamu dapat +**${rewardPoint.toLocaleString('id-ID')}** Money!\n\n**Info:** ${session.question.deskripsi}`);
                    collector.stop('correct');
                } else {
                    msg.react('❌').catch(() => {});
                }
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
                
                const reasonText = reason === 'time' ? '⏰ **Waktu habis!**' : 'Kamu menyerah.';
                message.channel.send(`${reasonText}\nJawaban yang benar adalah **${session.question.jawaban}**.\nKamu kehilangan **${penaltyAmount.toLocaleString('id-ID')}** Money.\n\n**Info:** ${session.question.deskripsi}`);
            }
            
            gameSessions.delete(channelId);
        });
    } catch (error) {
        console.error("[TEBAKTEMPAT CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  }
};