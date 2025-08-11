const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config');

/**
 * Fungsi untuk mengambil data leaderboard dari API
 * @param {'eco' | 'rpg'} type - Jenis leaderboard yang diminta
 * @returns {Promise<Array>}
 */
async function fetchLeaderboard(type) {
    try {
        const url = `${config.api.baseUrl}/rpg/leaderboard?type=${type}&apikey=${config.api.apiKey}`;
        const response = await axios.get(url);
        if (response.data && response.data.status) {
            return response.data.data; // Mengembalikan array pengguna yang sudah diurutkan
        }
        throw new Error("API tidak mengembalikan data yang valid.");
    } catch (error) {
        console.error(`[Leaderboard API] Gagal mengambil data untuk tipe ${type}:`, error);
        throw new Error("Gagal terhubung ke server leaderboard.");
    }
}

module.exports = {
  prefix: "leaderboard",
  category: "rpg",
  aliases: ["lb", "top", "rank"],
  
 async execute(message, args, client) {
    const type = args[0]?.toLowerCase();

    if (!type || !['eco', 'rpg'].includes(type)) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("🏆 Bantuan Perintah Leaderboard")
            .setDescription("Gunakan sub-perintah untuk melihat papan peringkat.")
            .addFields(
                { name: "`!leaderboard eco`", value: "Menampilkan peringkat berdasarkan `Money`." },
                { name: "`!leaderboard rpg`", value: "Menampilkan peringkat berdasarkan `Level` dan `XP`." }
            );
        return message.reply({ embeds: [helpEmbed] });
    }
    
    const processingMsg = await message.reply(`🏅 Mengambil data peringkat untuk **${type.toUpperCase()}**...`);

    try {
        // ==================== PERBAIKAN DI SINI ====================
        // Menyesuaikan 'type' yang dikirim ke API sesuai instruksi Anda
        const apiType = (type === 'eco') ? 'money' : 'level';
        const leaderboardData = await fetchLeaderboard(apiType);
        // ==================== AKHIR PERBAIKAN ====================

        if (!leaderboardData || leaderboardData.length === 0) {
            return processingMsg.edit("Papan peringkat saat ini kosong.");
        }

        let embed;
        let leaderboardText;

        if (type === 'eco') {
            embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle("🏆 Leaderboard Ekonomi (Top 10)")
                .setDescription("Peringkat pengguna berdasarkan jumlah `Money` terbanyak.");
            
            leaderboardText = leaderboardData.slice(0, 10).map((user, index) => {
                return `**${index + 1}.** ${user.username || 'Unknown'} - 💰 ${ (user.money || 0).toLocaleString('id-ID') } Money`;
            }).join('\n');
        } else { // type === 'rpg'
            embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle("⚔️ Leaderboard RPG (Top 10)")
                .setDescription("Peringkat pengguna berdasarkan `Level` dan `XP` tertinggi.");

            leaderboardText = leaderboardData.slice(0, 10).map((user, index) => {
                return `**${index + 1}.** ${user.username || 'Unknown'} - **Level ${user.level || 1}**`;
            }).join('\n');
        }

        embed.addFields({ name: "Peringkat Saat Ini", value: leaderboardText });

        const userRank = leaderboardData.findIndex(u => u.userId === message.author.id) + 1;
        if (userRank > 0) {
            embed.setFooter({ text: `Peringkatmu: #${userRank}` });
        }

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        await processingMsg.edit(`❌ Terjadi kesalahan saat mengambil data peringkat: ${error.message}`);
    }
  },
};