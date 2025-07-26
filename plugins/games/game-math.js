const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config");

// --- Tambahan untuk sistem money ---
const { db, ensureUser } = require('../../database.js'); // Pastikan handler.js ada dan sesuai

const gameSessions = new Map();
const initialAttempts = 3;
const apiUrl = `https://api.danafxc.my.id/api/math?apikey=${config.apikey_dana}`;

// --- Konfigurasi Hadiah & Denda ---
const rewardAmounts = {
    noob: 1000,
    easy: 5000,
    medium: 25000,
    hard: 75000,
    master: 150000,
    grandmaster: 300000,
    legendary: 500000,
    mythic: 750000,
    god: 1000000,
};
const penaltyAmount = 1000; // Denda jika kalah
const defaultReward = 10000;
// ---

// --- Konfigurasi Waktu Baru untuk Semua Level ---
const timeLimits = {
    noob: 30000,        // 30 detik
    easy: 45000,        // 45 detik
    medium: 60000,      // 1 menit
    hard: 90000,        // 1.5 menit
    master: 120000,     // 2 menit
    grandmaster: 150000,// 2.5 menit
    legendary: 180000,  // 3 menit
    mythic: 240000,     // 4 menit
    god: 300000,        // 5 menit
};
// Level default jika tidak ada di daftar
const defaultTime = 60000;

/**
 * Fungsi untuk mengambil seluruh data soal dari API.
 * @returns {Promise<Array|null>}
 */
async function fetchAllQuestions() {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API returned status ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("[MATH API] Gagal mengambil data:", error);
    return null;
  }
}

/**
 * [BARU] Fungsi untuk menormalkan string jawaban agar lebih fleksibel.
 * Menghapus spasi dan mengubah ke huruf kecil.
 * @param {string} str - String jawaban.
 * @returns {string}
 */
function normalizeAnswer(str) {
    return str.replace(/\s+/g, '').toLowerCase();
}

