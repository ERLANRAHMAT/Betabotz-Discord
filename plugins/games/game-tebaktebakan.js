const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const similarity = require('similarity');
const config = require("../../config"); // Sesuaikan path jika perlu

// Map untuk menyimpan sesi permainan yang aktif, kuncinya adalah channelId
const gameSessions = new Map();
const gameTimeout = 120000; // Waktu permainan dalam milidetik (2 menit)
const rewardPoint = 10000; // Poin hadiah
const similarityThreshold = 0.72; // Tingkat kemiripan jawaban (72%)

/**
 * Fungsi untuk mengambil data soal dari API
 */
async function fetchQuestion() {
    try {
        const response = await fetch(`https://api.betabotz.eu.org/api/game/tebaktebakan?apikey=${config.apikey_lann}`);
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        // Memilih satu soal secara acak dari array
        return data[Math.floor(Math.random() * data.length)];
    } catch (error) {
        console.error("[TEBAK TEBAKAN] Gagal mengambil data dari API:", error);
        return null;
    }
}

module.exports = {
  prefix: "tebaktebakan",
  category: "game",
  aliases: ["tebakan"],

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const channelId = message.channel.id;

    // Cek apakah sudah ada game yang berjalan di channel ini
    if (gameSessions.has(channelId)) {
        return message.reply("❗ Masih ada sesi tebak-tebakan yang sedang berlangsung di channel ini.");
    }

    // Ambil soal dari API
    const question = await fetchQuestion();
    if (!question || !question.soal) {
        return message.reply("❌ Maaf, gagal memulai permainan. Tidak bisa mengambil soal dari server saat ini.");
    }

    // Buat dan kirim pesan utama permainan
    const gameEmbed = new EmbedBuilder()
      .setColor(0x9B59B6) // Warna Ungu
      .setTitle("🤔 Ayo Main Tebak-Tebakan!")
      .setDescription(`**Soal:**\n> ${question.soal}`)
      .addFields(
          { name: "Waktu", value: `⏳ ${gameTimeout / 1000} detik`, inline: true },
          { name: "Hadiah", value: `💰 ${rewardPoint.toLocaleString()}`, inline: true }
      )
      .setFooter({ text: "Ketik jawabanmu, !tika untuk bantuan, atau !suren untuk menyerah." });

    await message.channel.send({ embeds: [gameEmbed] });

    // Buat message collector untuk menangkap jawaban
    const collector = message.channel.createMessageCollector({ time: gameTimeout });

    // Simpan sesi game
    gameSessions.set(channelId, {
        answer: question.jawaban,
        collector: collector
    });

    // Event handler untuk setiap pesan yang terkumpul
    collector.on('collect', async msg => {
        if (msg.author.bot) return;

        const session = gameSessions.get(channelId);
        if (!session) return; 

        const userGuess = msg.content.toLowerCase().trim();

        // Cek untuk perintah bantuan atau menyerah
        if (userGuess === "!tika") {
            // Logika petunjuk sama seperti di skrip WA
            const hint = session.answer.replace(/[BCDFGHJKLMNPQRSTVWXYZ]/gi, '_');
            return msg.reply(`**Bantuan:** \`${hint}\``);
        }

        if (userGuess === "!suren") {
            return collector.stop('surrender');
        }

        // Cek jawaban
        if (userGuess === session.answer.toLowerCase()) {
            await msg.reply(`✅ **Cerdas!** Jawabannya adalah **${session.answer}**.\nKamu hebat! +${rewardPoint.toLocaleString()} Poin untukmu!`);
            collector.stop('correct');
        } else if (similarity(userGuess, session.answer.toLowerCase()) >= similarityThreshold) {
            msg.reply("❗ **Hampir benar!** Jawabanmu sudah sangat dekat.");
        } else {
            msg.react('❌').catch(() => {});
        }
    });

    // Event handler saat collector berakhir
    collector.on('end', (collected, reason) => {
        const session = gameSessions.get(channelId);
        if (!session) return;

        if (reason === 'surrender') {
             message.channel.send(`Kamu menyerah... Jawaban yang benar adalah **${session.answer}**.`);
        }
        else if (reason === 'time') {
            message.channel.send(`⏰ **Waktu habis!**\nJawaban yang benar adalah **${session.answer}**.`);
        }
        
        gameSessions.delete(channelId);
    });
  }
};