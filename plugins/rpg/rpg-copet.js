const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// Set untuk melacak pengguna yang sedang menjalankan misi
const activeMissions = new Set();
const cooldown = 300000; // 5 menit dalam milidetik
const staminaCost = 20;

// Fungsi helper untuk delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Fungsi untuk format waktu
function clockString(ms) {
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return `${m} menit ${s} detik`;
}

module.exports = {
  prefix: "copet",
  category: "rpg",
  aliases: ["rob"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    if (activeMissions.has(authorId)) {
        return message.reply("❗ Anda sedang menyelesaikan misi lain. Tunggu sampai selesai!");
    }

    try {
        // 1. GET: Ambil data user dari API
        const userData = await api.getUser(authorId, authorUsername);
        const lastCopet = userData.kerjatiga || 0;
        const currentTime = Date.now();

        // Cek Cooldown
        if (currentTime - lastCopet < cooldown) {
            const remainingTime = cooldown - (currentTime - lastCopet);
            return message.reply(`🚓 Polisi masih berpatroli, jangan gegabah!\nKembali lagi dalam **${clockString(remainingTime)}**.`);
        }
        
        // Cek Stamina
        if (userData.stamina < staminaCost) {
            return message.reply(`❗ Stamina tidak cukup. Kamu butuh setidaknya **${staminaCost}** stamina untuk mencopet.`);
        }

        // Kunci pengguna agar tidak bisa menjalankan perintah kerja lain
        activeMissions.add(authorId);

        const embed = new EmbedBuilder().setColor(0x34495E).setTitle("💀 Misi Copet Dimulai");
        const missionMessage = await message.reply({ embeds: [embed.setDescription("🔍 Mengincar target di keramaian...")] });
        
        // Animasi
        await delay(4000);
        await missionMessage.edit({ embeds: [embed.setDescription("➕ Memulai aksi...")] });
        await delay(4000);
        await missionMessage.edit({ embeds: [embed.setDescription("👜 Merampas tas target...")] });
        await delay(4000);
        await missionMessage.edit({ embeds: [embed.setDescription("🏃‍♂️ Berhasil kabur! Menghitung hasil...")] });
        await delay(2000);

        // Hitung hadiah
        const randomMoney = Math.floor(Math.random() * 20000) + 10000; // Antara 10,000 - 30,000
        const randomExp = Math.floor(Math.random() * 1000) + 200;    // Antara 200 - 1200

        // 2. MODIFY: Ubah data di memori
        userData.money += randomMoney;
        userData.rpg.exp += randomExp;
        userData.stamina -= staminaCost;
        userData.warn = (userData.warn || 0) + 1;
        userData.kerjatiga = currentTime;

        // 3. POST: Kirim kembali data yang sudah diperbarui ke API
        await api.updateUser(authorId, userData);

        // Tampilkan hasil akhir
        const resultEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("✅ Misi Copet Berhasil!")
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(`**Hasil kejahatanmu:**`)
            .addFields(
                { name: '💰 Uang Didapat', value: `+${randomMoney.toLocaleString('id-ID')}`, inline: true },
                { name: '✨ XP Didapat', value: `+${randomExp.toLocaleString('id-ID')}`, inline: true },
                { name: '⚡ Stamina', value: `-${staminaCost}`, inline: true }
            )
            .setFooter({ text: "Kamu mendapatkan +1 Poin Peringatan (Warn)!"});
        
        await missionMessage.edit({ embeds: [resultEmbed] });

    } catch (error) {
        console.error("[COPET CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan saat menjalankan misi: ${error.message}`);
    } finally {
        // Selalu hapus kunci setelah misi selesai atau gagal
        activeMissions.delete(authorId);
    }
  },
};