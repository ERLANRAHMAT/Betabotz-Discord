const { EmbedBuilder } = require('discord.js');
// [DIPERBARUI] Mengimpor handler API Anda, bukan database lokal
const api = require('../../api_handler.js'); 

// --- Konfigurasi Hadiah (Tetap Sama) ---
const weeklyMoneyReward = 100000;
const weeklyLimitReward = 10;
const weeklydiamondtReward = 1;
const cooldown = 604800000; // 7 hari dalam milidetik

// Fungsi untuk format waktu (Tetap Sama)
function msToTime(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    return `${days} hari ${hours} jam ${minutes} menit`;
}

module.exports = {
  prefix: "weekly",
  category: "rpg",
  aliases: ["mingguan"],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    
    const processingMsg = await message.reply("⏳ Memeriksa data mingguanmu...");

    try {
        // --- LOGIKA BARU DENGAN API ---

        // 1. GET: Ambil data user terbaru dari API
        const userData = await api.getUser(authorId, authorUsername);

        const lastClaim = userData.lastWeekly || 0;
        const currentTime = Date.now();

        // 2. Lakukan Pengecekan Cooldown
        if (currentTime - lastClaim < cooldown) {
            const remainingTime = cooldown - (currentTime - lastClaim);
            return processingMsg.edit(`🎁 Anda sudah mengambil hadiah mingguan.\nSilakan kembali lagi dalam **${msToTime(remainingTime)}**.`);
        }

        // 3. Ubah Data di Memori
        userData.money += weeklyMoneyReward;
        userData.limit += weeklyLimitReward;
        userData.diamond += weeklydiamondtReward;
        userData.lastWeekly = currentTime;

        // 4. POST: Kirim kembali seluruh objek user yang sudah diubah ke API
        await api.updateUser(authorId, userData);

        // 5. Kirim Pesan Sukses
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("🎉 Hadiah Mingguan Berhasil Diklaim!")
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(`Kamu mendapatkan hadiah mingguan spesial!`)
            .addFields(
                { name: 'Hadiah yang Diterima', value: `💰 **+${weeklyMoneyReward.toLocaleString('id-ID')}** Money\n🎟️ **+${weeklyLimitReward}** Limit\n💎 **+${weeklydiamondtReward}** diamond` },
                { name: 'Total Milikmu Sekarang', value: `💰 **${userData.money.toLocaleString('id-ID')}** Money\n🎟️ **${userData.limit}** Limit\n💎 **+${userData.diamond}** diamond` }
            )
            .setFooter({ text: "Kembali lagi minggu depan untuk hadiah lainnya!" })
            .setTimestamp();

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error("[WEEKLY CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan saat memproses hadiah mingguan: ${error.message}`);
    }
  },
};