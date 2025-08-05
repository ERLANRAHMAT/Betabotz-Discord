const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const similarity = require('similarity');
const config = require("../../config");
const api = require('../../api_handler.js'); // Menggunakan API handler untuk ekonomi

const gameState = new Map();
const gameTimeout = 100000;
const rewardPoint = 10000;
const penaltyAmount = 500;
const threshold = 0.72;

async function fetchQuestion() {
    try {
        const res = await fetch(`https://api.betabotz.eu.org/api/game/asahotak?apikey=${config.apikey_lann}`);
        if (!res.ok) throw new Error(`API response not OK: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error("API tidak mengembalikan data soal.");
        return data[Math.floor(Math.random() * data.length)];
    } catch (e) {
        console.error(`[ASAHOTAK] Gagal mengambil soal:`, e);
        return null;
    }
}

module.exports = {
  prefix: "asahotak",
  category: "games",
  aliases: ["ao"],
    
  async execute(message, args, client) {
    const channelId = message.channel.id;
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    try {
        const authorData = await api.getUser(authorId, authorUsername);
        if (authorData.money < penaltyAmount) {
            return message.reply(`💰 Uangmu tidak cukup untuk bermain. Butuh **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
        }

        if (gameState.has(channelId) && !gameState.get(channelId).answered) {
            return message.reply('Masih ada soal belum terjawab di channel ini!');
        }

        const question = await fetchQuestion();
        if (!question) return message.reply(`❌ Gagal memuat soal asah otak.`);

        const embed = new EmbedBuilder()
          .setColor(0x2ecc71).setTitle("🧠 Asah Otak")
          .setDescription(`**Soal:** ${question.soal}`)
          .addFields(
            { name: "Waktu", value: `${(gameTimeout / 1000).toFixed(0)} detik`, inline: true },
            { name: "Hadiah", value: `💰 ${rewardPoint.toLocaleString('id-ID')}`, inline: true },
            { name: "Bantuan", value: `Ketik \`!toka\``, inline: false }
          );

        const sentMsg = await message.reply({ embeds: [embed] });

        const timeoutObj = setTimeout(async () => {
            if (gameState.has(channelId)) {
                const session = gameState.get(channelId);
                try {
                    const authorDataOnEnd = await api.getUser(authorId, authorUsername);
                    authorDataOnEnd.money = Math.max(0, authorDataOnEnd.money - penaltyAmount);
                    await api.updateUser(authorId, authorDataOnEnd);
                    await message.channel.send(`⏰ Waktu habis! Jawaban: **${session.jawaban}**.\nKamu kehilangan **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
                } catch (e) {
                    await message.channel.send(`⏰ Waktu habis! Jawaban: **${session.jawaban}**.`);
                }
                gameState.delete(channelId);
            }
        }, gameTimeout);

        gameState.set(channelId, {
          jawaban: question.jawaban,
          timeoutObj,
          answered: false,
          playerId: authorId, // Simpan ID pemain
          playerUsername: authorUsername // Simpan username pemain
        });

    } catch (error) {
        console.error("[ASAHOTAK CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },

  subCommands: {
    toka: { 
        handler: async (message) => {
            const channelId = message.channel.id;
            if (!gameState.has(channelId)) return message.reply("Tidak ada soal asah otak aktif.");
            const { jawaban } = gameState.get(channelId);
            const clue = jawaban.replace(/[bcdfghjklmnpqrstvwxyz]/gi, '_');
            await message.reply(`**Bantuan:** \`${clue}\``);
        }
    }
  },

  // [DIPERBARUI] Message handler untuk memeriksa jawaban secara langsung
  async handleMessage(message, client) {
    const channelId = message.channel.id;
    if (!gameState.has(channelId) || message.author.bot) return;

    const state = gameState.get(channelId);
    if (state.answered) return;

    // Abaikan jika itu adalah perintah lain
    if (message.content.startsWith(config.prefix)) {
        // Izinkan !toka, tapi tambahkan !suren di sini
        if (message.content.toLowerCase().startsWith(`${config.prefix}toka`)) return;
        if (message.content.toLowerCase() === `${config.prefix}suren`) {
            clearTimeout(state.timeoutObj);
            state.answered = true;
            gameState.delete(channelId);
            try {
                const authorDataOnEnd = await api.getUser(state.playerId, state.playerUsername);
                authorDataOnEnd.money = Math.max(0, authorDataOnEnd.money - penaltyAmount);
                await api.updateUser(state.playerId, authorDataOnEnd);
                await message.reply(`Kamu menyerah... Jawabannya adalah **${state.jawaban}**.\nKamu kehilangan **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
            } catch (e) {
                await message.reply(`Kamu menyerah... Jawabannya adalah **${state.jawaban}**.`);
            }
            return;
        }
        return; // Abaikan perintah lain
    }
    
    const userAnswer = message.content.trim();
    if (!userAnswer) return;

    if (userAnswer.toLowerCase() === state.jawaban.toLowerCase().trim()) {
        clearTimeout(state.timeoutObj);
        state.answered = true;
        gameState.delete(channelId);
        
        try {
            const winnerData = await api.getUser(message.author.id, message.author.username);
            winnerData.money += rewardPoint;
            await api.updateUser(message.author.id, winnerData);
            await message.reply(`✅ **Benar!** Jawabannya **${state.jawaban}**.\nSelamat <@${message.author.id}>, kamu dapat +**${rewardPoint.toLocaleString('id-ID')}** Money!`);
        } catch (error) {
            await message.reply(`✅ **Benar!** Jawabannya adalah **${state.jawaban}**.\n*(Gagal menyimpan hadiah ke database.)*`);
        }

    } else if (similarity(userAnswer.toLowerCase(), state.jawaban.toLowerCase().trim()) >= threshold) {
        await message.reply(`*Dikit Lagi!*`);
    } else {
        await message.react('❌');
    }
  }
};