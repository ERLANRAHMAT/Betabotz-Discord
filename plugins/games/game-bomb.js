const { EmbedBuilder } = require('discord.js');

const timeout = 180000; // 3 menit
const bombState = new Map(); // Kunci: channelId

// --- Fungsi Helper ---
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(number) {
  return number.toLocaleString();
}

function renderBoard(array) {
  let teks = '';
  for (let i = 0; i < array.length; i += 3) {
    // Menambahkan spasi antar emoji agar lebih rapi
    teks += array.slice(i, i + 3).map(v => v.state ? v.emot : v.number).join(' ') + '\n';
  }
  return teks;
}
// --- Akhir Fungsi Helper ---

module.exports = {
  prefix: "bomb",
  category: "game",
  aliases: ["bom"],
  
  /**
   * Fungsi untuk MEMULAI permainan di sebuah channel.
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const channelId = message.channel.id;

    if (bombState.has(channelId)) {
      return message.reply('❗ Sudah ada sesi game Bomb yang sedang berjalan di channel ini.');
    }

    const bom = ['💥', '✅', '✅', '✅', '✅', '✅', '✅', '✅', '✅'].sort(() => Math.random() - 0.5);
    const number = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    const array = bom.map((v, i) => ({
      emot: v,
      number: number[i],
      position: i + 1,
      state: false
    }));

    const reward = randomInt(1000, 5000);

    let teks = `💣 **PERMAINAN BOM DIMULAI** 💣\n\nSiapa saja di channel ini bisa ikut bermain!\nKirim angka **1** - **9** untuk membuka kotak:\n\n`;
    teks += "```\n" + renderBoard(array) + "```";
    teks += `\n**Waktu:** ${(timeout / 1000 / 60).toFixed(1)} Menit\nBuka semua kotak aman untuk menang! Ketik \`suren\` untuk menyerah.`;

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setDescription(teks)
      .setFooter({ text: `Dimulai oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

    const sentMsg = await message.reply({ embeds: [embed] });

    const timeoutObj = setTimeout(() => {
      if (bombState.has(channelId)) {
        const state = bombState.get(channelId);
        const bombBox = state.array.find(v => v.emot === '💥');
        message.reply(`⏰ **Waktu Habis!** Permainan berakhir. Bom berada di kotak nomor ${bombBox.number}.`);
        bombState.delete(channelId);
      }
    }, timeout);

    bombState.set(channelId, { array, timeoutObj, messageId: sentMsg.id, opened: 0, reward, initiator: message.author.id });
  },

  /**
   * Fungsi untuk MENANGANI JAWABAN dari semua pengguna di channel.
   * @param {import('discord.js').Message} message
   */
  async handleMessage(message, client) {
    if (message.author.bot) return;

    const channelId = message.channel.id;
    if (!bombState.has(channelId)) return;
    
    const state = bombState.get(channelId);
    const body = message.content.trim().toLowerCase();

    if (body === 'suren') {
      clearTimeout(state.timeoutObj);
      bombState.delete(channelId);
      return message.reply(`🚩 **${message.author.username}** telah menyerah. Permainan bomb dihentikan.`);
    }

    if (/^[1-9]$/.test(body)) {
      const pos = parseInt(body);
      const box = state.array.find(v => v.position === pos);

      if (!box) return;
      if (box.state) {
        message.reply(`🚩 Kotak ${box.number} sudah dibuka, pilih kotak lain.`).then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
        return;
      }

      box.state = true;
      state.opened++;

      // Hapus pesan angka dari pemain untuk menjaga kebersihan chat
      if (message.deletable) {
        message.delete().catch(() => {});
      }

      if (box.emot === '💥') { // Kena BOM
        clearTimeout(state.timeoutObj);
        
        let teks = `**BOOM!** 💥\n\n<@${message.author.id}> membuka kotak bom!\n\n`;
        teks += "```\n" + renderBoard(state.array) + "```";
        teks += `\nSayang sekali! Permainan berakhir. Poin hadiah hangus.`;

        const embed = new EmbedBuilder().setColor(0xE74C3C).setDescription(teks);
        message.channel.send({ embeds: [embed] });
        bombState.delete(channelId);
      } else if (state.opened >= 8) { // MENANG
        clearTimeout(state.timeoutObj);

        let teks = `**SELAMAT!** 🎉\n\n<@${message.author.id}> membuka kotak aman terakhir!\n\n`;
        teks += "```\n" + renderBoard(state.array) + "```";
        teks += `\nSemua kotak aman berhasil dibuka! Kalian memenangkan **${formatNumber(state.reward)}** poin!`;

        const embed = new EmbedBuilder().setColor(0x2ECC71).setDescription(teks);
        message.channel.send({ embeds: [embed] });
        bombState.delete(channelId);
      } else {
        // ==================== PERUBAHAN DI SINI ====================
        // Jika AMAN dan permainan berlanjut, kirim update papan permainan.
        let teks = `<@${message.author.id}> membuka kotak ${box.number}, ternyata aman! ✅\n\n`;
        teks += "```\n" + renderBoard(state.array) + "```";
        teks += `\nSilakan pilih kotak selanjutnya.`;
        
        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setDescription(teks);
        
        message.channel.send({ embeds: [embed] });
        // ==================== AKHIR PERUBAHAN ====================
      }
    }
  }
};