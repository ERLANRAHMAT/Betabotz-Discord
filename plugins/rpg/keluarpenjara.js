const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

const BAIL_COST = 50000;

module.exports = {
  prefix: "keluarpenjara",
  category: "rpg",
  aliases: ["bail", "bebas"],
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const userData = await api.getUser(authorId, authorUsername);

    if (!userData.jail?.status) {
      return message.reply("Kamu tidak sedang di penjara.");
    }
    if (args[0] === "bayar") {
      if ((userData.money || 0) < BAIL_COST) {
        return message.reply(`💸 Uangmu tidak cukup untuk membayar denda **${BAIL_COST.toLocaleString('id-ID')}** Money.`);
      }
      userData.money -= BAIL_COST;
      userData.jail = { status: false, reason: null, until: 0 };
      await api.updateUser(authorId, userData);
      return message.reply(`✅ Kamu membayar denda dan dibebaskan dari penjara!`);
    }
    const answer = Math.floor(Math.random() * 5) + 1;
    await message.reply("🎲 Tebak angka dari 1 sampai 5. Jika benar, kamu bebas! Ketik angkanya:");

    const filter = m => m.author.id === authorId && /^[1-5]$/.test(m.content.trim());
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000 }).catch(() => null);

    if (!collected || collected.size === 0) {
      return message.reply("⏰ Waktu habis! Coba lagi nanti.");
    }
    const guess = parseInt(collected.first().content.trim());
    if (guess === answer) {
      userData.jail = { status: false, reason: null, until: 0 };
      await api.updateUser(authorId, userData);
      return message.reply("🎉 Tebakanmu benar! Kamu bebas dari penjara!");
    } else {
      return message.reply(`❌ Salah! Jawabannya adalah ${answer}. Coba lagi nanti atau bayar denda dengan \`!keluarpenjara bayar\`.`);
    }
  }
};
