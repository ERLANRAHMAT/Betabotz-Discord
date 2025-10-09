const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config");
const api = require('../../api_handler.js');

// --- Konfigurasi Game ---
const gameSessions = new Map();
const gameTimeout = 100000; // 100 detik
const rewardPoint = 10000;
const penaltyAmount = 500;
// ---

async function fetchQuestion() {
    try {
        const response = await fetch(`https://api.danafxc.my.id/api/proxy/games?q=fisika&apikey=${config.api.apiKey}`);
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("[FISIKA] Gagal mengambil data dari API:", error);
        return null;
    }
}

module.exports = {
  prefix: "fisika",
  category: "game",
  aliases: ["fska"], // fska sekarang menjadi alias untuk bantuan

  async execute(message, args, client) {
    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();
    const channelId = message.channel.id;
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    // --- Logika untuk Perintah Bantuan (!fska) ---
    if (command === 'fska') {
        const session = gameSessions.get(channelId);
        if (!session) return message.reply("Tidak ada soal Fisika yang aktif di channel ini.");
        
        const answer = session.answer;
        const clue = answer.replace(/[bcdfghjklmnpqrstvwxyz123456789]/gi, '_');
        return message.reply(`**Bantuan:** \`${clue}\``);
    }
    
    // --- Logika Utama untuk Memulai Game (!fisika) ---
    try {
        const authorData = await api.getUser(authorId, authorUsername);
        if (authorData.money < penaltyAmount) {
            return message.reply(`💰 Uangmu tidak cukup untuk bermain. Kamu butuh setidaknya **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
        }

        if (gameSessions.has(channelId)) {
            return message.reply("❗ Masih ada soal Fisika yang sedang berlangsung di channel ini.");
        }

        const question = await fetchQuestion();
        if (!question || !question.soal) {
            return message.reply("❌ Maaf, gagal memulai permainan. Tidak bisa mengambil soal dari server saat ini.");
        }

        const options = question.pilihan.map((opt, i) => `**${String.fromCharCode(65 + i)}.** ${opt}`).join('\n');

        const gameEmbed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle("🔬 Kuis Fisika")
          .setDescription(`${question.soal}\n\n${options}`)
          .addFields(
              { name: "Level", value: `\`${question.level}\``, inline: true },
              { name: "Waktu", value: `⏳ ${gameTimeout / 1000} detik`, inline: true },
              { name: "Hadiah", value: `💰 ${rewardPoint.toLocaleString('id-ID')}`, inline: true }
          )
          .setFooter({ text: "Balas dengan huruf jawaban (A, B, C, atau D), atau !suren untuk menyerah." });

        await message.channel.send({ embeds: [gameEmbed] });

        const collector = message.channel.createMessageCollector({ 
            filter: m => !m.author.bot,
            time: gameTimeout 
        });

        gameSessions.set(channelId, {
            answer: question.jawaban,
            options: question.pilihan,
            description: question.deskripsi,
            collector: collector
        });

        collector.on('collect', async msg => {
            const session = gameSessions.get(channelId);
            if (!session) return; 

            const userGuess = msg.content.toLowerCase().trim();
            
            if (userGuess === "!suren") {
                return collector.stop('surrender');
            }

            const answerIndex = ['a', 'b', 'c', 'd'].indexOf(userGuess);
            if (answerIndex !== -1) {
                if (session.options[answerIndex].toLowerCase() === session.answer.toLowerCase()) {
                    const winnerId = msg.author.id;
                    const winnerUsername = msg.author.username;

                    const winnerData = await api.getUser(winnerId, winnerUsername);
                    winnerData.money += rewardPoint;
                    await api.updateUser(winnerId, winnerData);
                    
                    await msg.reply(`✅ **Benar!** Jawabannya adalah **${session.answer}**.\n*Penjelasan: ${session.description}*\n\nSelamat <@${winnerId}>, kamu mendapatkan +**${rewardPoint.toLocaleString('id-ID')}** Money!`);
                    collector.stop('correct');
                } else {
                    msg.reply("Jawabanmu salah, coba lagi!").catch(() => {});
                }
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
                message.channel.send(`${reasonText}\nJawaban yang benar adalah **${session.answer}**.\nKamu kehilangan **${penaltyAmount.toLocaleString('id-ID')}** Money.`);
            }
            
            gameSessions.delete(channelId);
        });
    } catch (error) {
        console.error("[FISIKA CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  }
};