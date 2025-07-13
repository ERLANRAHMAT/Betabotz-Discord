const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const similarity = require('similarity');
const config = require("../../config");

const gameSessions = new Map();
const gameTimeout = 120000; // 2 menit
const rewardPoint = 1000;
const similarityThreshold = 0.75;
// URL gambar statis untuk thumbnail
const gameThumbnail = "https://i.imgur.com/346218s.png"; // Gambar emoji berpikir

async function fetchQuestion() {
    try {
        const response = await fetch(`https://api.betabotz.eu.org/api/game/tebakemoji?apikey=${config.apikey_lann}`);
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        return data[Math.floor(Math.random() * data.length)];
    } catch (error) {
        console.error("[TEBAK EMOJI] Gagal mengambil data dari API:", error);
        return null;
    }
}

module.exports = {
  prefix: "tebakemoji",
  category: "game",
  aliases: ["temoji"],

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const channelId = message.channel.id;

    if (gameSessions.has(channelId)) {
        return message.reply("❗ Masih ada sesi Tebak Emoji yang sedang berlangsung di channel ini.");
    }

    const question = await fetchQuestion();
    if (!question) {
        return message.reply("❌ Maaf, gagal memulai permainan. Tidak bisa mengambil soal dari server.");
    }

    // ==================== PERUBAHAN DI SINI ====================
    // Emoji dipindahkan ke dalam description, dan thumbnail menggunakan URL gambar.
    const gameEmbed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle("🤔 Tebak Emoji")
      .setThumbnail(gameThumbnail) // Menggunakan URL gambar, bukan emoji
      .setDescription(
        `Tebak arti dari rangkaian emoji di bawah ini!\n\n` +
        `**Emoji:**\n# ${question.emoticon}\n\n` + // Emoji ditampilkan di sini
        `**Soal:**\n> ${question.soal}`
      )
      .addFields(
          { name: "Waktu", value: `${gameTimeout / 1000} detik`, inline: true },
          { name: "Hadiah", value: `💰 ${rewardPoint.toLocaleString()}`, inline: true }
      )
      .setFooter({ text: "Ketik jawabanmu, !hemo untuk bantuan, atau !suren untuk menyerah." });
    // ==================== AKHIR PERUBAHAN ====================

    await message.channel.send({ embeds: [gameEmbed] });

    const collector = message.channel.createMessageCollector({ time: gameTimeout });

    gameSessions.set(channelId, {
        answer: question.jawaban,
        description: question.deskripsi,
        collector: collector
    });

    collector.on('collect', async msg => {
        if (msg.author.bot) return;

        const answer = gameSessions.get(channelId)?.answer;
        if (!answer) return;

        const userGuess = msg.content.toLowerCase().trim();

        if (userGuess === "!hemo") {
            const hint = answer.replace(/[aiueo]/gi, '_');
            return msg.reply(`**Bantuan:** \`${hint}\``);
        }

        if (userGuess === "!suren") {
            collector.stop('surrender');
            return msg.reply(`Baiklah, kamu menyerah. Jawabannya adalah **${answer}**.`);
        }

        if (userGuess === answer.toLowerCase()) {
            await msg.reply(`✅ **Benar!** Jawaban yang tepat adalah **${answer}**.\nKamu mendapatkan +${rewardPoint.toLocaleString()} Poin!`);
            collector.stop('correct');
        } else if (similarity(userGuess, answer.toLowerCase()) >= similarityThreshold) {
            msg.reply("❗ **Dikit lagi!** Jawabanmu sudah hampir benar.");
        } else {
            msg.react('❌').catch(() => {});
        }
    });

    collector.on('end', (collected, reason) => {
        const session = gameSessions.get(channelId);
        if (!session) return;

        if (reason === 'time') {
            message.channel.send(`⏰ **Waktu habis!**\nJawaban yang benar adalah **${session.answer}**.\n\n*${session.description}*`);
        }
        
        gameSessions.delete(channelId);
    });
  }
};