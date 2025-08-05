const fs = require('fs');
const path = require('path');
const antiBadwordManager = require('./antiBadwordManager');

// Muat daftar kata kasar dari file JSON sekali saja
let badwords = [];
try {
    const data = fs.readFileSync(path.join(__dirname, '../badwords.json'), 'utf-8');
    badwords = JSON.parse(data);
    console.log(`[Anti-Badword] Berhasil memuat ${badwords.length} kata kasar.`);
} catch(e) {
    console.error("[Anti-Badword] Gagal memuat badwords.json. Pastikan file tersebut ada.");
}

module.exports = {
  /**
   * @param {import('discord.js').Message} message
   */
  handleMessage: async (message, client) => {
    // Cek cepat apakah fitur aktif di server ini
    if (!antiBadwordManager.enabledGuilds.has(message.guild.id)) return;

    // Abaikan pesan dari bot dan pemilik server (untuk keamanan)
    if (message.author.bot || message.author.id === message.guild.ownerId) return;

    // Bersihkan konten pesan untuk deteksi yang lebih baik
    const content = message.content.toLowerCase().replace(/\s/g, '');

    // Cek apakah pesan mengandung salah satu kata kasar
    for (const word of badwords) {
        if (content.includes(word)) {
            try {
                // Hapus pesan yang melanggar
                if (message.deletable) {
                    await message.delete();
                }
                
                // Kirim peringatan ke pengguna melalui DM
                await message.author.send(`Pesan Anda di server **${message.guild.name}** telah dihapus karena mengandung kata yang tidak pantas.`);
                
                console.log(`[Anti-Badword] Pesan dari ${message.author.username} dihapus di #${message.channel.name}. Kata terdeteksi: "${word}"`);
            } catch (error) {
                console.error(`[Anti-Badword] Gagal menghapus pesan atau mengirim DM:`, error);
            }
            // Hentikan pengecekan setelah menemukan satu kata
            break; 
        }
    }
  },
};