module.exports = {
  prefix: "math",
  category: "game",
  aliases: ["mtk"],

  async execute(message, args, client) {
    const channelId = message.channel.id;
    const mode = args[0]?.toLowerCase();

    if (!mode) {
        const loadingHelp = await message.reply("🔍 Mengambil daftar level yang tersedia...");
        const allQuestions = await fetchAllQuestions();
        if (!allQuestions) return loadingHelp.edit("❌ Gagal mengambil daftar level dari API.");

        const availableModes = [...new Set(allQuestions.map(q => q.level))];
        const modeOrder = ['noob', 'easy', 'medium', 'hard', 'master', 'grandmaster', 'legendary', 'mythic', 'god'];
        const sortedModes = availableModes.sort((a, b) => modeOrder.indexOf(a) - modeOrder.indexOf(b));

        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("❓ Bantuan Permainan Math")
            .setDescription("Uji kemampuan matematikamu dari level dasar hingga dewa!")
            .addFields(
                { name: "Cara Bermain", value: `Gunakan perintah \`!math <mode>\`\nContoh: \`!math god\`` },
                { name: "Mode yang Tersedia", value: `\`${sortedModes.join('`, `')}\`` }
            );
        return loadingHelp.edit({ content: null, embeds: [helpEmbed] });
    }

    // ==================== Tambahan: Cek saldo sebelum main ====================
    ensureUser(message.author.id, message.author.username);
    const userMoney = db.users[message.author.id].money || 0;
    if (userMoney < penaltyAmount) {
        return message.reply(`💰 Uangmu tidak cukup untuk bermain. Kamu butuh setidaknya **${penaltyAmount.toLocaleString('id-ID')}** Money untuk menanggung denda jika kalah.`);
    }
    // ==================== Akhir tambahan ====================

    if (gameSessions.has(channelId)) {
        return message.reply("❗ Masih ada soal matematika yang belum terjawab di channel ini.");
    }
    
    const loadingMessage = await message.reply(`🔍 Mencari soal matematika level **${mode}**...`);

    const allQuestions = await fetchAllQuestions();
    if (!allQuestions) return loadingMessage.edit("❌ Gagal mengambil soal dari API.");

    const questionsForLevel = allQuestions.filter(q => q.level.toLowerCase() === mode);
    if (questionsForLevel.length === 0) {
        return loadingMessage.edit(`❌ Maaf, tidak ditemukan soal untuk level **${mode}**. Coba level lain.`);
    }

    const question = questionsForLevel[Math.floor(Math.random() * questionsForLevel.length)];
    const time = timeLimits[question.level] || defaultTime;
    const reward = rewardAmounts[question.level] || defaultReward;

    const gameEmbed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle(`🧮 Matematika Level: ${question.level.charAt(0).toUpperCase() + question.level.slice(1)}`)
      .setDescription(`**Deskripsi:** ${question.deskripsi}`)
      .addFields({ name: 'Soal', value: `\`\`\`${question.soal}\`\`\`` })
      .addFields(
          { name: "Waktu", value: `⏳ ${(time / 1000)} detik`, inline: true },
          { name: "Hadiah", value: `💰 ${reward.toLocaleString('id-ID')}`, inline: true },
          { name: "Denda", value: `💸 ${penaltyAmount.toLocaleString('id-ID')}`, inline: true },
          { name: "Kesempatan", value: `❤️ ${initialAttempts} kali`, inline: false }
      )
      .setFooter({ text: "Ketik jawabanmu langsung di channel ini!" });

    await loadingMessage.edit({ content: "Soal ditemukan!", embeds: [gameEmbed] });

    const collector = message.channel.createMessageCollector({ time });

    gameSessions.set(channelId, {
        answer: question.jawaban,
        attempts: initialAttempts,
        collector: collector,
        level: question.level,
        reward: reward,
        penalty: penaltyAmount,
        playerId: message.author.id // Simpan id pemain
    });

    collector.on('collect', async msg => {
        if (msg.author.bot) return;
        const session = gameSessions.get(channelId);
        if (!session) return;

        const userNormalized = normalizeAnswer(msg.content);
        const correctNormalized = normalizeAnswer(session.answer);

        if (userNormalized === correctNormalized) {
            // Tambah money ke user yang benar
            db.users[msg.author.id].money = (db.users[msg.author.id].money || 0) + session.reward;
            await msg.reply(`✅ **Jenius!**\nSelamat, <@${msg.author.id}>, kamu berhasil menjawab soal level **${session.level}** dan mendapatkan +**${session.reward.toLocaleString('id-ID')}** Money!`);
            collector.stop('correct');
        } else {
            session.attempts--;
            if (session.attempts <= 0) {
                // Kurangi money user yang main (bukan yang jawab terakhir)
                db.users[session.playerId].money = Math.max(0, (db.users[session.playerId].money || 0) - session.penalty);
                msg.reply(`❌ **Kesempatan Habis!**\nJawaban yang benar adalah:\n\`\`\`\n${session.answer}\n\`\`\`\nKamu kehilangan **${session.penalty.toLocaleString('id-ID')}** Money.`);
                collector.stop('no_attempts');
            } else {
                msg.react('❌');
                msg.reply(`Jawaban salah! Masih ada **${session.attempts}** kesempatan.`).then(replyMsg => {
                    setTimeout(() => replyMsg.delete().catch(() => {}), 7000);
                });
            }
        }
    });

    collector.on('end', (collected, reason) => {
        const session = gameSessions.get(channelId);
        if (!session) return;
        if (reason === 'time') {
            // Kurangi money user yang main jika waktu habis
            db.users[session.playerId].money = Math.max(0, (db.users[session.playerId].money || 0) - session.penalty);
            message.channel.send(`⏰ **Waktu habis!**\nJawaban yang benar adalah:\n\`\`\`\n${session.answer}\n\`\`\`\nKamu kehilangan **${session.penalty.toLocaleString('id-ID')}** Money.`);
        }
        gameSessions.delete(channelId);
    });
  }
};