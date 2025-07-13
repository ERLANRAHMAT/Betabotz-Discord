const { EmbedBuilder } = require('discord.js');

// Map untuk menyimpan sesi permainan, kunci: channelId
const gameSessions = new Map();

// --- Konfigurasi Mode Permainan ---
const modes = {
  noob: [-3, 3, -3, 3, '+-', 15000, 100],
  easy: [-10, 10, -10, 10, '*/+-', 20000, 750],
  medium: [-40, 40, -20, 20, '*/+-', 40000, 1500],
  hard: [-100, 100, -70, 70, '*/+-', 60000, 3000],
  extreme: [-9999, 9999, -9999, 9999, '*/', 80000, 10000],
  impossible: [-99999, 99999, -99999, 99999, '*/', 100000, 35000],
};

const operators = {
  '+': '+',
  '-': '-',
  '*': '×',
  '/': '÷'
};
// --- Akhir Konfigurasi ---


// --- Fungsi Helper ---
function randomInt(from, to) {
  if (from > to) [from, to] = [to, from];
  return Math.floor(Math.random() * (to - from + 1) + from);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Fungsi untuk menghasilkan soal matematika berdasarkan mode
 */
function genMath(mode) {
  let [a1, a2, b1, b2, ops, time, bonus] = modes[mode];
  let a = randomInt(a1, a2);
  let b = randomInt(b1, b2);
  let op = pickRandom([...ops]);
  // Menggunakan eval untuk kalkulasi, pastikan inputnya aman (hanya angka dan operator)
  let result = eval(`${a} ${op.replace('/', '/')} ${b}`);
  
  // Bulatkan hasil pembagian menjadi 2 angka desimal jika perlu
  if (op === '/' && result % 1 !== 0) {
      result = parseFloat(result.toFixed(2));
  }

  return {
    str: `${a} ${operators[op]} ${b}`,
    mode,
    time,
    bonus,
    result
  };
}
// --- Akhir Fungsi Helper ---


module.exports = {
  prefix: "math",
  category: "game",
  aliases: ["mtk"],

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const channelId = message.channel.id;
    const mode = args[0]?.toLowerCase();

    // Jika mode tidak valid atau tidak ada, kirim pesan bantuan
    if (!mode || !(mode in modes)) {
        const availableModes = Object.keys(modes).join(', ');
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("❓ Bantuan Permainan Math")
            .setDescription("Uji kecepatan berhitungmu!")
            .addFields(
                { name: "Cara Bermain", value: `Gunakan perintah \`!math <mode>\`\nContoh: \`!math medium\`` },
                { name: "Mode yang Tersedia", value: `\`${availableModes}\`` }
            );
        return message.reply({ embeds: [helpEmbed] });
    }

    if (gameSessions.has(channelId)) {
        return message.reply("❗ Masih ada soal matematika yang belum terjawab di channel ini.");
    }

    // Buat soal baru
    const math = genMath(mode);
    const initialAttempts = 4; // Jumlah kesempatan awal

    // Buat dan kirim soal
    const gameEmbed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle(`Matematika Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`)
      .setDescription(`Berapa hasil dari **${math.str}**?`)
      .addFields(
          { name: "Waktu", value: `⏳ ${(math.time / 1000).toFixed(0)} detik`, inline: true },
          { name: "Hadiah", value: `💰 ${math.bonus.toLocaleString()}`, inline: true },
          { name: "Kesempatan", value: `❤️ ${initialAttempts} kali`, inline: true }
      )
      .setFooter({ text: "Ketik jawabanmu langsung di channel ini!" });

    await message.channel.send({ embeds: [gameEmbed] });

    // Buat collector
    const collector = message.channel.createMessageCollector({ time: math.time });

    gameSessions.set(channelId, {
        result: math.result,
        bonus: math.bonus,
        attempts: initialAttempts,
        collector: collector
    });

    collector.on('collect', async msg => {
        if (msg.author.bot) return;

        const session = gameSessions.get(channelId);
        if (!session) return;

        // Cek jika jawaban adalah angka (termasuk desimal dan negatif)
        if (!/^-?[\d.]+$/.test(msg.content)) return;

        const userAnswer = parseFloat(msg.content);

        if (userAnswer === session.result) {
            await msg.reply(`✅ **Jawaban Benar!**\nSelamat, <@${msg.author.id}>! Kamu mendapatkan +${session.bonus.toLocaleString()} Poin!`);
            collector.stop('correct');
        } else {
            session.attempts--;
            if (session.attempts <= 0) {
                msg.reply(`❌ **Jawaban Salah!**\nKesempatan habis! Jawaban yang benar adalah **${session.result}**.`);
                collector.stop('no_attempts');
            } else {
                msg.reply(`❌ **Jawaban Salah!**\nMasih ada **${session.attempts}** kesempatan.`).then(replyMsg => {
                    setTimeout(() => replyMsg.delete().catch(() => {}), 5000); // Hapus pesan setelah 5 detik
                });
            }
        }
    });

    collector.on('end', (collected, reason) => {
        const session = gameSessions.get(channelId);
        if (!session) return;

        if (reason === 'time') {
            message.channel.send(`⏰ **Waktu habis!**\nJawaban yang benar adalah **${session.result}**.`);
        }
        
        gameSessions.delete(channelId);
    });
  }
};