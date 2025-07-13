const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../../config');

const timeout = 100000;
const threshold = 0.72; // Ambang batas kemiripan untuk 'Dikit Lagi!'
const similarity = require('similarity'); // Pastikan ini terinstall: npm install similarity

const gameState = new Map(); // Menyimpan status permainan per channel

module.exports = {
  prefix: "asahotak", // Perintah utama untuk memulai game
  category: "game",
  aliases: ["ao", "brainteaser"], // Alias untuk perintah utama
  /**
   * Fungsi eksekusi untuk perintah !asahotak
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const channelId = message.channel.id;
    // Cek apakah sudah ada game aktif di channel ini
    if (gameState.has(channelId)) {
      const state = gameState.get(channelId);
      // Jika game aktif dan belum dijawab, beritahu user
      if (!state.answered) {
        return message.reply({
          content: 'Masih ada soal belum terjawab di channel ini!\nSilakan jawab soal sebelumnya atau tunggu waktu habis.',
          allowedMentions: { repliedUser: false }
        });
      } else { // Jika game aktif tapi sudah dijawab (kasus aneh, mungkin ada bug sebelumnya)
          // Bersihkan state lama dan mulai game baru
          clearTimeout(state.timeoutObj);
          gameState.delete(channelId);
          console.log(`[ASAHOTAK] Cleaned up old answered game state for channel ${channelId}.`);
      }
    }

    // Ambil soal dari API
    let json;
    try {
        const res = await fetch(`https://api.betabotz.eu.org/api/game/asahotak?apikey=${config.apikey_lann}`);
        if (!res.ok) {
            throw new Error(`API response not OK: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("API tidak mengembalikan data soal yang valid.");
        }
        json = data[Math.floor(Math.random() * data.length)]; // Ambil soal acak
    } catch (e) {
        console.error(`[ASAHOTAK] Gagal mengambil soal dari API:`, e);
        return message.reply({
            content: `❌ Gagal memuat soal asah otak: ${e.message || e}`,
            allowedMentions: { repliedUser: false }
        });
    }

    const soal = json.soal;
    const jawaban = json.jawaban;

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("🧠 Asah Otak")
      .setDescription(`**Soal:** ${soal}`) // Tambahkan label 'Soal:'
      .addFields(
        { name: "Timeout", value: `${(timeout / 1000).toFixed(0)} detik`, inline: true }, // Format tanpa desimal
        { name: "Bantuan", value: `Ketik \`${config.prefix}toka\` untuk bantuan (clue)`, inline: false }, // Gunakan prefix bot dan nama perintah utama
        { name: "Jawab", value: "Balas/reply soal ini untuk menjawab", inline: false }
      );

    const sentMsg = await message.reply({ embeds: [embed] });

    // Set timeout untuk soal
    const timeoutObj = setTimeout(async () => {
      if (gameState.has(channelId)) {
        const currentState = gameState.get(channelId);
        // Pastikan soal belum dijawab sebelum mengirim pesan waktu habis
        if (!currentState.answered) {
            await message.channel.send(`⏰ Waktu habis!\nJawabannya adalah **${jawaban}**`);
        }
        gameState.delete(channelId); // Hapus state setelah waktu habis
      }
    }, timeout);

    // Simpan status game untuk channel ini
    gameState.set(channelId, {
      soal,
      jawaban,
      timeoutObj,
      messageId: sentMsg.id, // ID pesan soal bot
      answered: false // Status apakah soal sudah dijawab
    });
    console.log(`[ASAHOTAK] Game started in channel ${channelId}. Soal: "${soal}" Jawaban: "${jawaban}"`);
  },

  subCommands: {
    toka: { 
        handler: async (message, args, client) => { // Menggunakan 'handler' untuk konsistensi
            const channelId = message.channel.id;
            if (!gameState.has(channelId)) {
                return message.reply("Tidak ada soal asah otak aktif di channel ini.");
            }
            const { jawaban } = gameState.get(channelId);
            // Clue: ganti semua konsonan dengan _
            const clue = jawaban.replace(/[bcdfghjklmnpqrstvwxyz]/gi, '_');
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xF1C40F)
                        .setTitle("💡 Bantuan Soal Asah Otak")
                        .setDescription(`\`\`\`${clue}\`\`\``)
                        .setFooter({ text: "Hanya konsonan yang diganti." })
                ],
                allowedMentions: { repliedUser: false }
            });
            console.log(`[ASAHOTAK] Clue requested in channel ${channelId}. Clue: "${clue}"`);
        },
        description: "Mendapatkan bantuan (clue) untuk soal asah otak.",
        aliases: ["clue", "hint"]
    }
  },
  // ====================================================

  // Message handler untuk memeriksa jawaban
  async handleMessage(message, client) {
    const channelId = message.channel.id;
    // Hanya proses jika ada game aktif di channel ini
    if (!gameState.has(channelId)) return;

    const state = gameState.get(channelId);
    // Abaikan jika game sudah dijawab
    if (state.answered) return;

    // Cek jika pesan adalah balasan ke pesan soal bot
    if (
      message.reference &&
      message.reference.messageId &&
      message.reference.messageId === state.messageId
    ) {
      const userAnswer = message.content.trim();
      if (!userAnswer) return; // Abaikan pesan kosong

      console.log(`[ASAHOTAK] User ${message.author.tag} in ${channelId} answered: "${userAnswer}"`);
      console.log(`[ASAHOTAK] Correct answer: "${state.jawaban}"`);
      
      // Periksa jawaban
      if (userAnswer.toLowerCase() === state.jawaban.toLowerCase().trim()) {
        clearTimeout(state.timeoutObj); // Hentikan timer
        state.answered = true; // Tandai sudah dijawab
        gameState.delete(channelId); // Hapus state game dari map
        await message.reply(`✅ **Benar!** Jawabannya adalah **${state.jawaban}**`); // Konfirmasi jawaban
        console.log(`[ASAHOTAK] Correct answer by ${message.author.tag} in ${channelId}. Game finished.`);
      } else if (similarity(userAnswer.toLowerCase(), state.jawaban.toLowerCase().trim()) >= threshold) {
        await message.reply(`*Dikit Lagi!*`);
        console.log(`[ASAHOTAK] Close answer by ${message.author.tag} in ${channelId}.`);
      } else {
        await message.reply(`*Salah!*`);
        console.log(`[ASAHOTAK] Incorrect answer by ${message.author.tag} in ${channelId}.`);
      }
    }
  }
};