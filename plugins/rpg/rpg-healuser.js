const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

module.exports = {
  prefix: "healuser",
  category: "rpg",
  aliases: ["healuser"],
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const targetUser = message.mentions.users.first();

    if (!targetUser) return message.reply('Tag user yang ingin kamu sembuhkan! Contoh: `!heal @user`');
    if (targetUser.id === authorId) return message.reply('Kamu tidak bisa menyembuhkan diri sendiri.');

    const userData = await api.getUser(authorId, authorUsername);
    if (userData.job?.toLowerCase().replace(/ /g,'') !== 'dokter') {
      return message.reply('Kamu harus bekerja sebagai Dokter untuk menggunakan perintah ini.');
    }

    const targetData = await api.getUser(targetUser.id, targetUser.username);
    if (targetData.jail?.status && Date.now() < (targetData.jail.until || 0)) {
      targetData.jail = { status: false, reason: null, until: 0 };
      await api.updateUser(targetUser.id, targetData);
      return message.reply(`🧑‍⚕️ Kamu telah menyembuhkan dan membebaskan ${targetUser.username} dari penjara!`);
    } else {
      return message.reply(`${targetUser.username} tidak sedang di penjara.`);
    }
  }
};
