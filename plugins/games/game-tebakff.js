const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const similarity = require('similarity');
const config = require("../../config");
const api = require('../../api_handler.js');

const gameSessions = new Map();
const gameTimeout = 120000;
const rewardPoint = 12000;
const penaltyAmount = 600;
const similarityThreshold = 0.7;

async function fetchQuestion() {
    try {
        const response = await fetch(`https://api.betabotz.eu.org/api/game/tebakepep?apikey=${config.apikey_lann}`);
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        return data[Math.floor(Math.random() * data.length)];
    } catch (error) {
        console.error("[TEBAK EPEP] Gagal mengambil data dari API:", error);
        return null;
    }
}

module.exports = {
  prefix: "tebakepep",
  category: "game",
  aliases: ["epep", "tebakff"],

  async execute(message, args, client) {
    const channelId = message.channel.id;
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    try {
        const authorData = await api.getUser(authorId, authorUsername);
        if (authorData.money < penaltyAmount) {
            return message.reply(`💰 Uangmu tidak cukup untuk bermain. Kamu butuh setidaknya **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
        }

        if (gameSessions.has(channelId)) {
            return message.reply("❗ Masih ada sesi Tebak Karakter FF yang sedang berlangsung.");
        }

        const question = await fetchQuestion();
        if (!question || !question.img) {
            return message.reply("❌ Maaf, gagal memulai permainan. Tidak bisa mengambil soal dari server saat ini.");
        }

        const gameEmbed = new EmbedBuilder()
          .setColor(0xFFA500) 
          .setTitle("🔫 Siapakah Karakter Free Fire Ini?")
          .setDescription(`**Petunjuk Skill:**\n> *${question.deskripsi}*`)
          .setImage(question.img)
          .addFields(
              { name: "Waktu", value: `⏳ ${gameTimeout / 1000} detik`, inline: true },
              { name: "Hadiah", value: `💰 ${rewardPoint.toLocaleString('id-ID')}`, inline: true }
          )
          .setFooter({ text: "Ketik nama karakter, !epephelp untuk bantuan, atau !suren untuk menyerah." });

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

            if (userGuess === "!epephelp") {
                const hint = session.answer.replace(/[bcdfghjklmnpqrstvwxyz]/gi, '_');
                return msg.reply(`**Bantuan:** \`${hint}\``);
            }
            if (userGuess === "!suren") {
                return collector.stop('surrender');
            }

            if (similarity(userGuess, session.answer.toLowerCase()) >= similarityThreshold) {
                const winnerData = await api.getUser(winnerId, winnerUsername);
                winnerData.money += rewardPoint;
                await api.updateUser(winnerId, winnerData);
                
                await msg.reply(`✅ **BOOYAH!** Jawabannya adalah **${session.answer}**.\nSelamat <@${winnerId}>, kamu mendapatkan +**${rewardPoint.toLocaleString('id-ID')}** Money!`);
                collector.stop('correct');
            } else {
                msg.react('❌').catch(() => {});
            }
        });

        collector.on('end', async (collected, reason) => {
            const session = gameSessions.get(channelId);
            if (!session) return;

            if (reason === 'surrender' || reason === 'time') {
                const authorDataOnEnd = await api.getUser(authorId, authorUsername);
                authorDataOnEnd.money = Math.max(0, authorDataOnEnd.money - penaltyAmount);
                await api.updateUser(authorId, authorDataOnEnd);
                
                const reasonText = reason === 'time' ? '⏰ **Waktu habis!**' : 'Kamu menyerah...';
                message.channel.send(`${reasonText}\nJawabannya adalah **${session.answer}**.\nKamu kehilangan **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
            }
            
            gameSessions.delete(channelId);
        });
    } catch (error) {
        console.error("[TEBAKEPEP CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  }
};