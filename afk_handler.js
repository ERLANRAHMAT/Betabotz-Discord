const api = require('./api_handler.js');
const config = require('./config.js');

const afkCache = new Map();
const CACHE_DURATION_AFK = 24 * 60 * 60 * 1000; // Cache data AFK selama 15 detik

async function getCachedAfkUser(userId, username) {
    const now = Date.now();
    const cachedEntry = afkCache.get(userId);
    if (cachedEntry && (now - cachedEntry.timestamp < CACHE_DURATION_AFK)) {
        return cachedEntry.data;
    }
    const userData = await api.getUser(userId, username);
    afkCache.set(userId, { data: userData, timestamp: now });
    return userData;
}
// ---

function formatAfkTime(ms) {
    let days = Math.floor(ms / 86400000);
    let hours = Math.floor(ms / 3600000) % 24;
    let minutes = Math.floor(ms / 60000) % 60;
    let seconds = Math.floor(ms / 1000) % 60;
    let timeString = '';
    if (days > 0) timeString += `${days}h `;
    if (hours > 0) timeString += `${hours}j `;
    if (minutes > 0) timeString += `${minutes}m `;
    timeString += `${seconds}d`;
    return timeString.trim();
}

module.exports = {
  handleMessage: async (message, client) => {
    // Abaikan jika itu adalah perintah
    if (message.content.startsWith(config.prefix)) return;

    // 1. Cek jika PENGIRIM kembali dari AFK
    try {
        // [DIPERBARUI] Menggunakan cache
        const authorData = await getCachedAfkUser(message.author.id, message.author.username);
        if (authorData.afk > -1) {
            const duration = formatAfkTime(Date.now() - authorData.afk);
            await message.reply(`Selamat datang kembali! Kamu telah AFK selama **${duration}**.`);
            
            authorData.afk = -1;
            authorData.afkReason = '';
            await api.updateUser(message.author.id, authorData);
            // Hapus dari cache agar data langsung update
            afkCache.delete(message.author.id); 
        }
    } catch (e) {}

    // 2. Cek jika pesan me-MENTION orang AFK
    if (message.mentions.users.size > 0) {
        for (const mentionedUser of message.mentions.users.values()) {
            try {
                // [DIPERBARUI] Menggunakan cache
                const mentionedData = await getCachedAfkUser(mentionedUser.id, mentionedUser.username);
                if (mentionedData.afk > -1) {
                    const duration = formatAfkTime(Date.now() - mentionedData.afk);
                    await message.reply(`🤫 **${mentionedUser.username}** sedang AFK sejak **${duration}** yang lalu.\n> Alasan: *${mentionedData.afkReason || 'Tidak ada'}*`);
                }
            } catch (e) {}
        }
    }
  }
};
