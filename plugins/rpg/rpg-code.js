const api = require('../../api_handler.js');

module.exports = {
  prefix: "code",
  category: "rpg",
  aliases: [],
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const userData = await api.getUser(authorId, authorUsername);

    if (userData.job?.toLowerCase().replace(/ /g,'') !== 'developer') {
      return message.reply('Kamu harus bekerja sebagai Developer untuk menggunakan perintah ini.');
    }

    await message.reply("💻 Kamu melakukan coding dan menambah portofolio!");
  }
};
