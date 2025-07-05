const { EmbedBuilder } = require('discord.js');

const timeout = 180000;
const bombState = new Map();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(number) {
  return number.toLocaleString();
}

function renderBoard(array) {
  let teks = '';
  for (let i = 0; i < array.length; i += 3) {
    teks += array.slice(i, i + 3).map(v => v.state ? v.emot : v.number).join('') + '\n';
  }
  return teks;
}

module.exports = {
  prefix: "bomb",
  category: "game",
  aliases: [],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const userId = message.author.id;
    if (bombState.has(userId) && !bombState.get(userId).finished) {
      return message.reply('Sesi bomb kamu belum selesai!');
    }

    const bom = ['💥', '✅', '✅', '✅', '✅', '✅', '✅', '✅', '✅'].sort(() => Math.random() - 0.5);
    const number = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    const array = bom.map((v, i) => ({
      emot: v,
      number: number[i],
      position: i + 1,
      state: false
    }));

    const reward = randomInt(100, 800);

    let teks = `乂  *B O M B*\n\nKirim angka **1** - **9** untuk membuka 9 kotak nomor di bawah ini:\n\n`;
    teks += renderBoard(array);
    teks += `\nTimeout: [ ${(timeout / 1000 / 60).toFixed(1)} menit ]\nApabila mendapat kotak yang berisi bom maka point akan dikurangi. Ketik \`suren\` untuk menyerah.`;

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("💣 BOMB GAME")
      .setDescription(teks)
      .setThumbnail("https://telegra.ph/file/b3138928493e78b55526f.jpg");

    const sentMsg = await message.reply({ embeds: [embed] });

    const timeoutObj = setTimeout(() => {
      if (bombState.has(userId) && !bombState.get(userId).finished) {
        const arr = bombState.get(userId).array;
        const v = arr.find(v => v.emot === '💥');
        message.reply(`⏰ Waktu habis! Bom berada di kotak nomor ${v.number}.`);
        bombState.delete(userId);
      }
    }, timeout);

    bombState.set(userId, {
      array,
      timeoutObj,
      messageId: sentMsg.id,
      opened: 0,
      finished: false,
      reward
    });
  },

  async handleMessage(message, client) {
    const userId = message.author.id;
    if (!bombState.has(userId) || bombState.get(userId).finished) return;
    const state = bombState.get(userId);
    const body = message.content.trim();

    // Surrender
    if (/^(suren)$/i.test(body)) {
      clearTimeout(state.timeoutObj);
      bombState.delete(userId);
      return message.reply("🚩 Menyerah. Permainan bomb dihentikan.");
    }

    if (/^[1-9]$/.test(body)) {
      const pos = parseInt(body);
      const json = state.array.find(v => v.position === pos);
      if (!json) return message.reply("🚩 Untuk membuka kotak kirim angka 1 - 9");
      if (json.state) return message.reply(`🚩 Kotak ${json.number} sudah dibuka, silakan pilih kotak lain.`);

      json.state = true;
      state.opened += 1;

      if (json.emot === '💥') {
        let teks = `乂  *B O M B*\n\n${renderBoard(state.array)}\nTimeout: [ ${(timeout / 1000 / 60).toFixed(1)} menit ]\n*Permainan selesai!* kotak berisi bom terbuka : (- *${formatNumber(state.reward)}*)`;
        state.finished = true;
        clearTimeout(state.timeoutObj);
        bombState.delete(userId);
        return message.reply(teks);
      }

      if (state.opened >= 8) {
        let teks = `乂  *B O M B*\n\n${renderBoard(state.array)}\nTimeout: [ ${(timeout / 1000 / 60).toFixed(1)} menit ]\n*Permainan selesai!* kotak berisi bom tidak terbuka : (+ *${formatNumber(state.reward)}*)`;
        state.finished = true;
        clearTimeout(state.timeoutObj);
        bombState.delete(userId);
        return message.reply(teks);
      }

      let teks = `乂  *B O M B*\n\nKirim angka **1** - **9** untuk membuka 9 kotak nomor di bawah ini:\n\n`;
      teks += renderBoard(state.array);
      teks += `\nTimeout: [ ${(timeout / 1000 / 60).toFixed(1)} menit ]\nKotak berisi bom tidak terbuka : (+ *${formatNumber(state.reward)}*)`;
      return message.reply(teks);
    }
  }
};
