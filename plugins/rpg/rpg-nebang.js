const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// --- Konfigurasi Aksi ---
const cooldown = 28800000; // 8 jam dalam milidetik

// Fungsi untuk format waktu
function msToTime(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    
    return `${hours} jam ${minutes} menit ${seconds} detik`;
}

module.exports = {
  prefix: "nebang",
  category: "rpg",
  aliases: [],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    
    try {
        // 1. GET: Ambil data user dari API
        const userData = await api.getUser(authorId, authorUsername);

        // ==================== PERBAIKAN DI SINI ====================
        // Cek apakah pengguna memiliki kapak (axe)
        if ((userData.axe || 0) <= 0) {
            return message.reply("🪓 Kamu tidak punya kapak! Buat satu di `!craft` untuk bisa menebang pohon.");
        }
        
        // Cek durability kapak
        if ((userData.axedurability || 0) <= 0) {
            return message.reply("❗ Kapakmu sudah rusak dan tidak bisa digunakan lagi. Buat yang baru di `!craft`.");
        }
        // ==================== AKHIR PERBAIKAN ====================

        const lastNebang = userData.lastnebang || 0;
        const currentTime = Date.now();

        // Cek Cooldown
        if (currentTime - lastNebang < cooldown) {
            const remainingTime = cooldown - (currentTime - lastNebang);
            return message.reply(`🌲 Kamu sudah menebang pohon, kapakmu perlu di istirahatkan.\nSilakan kembali lagi dalam **${msToTime(remainingTime)}**.`);
        }

        const processingMsg = await message.reply("🌲 Pergi ke hutan mencari pohon...");

        // Simulasi waktu kerja
        setTimeout(async () => {
            try {
                // Ambil data terbaru lagi untuk dimodifikasi
                const finalUserData = await api.getUser(authorId, authorUsername);
                
                // Hitung hadiah
                const kayuGained = Math.floor(Math.random() * 45) + 5;

                // 2. MODIFY: Ubah data di memori
                finalUserData.kayu = (finalUserData.kayu || 0) + kayuGained;
                finalUserData.axedurability = (finalUserData.axedurability || 0) - 1; // Kurangi durability
                finalUserData.lastnebang = Date.now();

                // 3. POST: Kirim kembali data yang sudah diperbarui ke API
                await api.updateUser(authorId, finalUserData);

                // Tampilkan hasil akhir
                const resultEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle("🪓 Selesai Menebang!")
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                    .setDescription(`Kamu berhasil mendapatkan **${kayuGained}** 🪵 Kayu.`)
                    .addFields({ name: 'Total Kayu Milikmu', value: `🪵 ${finalUserData.kayu.toLocaleString('id-ID')}` })
                    .setFooter({ text: `Durability kapak tersisa: ${finalUserData.axedurability}` }); // Tampilkan sisa durability
                
                await processingMsg.edit({ content: null, embeds: [resultEmbed] });

            } catch (innerError) {
                console.error("[NEBANG ACTION ERROR]", innerError);
                await processingMsg.edit(`❌ Terjadi kesalahan saat menebang: ${innerError.message}`);
            }
        }, 3000); // Delay 3 detik untuk simulasi

    } catch (error) {
        console.error("[NEBANG CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    } finally {
        // activeMissions tidak ada di versi ini, jadi tidak perlu dihapus
    }
  },
};