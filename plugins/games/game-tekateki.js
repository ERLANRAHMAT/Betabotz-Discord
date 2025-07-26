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
        const response = await fetch(`https://api.betabotz.eu.org/api/game/tekateki?apikey=${config.apikey_lann}`);
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        // Memilih satu soal secara acak dari array
        return data[Math.floor(Math.random() * data.length)];
    } catch (error) {
        console.error("[TEKA TEKI] Gagal mengambil data dari API:", error);
        return null;
    }
}

module.exports = {
  prefix: "tekateki",
  category: "game",
  aliases: ["riddle"],

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const channelId = message.channel.id;

    if (gameSessions.has(channelId)) {
        return message.reply("❗ Masih ada sesi teka-teki yang sedang berlangsung di channel ini.");
    }

    const questionData = await fetchQuestion();
    // Perhatikan struktur API ini menggunakan properti 'data' di dalamnya
    if (!questionData || !questionData.data?.pertanyaan) {
        return message.reply("❌ Maaf, gagal memulai permainan. Tidak bisa mengambil soal dari server saat ini.");
    }

    const { pertanyaan, jawaban } = questionData.data;

    const gameEmbed = new EmbedBuilder()
      .setColor(0x3498DB) // Warna Biru
      .setTitle("🧩 Teka-Teki Seru")
      .setDescription(`**Pikirkan baik-baik:**\n> ${pertanyaan}`)
      .addFields(
          { name: "Waktu", value: `⏳ ${gameTimeout / 1000} detik`, inline: true },
          { name: "Hadiah", value: `💰 ${rewardPoint.toLocaleString()}`, inline: true }
      )
      .setFooter({ text: "Ketik jawabanmu, !tete untuk bantuan, atau !suren untuk menyerah." });

    await message.channel.send({ embeds: [gameEmbed] });

    const collector = message.channel.createMessageCollector({ time: gameTimeout });

    gameSessions.set(channelId, {
        answer: jawaban,
        collector: collector
    });

    collector.on('collect', async msg => {
        if (msg.author.bot) return;

        const session = gameSessions.get(channelId);
        if (!session) return; 

        const userGuess = msg.content.toLowerCase().trim();

        if (userGuess === "!tete") {
            // Hint mengganti semua huruf vokal dengan '_'
            const hint = session.answer.replace(/[aiueo]/gi, '_');
            return msg.reply(`**Bantuan:** \`${hint}\``);
        }

        if (userGuess === "!suren") {
            return collector.stop('surrender');
        }

        if (userGuess === session.answer.toLowerCase()) {
            await msg.reply(`✅ **Brilian!** Jawabanmu benar sekali: **${session.answer}**.\nKamu hebat! +${rewardPoint.toLocaleString()} Poin untukmu!`);
            collector.stop('correct');
        } else if (similarity(userGuess, session.answer.toLowerCase()) >= similarityThreshold) {
            msg.reply("❗ **Sedikit lagi!** Jawabanmu sudah sangat mendekati.");
        } else {
            msg.react('❌').catch(() => {});
        }
    });

    collector.on('end', (collected, reason) => {
        const session = gameSessions.get(channelId);
        if (!session) return;

        if (reason === 'surrender') {
             message.channel.send(`Kamu menyerah, ya... Jawaban yang benar adalah **${session.answer}**.`);
        }
        else if (reason === 'time') {
            message.channel.send(`⏰ **Waktu habis!**\nJawaban yang benar untuk teka-teki ini adalah **${session.answer}**.`);
        }
        
        gameSessions.delete(channelId);
    });
  }
};