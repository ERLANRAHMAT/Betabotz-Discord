const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const api = require('../../api_handler.js');

module.exports = {
  prefix: "ban",
  category: "owner",
  aliases: ["unban", "banlist"],

  async execute(message, args, client) {
    if (message.author.id !== config.ownerId) {
        return message.reply("⛔ Perintah ini hanya untuk Owner Bot!");
    }

    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();
    const targetUser = message.mentions.users.first();
    const reason = args.slice(1).join(' ');

    try {
        if (command === 'ban') {
            if (!targetUser) return message.reply("Mention pengguna yang ingin diban. Contoh: `!ban @user spam`");
            if (targetUser.id === config.ownerId) return message.reply("Anda tidak bisa mem-ban diri sendiri.");
            
            const userData = await api.getUser(targetUser.id, targetUser.username);
            
            // [DIPERBARUI] Memeriksa status ban dari objek
            if (userData.banned?.status === true) {
                return message.reply(`❗ Pengguna **${targetUser.username}** sudah ada di dalam daftar ban.`);
            }

            // [DIPERBARUI] Mengubah properti sesuai struktur objek API Anda
            userData.banned = { 
                status: true, 
                reason: reason || "Tidak ada alasan." 
            };
            
            await api.updateUser(targetUser.id, userData);

            message.reply(`✅ Pengguna **${targetUser.username}** telah berhasil diban dari bot.`);
        } 
        else if (command === 'unban') {
            if (!targetUser) return message.reply("Mention pengguna yang ingin di-unban. Contoh: `!unban @user`");
            
            const userData = await api.getUser(targetUser.id, targetUser.username);
            
            if (!userData.banned?.status) {
                return message.reply(`❗ Pengguna **${targetUser.username}** tidak ditemukan di dalam daftar ban.`);
            }
            
            userData.banned = { status: false, reason: null };
            await api.updateUser(targetUser.id, userData);

            message.reply(`✅ Pengguna **${targetUser.username}** telah berhasil di-unban.`);
        }
        else if (command === 'banlist') {
            const processingMsg = await message.reply("🔍 Mengambil daftar ban dari database...");
            const allUsers = await api.getAllUsers();
            
            // ==================== PERBAIKAN & DEBUG DI SINI ====================
            // Cetak data mentah dari API ke terminal untuk kita periksa
            console.log("--- DATA MENTAH DARI API UNTUK !banlist ---");
            console.log(JSON.stringify(allUsers, null, 2));
            console.log("-----------------------------------------");

            // Filter yang lebih aman
            const bannedEntries = Object.entries(allUsers || {}).filter(([id, data]) => {
                // Menambahkan log untuk setiap user yang diperiksa
                console.log(`Mengecek user: ${data?.username}, Status Ban: ${data?.banned?.status}`);
                return data && data.banned?.status === true;
            });
            // ==================== AKHIR PERBAIKAN ====================

            if (bannedEntries.length === 0) {
                return processingMsg.edit("Daftar ban kosong. (Silakan periksa log terminal untuk melihat data mentah dari API).");
            }

            const description = bannedEntries.map(([id, data], index) => 
                `${index + 1}. **${data.username || 'Unknown'}** (\`${id}\`)\n   Alasan: *${data.banned.reason || 'Tidak ada'}*`
            ).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle(`🚫 Daftar Pengguna Diban (${bannedEntries.length})`)
                .setDescription(description);
            
            await processingMsg.edit({ content: null, embeds: [embed] });
        }
    } catch (error) {
        console.error("[BAN CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};