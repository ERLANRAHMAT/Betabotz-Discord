const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../../config');

const timeout = 100000;
const threshold = 0.72;
const similarity = require('similarity');

const gameState = new Map(); 

module.exports = {
  prefix: "asahotak",
  category: "game",
  aliases: [],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const channelId = message.channel.id;
    if (gameState.has(channelId)) {
      const state = gameState.get(channelId);
      return message.reply({
        content: 'Masih ada soal belum terjawab di channel ini!',
        allowedMentions: { repliedUser: false }
      });
    }
    const src = await fetch(`https://api.betabotz.eu.org/api/game/asahotak?apikey=${config.apikey_lann}`).then(res => res.json());
    const json = src[Math.floor(Math.random() * src.length)];
    const soal = json.soal;
    const jawaban = json.jawaban;

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("🧠 Asah Otak")
      .setDescription(soal)
      .addFields(
        { name: "Timeout", value: `${(timeout / 1000).toFixed(2)} detik`, inline: true },
        { name: "Bantuan", value: `Ketik \`!toka\` untuk bantuan (clue)`, inline: false },
        { name: "Jawab", value: "Balas/reply soal ini untuk menjawab", inline: false }
      );

    const sentMsg = await message.reply({ embeds: [embed] });

    const timeoutObj = setTimeout(() => {
      if (gameState.has(channelId)) {
        message.channel.send(`⏰ Waktu habis!\nJawabannya adalah **${jawaban}**`);
        gameState.delete(channelId);
      }
    }, timeout);

    gameState.set(channelId, {
      soal,
      jawaban,
      timeoutObj,
      messageId: sentMsg.id,
      answered: false
    });
  },
  commands: {
    toka: async (message, args, client) => {
      const channelId = message.channel.id;
      if (!gameState.has(channelId)) {
        return message.reply("Tidak ada soal asah otak aktif di channel ini.");
      }
      const { jawaban } = gameState.get(channelId);
      // Clue: replace all consonants with _
      const clue = jawaban.replace(/[bcdfghjklmnpqrstvwxyz]/gi, '_');
      await message.reply('```' + clue + '```');
    }
  },
  // Message handler untuk jawaban
  async handleMessage(message, client) {
    // Cek jika reply ke soal asah otak
    const channelId = message.channel.id;
    if (!gameState.has(channelId)) return;
    const state = gameState.get(channelId);
    if (state.answered) return;
    // Cek jika reply ke pesan soal
    if (
      message.reference &&
      message.reference.messageId &&
      message.reference.messageId === state.messageId
    ) {
      const userAnswer = message.content.trim();
      if (!userAnswer) return;
      if (userAnswer.toLowerCase() === state.jawaban.toLowerCase().trim()) {
        clearTimeout(state.timeoutObj);
        state.answered = true;
        gameState.delete(channelId);
        await message.reply(`✅ **Benar!**`);
      } else if (similarity(userAnswer.toLowerCase(), state.jawaban.toLowerCase().trim()) >= threshold) {
        await message.reply(`*Dikit Lagi!*`);
      } else {
        await message.reply(`*Salah!*`);
      }
    }
  }
};
