const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');
const config = require('../../config.js'); 

function formatAfkTime(ms) {
    let days = Math.floor(ms / 86400000);
    let hours = Math.floor(ms / 3600000) % 24;
    let minutes = Math.floor(ms / 60000) % 60;
    let seconds = Math.floor(ms / 1000) % 60;
    let timeString = '';
    if (days > 0) timeString += `${days} hari `;
    if (hours > 0) timeString += `${hours} jam `;
    if (minutes > 0) timeString += `${minutes} menit `;
    timeString += `${seconds} detik`;
    return timeString.trim();
}

async function handleSetAfk(message, args) {
  const authorId = message.author.id;
  const authorUsername = message.author.username;
  const reason = args.join(" ") || "Tanpa Alasan";

  try {
    let userData = await api.getUser(authorId, authorUsername);

    if (userData.data) {
      userData = userData.data;
    }

    userData.afk = Date.now();
    userData.afkReason = reason;
    await api.updateUser(authorId, userData);

    await message.reply(`Kamu sekarang AFK dengan alasan: **${reason}**`);
  } catch (error) {
    await message.reply(`❌ Gagal mengatur status AFK: ${error.message}`);
  }
}

async function handleListAfk(message) {
  const processingMsg = await message.reply(
    "📜 Mengambil daftar pengguna AFK...",
  );

  try {
    const usersMap = await api.getAfkUsers();

    const afkUsers = Object.entries(usersMap).map(([id, data]) => {
      const afkTime = Number(data.afk);
      const duration = formatAfkTime(Date.now() - afkTime);

      const name = data.username || data.name || "User Tanpa Nama";

      return `**${name}** - ${duration}\n> Alasan: *${data.afkReason || "Tidak ada"}*`;
    });
    if (afkUsers.length === 0) {
      return processingMsg.edit("✅ Tidak ada pengguna yang sedang AFK.");
    }
    const embed = new EmbedBuilder()
      .setColor(0x7f8c8d)
      .setTitle("🌙 Daftar Pengguna AFK")
      .setDescription(afkUsers.join("\n\n"));

    await processingMsg.edit({ content: null, embeds: [embed] });
  } catch (error) {
    console.error(error);
    await processingMsg.edit(`❌ Gagal mengambil daftar AFK: ${error.message}`);
  }
}


module.exports = {
  prefix: "afk",
  category: "main",
  aliases: ["listafk"],
  
  async execute(message, args, client) {
    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();
    if (command === 'listafk') {
        return handleListAfk(message);
    } else {    
        return handleSetAfk(message, args);
    }
  },
};