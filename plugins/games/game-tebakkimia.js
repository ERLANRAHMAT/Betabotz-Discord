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
        const response = await fetch(`https://api.betabotz.eu.org/api/game/tebakkimia?apikey=${config.apikey_lann}`);
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        // Memilih satu soal secara acak dari array
        return data[Math.floor(Math.random() * data.length)];
    } catch (error) {
        console.error("[TEBAK KIMIA] Gagal mengambil data dari API:", error);
        return null;
    }
}

module.exports = {
  prefix: "tebakkimia",
  category: "game",
  aliases: ["kimia"],

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const channelId = message.channel.id;

    if (gameSessions.has(channelId)) {
        return message.reply("❗ Masih ada sesi Tebak Kimia yang sedang berlangsung di channel ini.");
    }

    const question = await fetchQuestion();
    if (!question || !question.nama) {
        return message.reply("❌ Maaf, gagal memulai permainan. Tidak bisa mengambil soal dari server saat ini.");
    }

    // Buat dan kirim pesan utama permainan
    const gameEmbed = new EmbedBuilder()
      .setColor(0x3498DB) // Warna Biru
      .setTitle("🧪 Tebak Rumus Kimia")
      .setDescription(`Apa rumus kimia (lambang) dari **${question.nama}**?`)
      .addFields(
          { name: "Waktu", value: `⏳ ${gameTimeout / 1000} detik`, inline: true },
          { name: "Hadiah", value: `💰 ${rewardPoint.toLocaleString()}`, inline: true }
      )
      .setFooter({ text: "Ketik jawabanmu, !kmi untuk bantuan, atau !suren untuk menyerah." });

    await message.channel.send({ embeds: [gameEmbed] });

    // Buat message collector untuk menangkap jawaban
    const collector = message.channel.createMessageCollector({ time: gameTimeout });

    // Simpan sesi game
    gameSessions.set(channelId, {
        answer: question.lambang,
        collector: collector
    });

    // Event handler untuk setiap pesan yang terkumpul
    collector.on('collect', async msg => {
        if (msg.author.bot) return;

        const session = gameSessions.get(channelId);
        if (!session) return; 

        const userGuess = msg.content.trim();

        // Cek untuk perintah bantuan atau menyerah
        if (userGuess.toLowerCase() === "!kmi") {
            const hint = session.answer.replace(/[BCDFGHJKLMNPQRSTVWXYZ]/gi, '_');
            return msg.reply(`**Bantuan:** \`${hint}\``);
        }

        if (userGuess.toLowerCase() === "!suren") {
            return collector.stop('surrender');
        }

        // Cek jawaban
        // Skrip asli menggunakan toLowerCase(), jadi kita pertahankan agar perilaku game sama.
        // Walaupun dalam kimia, huruf besar/kecil sangat berpengaruh (CO vs Co).
        if (userGuess.toLowerCase() === session.answer.toLowerCase()) {
            await msg.reply(`✅ **Tepat Sekali!** Jawaban yang benar adalah **${session.answer}**.\nKamu seorang ilmuwan! +${rewardPoint.toLocaleString()} Poin untukmu!`);
            collector.stop('correct');
        } else if (similarity(userGuess.toLowerCase(), session.answer.toLowerCase()) >= similarityThreshold) {
            msg.reply("❗ **Hampir benar!** Periksa kembali jawabanmu.");
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
            message.channel.send(`⏰ **Waktu habis!**\nJawaban yang benar untuk *${question.nama}* adalah **${session.answer}**.`);
        }
        
        gameSessions.delete(channelId);
    });
  }
};