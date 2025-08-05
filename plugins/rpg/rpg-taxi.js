const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// Set untuk melacak pengguna yang sedang menjalankan misi
const activeMissions = new Set();
const cooldown = 3600000; // 1 jam dalam milidetik

// Fungsi helper untuk delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Fungsi untuk format waktu
function clockString(ms) {
    let h = Math.floor(ms / 3600000);
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

module.exports = {
  prefix: "taxi",
  category: "rpg",
  aliases: [],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    if (activeMissions.has(authorId)) {
        return message.reply("❗ Anda sedang menyelesaikan misi lain. Tunggu sampai selesai!");
    }

    try {
        // 1. GET: Ambil data user dari API
        const userData = await api.getUser(authorId, authorUsername);
        const lastTaxi = userData.lasttaxi || 0;
        const currentTime = Date.now();

        // Cek Cooldown
        if (currentTime - lastTaxi < cooldown) {
            const remainingTime = cooldown - (currentTime - lastTaxi);
            return message.reply(`🚕 Kamu kelelahan, istirahat dulu ya.\nKembali lagi dalam **${clockString(remainingTime)}**.`);
        }

        // Kunci pengguna agar tidak bisa menjalankan perintah kerja lain
        activeMissions.add(authorId);

        const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🚕 Misi Taxi Dimulai");
        const missionMessage = await message.reply({ embeds: [embed.setDescription("🔍 Mencari orderan untukmu...")] });
        
        // Animasi
        await delay(5000);
        await missionMessage.edit({ embeds: [embed.setDescription("✔️ Mendapatkan orderan!")] });
        await delay(5000);
        await missionMessage.edit({ embeds: [embed.setDescription("🚖 Mengantar ke tujuan...")] });
        await delay(5000);
        await missionMessage.edit({ embeds: [embed.setDescription("✅ Selesai Mengantar Pelanggan!")] });
        await delay(2000);
        await missionMessage.edit({ embeds: [embed.setDescription("💸 Menerima Gaji...")] });
        await delay(2000);

        // Hitung hadiah
        const randomMoney = Math.floor(Math.random() * 10000) + 5000; // Antara 5,000 - 15,000
        const randomExp = Math.floor(Math.random() * 500) + 100;    // Antara 100 - 600

        // 2. MODIFY: Ubah data di memori
        userData.money += randomMoney;
        userData.rpg.exp += randomExp;
        userData.taxi = (userData.taxi || 0) + 1;
        userData.lasttaxi = currentTime;

        // 3. POST: Kirim kembali data yang sudah diperbarui ke API
        await api.updateUser(authorId, userData);

        // Tampilkan hasil akhir
        const resultEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("🎉 Misi Selesai!")
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(`**Hasil kerja kerasmu sebagai supir taksi:**`)
            .addFields(
                { name: '💰 Uang Didapat', value: `+${randomMoney.toLocaleString('id-ID')}`, inline: true },
                { name: '✨ XP Didapat', value: `+${randomExp.toLocaleString('id-ID')}`, inline: true },
                { name: 'Total Order Selesai', value: `${userData.taxi}`, inline: true }
            );
        
        await missionMessage.edit({ embeds: [resultEmbed] });

    } catch (error) {
        console.error("[TAXI CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan saat menjalankan misi: ${error.message}`);
    } finally {
        // Selalu hapus kunci setelah misi selesai atau gagal
        activeMissions.delete(authorId);
    }
  },
};