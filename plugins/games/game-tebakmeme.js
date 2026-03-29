const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const similarity = require('similarity');
const config = require("../../config.js");
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
        const response = await fetch(`https://api.danafxc.my.id/api/proxy/games?q=tebakMeme&apikey=${config.apikey_dana}`);
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("[TEBAK MEME] Gagal mengambil data dari API:", error);
        return null;
    }
}

module.exports = {
  prefix: "tebakmeme",
  category: "game",
  aliases: ["tebakmeme"],

  async execute(message, args, client) {
    const channelId = message.channel.id;
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    try {
      // 1. GET: Ambil data user untuk cek uang
      const authorData = await api.getUser(authorId, authorUsername);
      if (authorData.money < penaltyAmount) {
        return message.reply(
          `💰 Uangmu tidak cukup untuk bermain. Kamu butuh setidaknya **${penaltyAmount.toLocaleString("id-ID")}** Money.`,
        );
      }

      if (gameSessions.has(channelId)) {
        return message.reply(
          "❗ Masih ada sesi Tebak Meme yang sedang berlangsung di channel ini.",
        );
      }

      const question = await fetchQuestion();
      if (
        !question ||
        !question.imgFilter ||
        !question.Hint ||
        !question.Jawaban
      ) {
        return message.reply(
          "❌ Maaf, gagal memulai permainan. Tidak bisa mengambil soal dari server saat ini.",
        );
      }

      const gameEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("🖼️ Tebak Meme!")
        .setImage(question.imgFilter)
        .addFields(
          {
            name: "Waktu",
            value: `⏳ ${gameTimeout / 1000} detik`,
            inline: true,
          },
          {
            name: "Hadiah",
            value: `💰 ${rewardPoint.toLocaleString("id-ID")}`,
            inline: true,
          },
          { name: "Hint", value: `🔎 ${question.Hint}` },
        )
        .setFooter({
          text: "Ketik jawabanmu langsung di chat, atau !suren untuk menyerah.",
        });

      const soalMsg = await message.channel.send({ embeds: [gameEmbed] });

      const collector = message.channel.createMessageCollector({
        time: gameTimeout,
      });
      gameSessions.set(channelId, {
        answer: question.Jawaban,
        collector: collector,
        soalMsgId: soalMsg.id,
        img: question.Img,
      });

      collector.on("collect", async (msg) => {
        if (msg.author.bot) return;

        const session = gameSessions.get(channelId);
        if (!session) return;

        const userGuess = msg.content.toLowerCase().trim();
        const winnerId = msg.author.id;
        const winnerUsername = msg.author.username;

        if (userGuess === "!suren") {
          return collector.stop("surrender");
        }

        if (userGuess === session.answer.toLowerCase()) {
          // Pola GET -> MODIFY -> POST untuk pemenang
          const winnerData = await api.getUser(winnerId, winnerUsername);
          winnerData.money += rewardPoint;
          await api.updateUser(winnerId, winnerData);

          // Tampilkan gambar asli meme
          const winEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("Benar!")
            .setDescription(
              `✅ **Benar!** Jawabannya adalah **${session.answer}**.\nSelamat <@${winnerId}> dapat +**${rewardPoint.toLocaleString("id-ID")}** Money!`,
            )
            .setImage(session.img);
          await msg.reply({ embeds: [winEmbed] });

          // Hapus pesan soal
          try {
            await soalMsg.delete();
          } catch {}
          collector.stop("correct");
        } else if (
          similarity(userGuess.toLowerCase(), session.answer.toLowerCase()) >=
          similarityThreshold
        ) {
          msg.reply("❗ **Hampir benar!** Coba periksa lagi ejaannya.");
        } else {
          msg.react("❌").catch(() => {});
        }
      });

      collector.on("end", async (collected, reason) => {
        const session = gameSessions.get(channelId);
        if (!session) return;

        if (reason === "surrender" || reason === "time") {
          // Pola GET -> MODIFY -> POST untuk yang kalah
          const authorDataOnEnd = await api.getUser(authorId, authorUsername);
          authorDataOnEnd.money = Math.max(
            0,
            authorDataOnEnd.money - penaltyAmount,
          );
          await api.updateUser(authorId, authorDataOnEnd);

          // Tampilkan gambar asli meme
          const loseEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(reason === "time" ? "⏰ Waktu Habis!" : "Menyerah...")
            .setDescription(
              `Jawaban yang benar adalah **${session.answer}**.\nKamu kehilangan **${penaltyAmount.toLocaleString("id-ID")}** Money.`,
            )
            .setImage(session.img);
          await message.channel.send({ embeds: [loseEmbed] });

          // Hapus pesan soal
          try {
            await soalMsg.delete();
          } catch {}
        }
        gameSessions.delete(channelId);
      });
    } catch (error) {
      console.error("[TEBAKMEME CMD ERROR]", error);
      message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};