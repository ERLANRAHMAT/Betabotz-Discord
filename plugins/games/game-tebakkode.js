const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config"); // Sesuaikan path jika perlu

// Map untuk menyimpan sesi permainan yang aktif, kuncinya adalah channelId
const gameSessions = new Map();
const gameTimeout = 120000; // Waktu permainan dalam milidetik (2 menit)
const rewardPoint = 10000; // Poin hadiah

/**
 * Fungsi untuk mengambil data soal dari API
 */
async function fetchQuestion() {
    try {
        const response = await fetch(`https://api.betabotz.eu.org/api/game/tebakkode?apikey=${config.apikey_lann}`);
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        // Memilih satu soal secara acak dari array
        return data[Math.floor(Math.random() * data.length)];
    } catch (error) {
        console.error("[TEBAK KODE] Gagal mengambil data dari API:", error);
        return null;
    }
}

module.exports = {
  prefix: "tebakkode",
  category: "game",
  aliases: ["kode"],

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const channelId = message.channel.id;

    if (gameSessions.has(channelId)) {
        return message.reply("❗ Masih ada sesi Tebak Kode yang sedang berlangsung di channel ini.");
    }

    const question = await fetchQuestion();
    if (!question || !question.soal) {
        return message.reply("❌ Maaf, gagal memulai permainan. Tidak bisa mengambil soal dari server saat ini.");
    }

    // Format pilihan ganda dari array menjadi string
    const options = question.pilihan.map((opt, i) => `**${String.fromCharCode(65 + i)}.** ${opt}`).join('\n');

    // Buat dan kirim pesan utama permainan
    const gameEmbed = new EmbedBuilder()
      .setColor(0x2ECC71) // Warna hijau
      .setTitle("💻 Tebak Kode")
      .setDescription(`Bahasa Pemrograman: **${question.bahasa}**\n\n**Soal:**\n\`\`\`${question.bahasa.toLowerCase()}\n${question.soal}\n\`\`\``)
      .addFields({ name: "Pilih Jawaban yang Benar:", value: options })
      .addFields(
          { name: "Waktu", value: `⏳ ${gameTimeout / 1000} detik`, inline: true },
          { name: "Hadiah", value: `💰 ${rewardPoint.toLocaleString()}`, inline: true }
      )
      .setFooter({ text: "Jawab dengan huruf (A, B, C, D), !kdo untuk bantuan, atau !suren untuk menyerah." });

    await message.channel.send({ embeds: [gameEmbed] });

    // Buat message collector untuk menangkap jawaban
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

        // Perintah bantuan dan menyerah
        if (userGuess === "!kdo") {
            const hint = session.question.jawaban.replace(/[bcdfghjklmnpqrstvwxyz123456789]/gi, '_');
            return msg.reply(`**Bantuan:** \`${hint}\``);
        }

        if (userGuess === "!suren") {
            return collector.stop('surrender');
        }

        // Cek jawaban pilihan ganda (hanya A, B, C, atau D)
        if (/^[a-d]$/.test(userGuess)) {
            const answerIndex = userGuess.charCodeAt(0) - 'a'.charCodeAt(0); // 'a' -> 0, 'b' -> 1, dst.
            const chosenOption = session.question.pilihan[answerIndex];

            if (chosenOption.toLowerCase() === session.question.jawaban.toLowerCase()) {
                await msg.reply(`✅ **Tepat!** Jawabanmu benar, <@${msg.author.id}>!\n+${rewardPoint.toLocaleString()} Poin untukmu!\n\n**Penjelasan:**\n${session.question.deskripsi}`);
                collector.stop('correct');
            } else {
                msg.react('❌').catch(() => {});
            }
        }
    });

    collector.on('end', (collected, reason) => {
        const session = gameSessions.get(channelId);
        if (!session) return;

        if (reason === 'surrender') {
             message.channel.send(`Kamu menyerah. Jawaban yang benar adalah **${session.question.jawaban}**.`);
        }
        else if (reason === 'time') {
            message.channel.send(`⏰ **Waktu habis!**\nJawaban yang benar adalah **${session.question.jawaban}**.`);
        }
        
        gameSessions.delete(channelId);
    });
  }
};