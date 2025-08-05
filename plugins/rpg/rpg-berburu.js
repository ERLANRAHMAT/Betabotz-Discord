const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// Set untuk melacak pengguna yang sedang menjalankan misi
const activeMissions = new Set();
const cooldown = 3600000; // 1 jam

// Fungsi helper untuk delay dan format waktu
const delay = ms => new Promise(res => setTimeout(res, ms));
function clockString(ms) { /* ... (Fungsi sama seperti sebelumnya) ... */ }

// Daftar hewan yang bisa didapat dari berburu
const huntLoot = {
    ayam: { max: 12, emoji: '🐓' },
    babi: { max: 8, emoji: '🐖' },
    sapi: { max: 5, emoji: '🐄' },
    kambing: { max: 10, emoji: '🐐' },
    kerbau: { max: 5, emoji: '🐃' },
};

module.exports = {
  prefix: "berburu",
  category: "rpg",
  aliases: ["hunt"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    if (activeMissions.has(authorId)) {
        return message.reply("❗ Anda sedang menyelesaikan misi lain. Tunggu sampai selesai!");
    }

    try {
        // 1. GET: Ambil data user dari API
        const userData = await api.getUser(authorId, authorUsername);

        // Cek prasyarat: Senjata & Durability
        if ((userData.sword || 0) <= 0 && (userData.bow || 0) <= 0) {
            return message.reply("🏹 Kamu tidak punya senjata! Buat `sword` atau `bow` di `!craft` untuk berburu.");
        }
        if ((userData.sworddurability || 0) <= 0 && (userData.bowdurability || 0) <= 0) {
            return message.reply("❗ Senjatamu sudah rusak. Buat yang baru di `!craft`.");
        }

        // Cek Cooldown
        const lastHunt = userData.lastberburu || 0;
        const currentTime = Date.now();
        if (currentTime - lastHunt < cooldown) {
            const remainingTime = cooldown - (currentTime - lastHunt);
            return message.reply(`Hutan masih sepi, belum ada mangsa.\nKembali lagi dalam **${clockString(remainingTime)}**.`);
        }

        activeMissions.add(authorId);

        const embed = new EmbedBuilder().setColor(0x228B22).setTitle("🏹 Misi Berburu Dimulai");
        const missionMessage = await message.reply({ embeds: [embed.setDescription("🔍 Mencari jejak mangsa di hutan...")] });
        
        // Animasi
        await delay(5000);
        await missionMessage.edit({ embeds: [embed.setDescription("🐾 Mengikuti jejak...")] });
        await delay(5000);
        await missionMessage.edit({ embeds: [embed.setDescription("🎯 Menemukan target dan menyerang!")] });
        await delay(3000);

        // Ambil data terbaru lagi sebelum diubah
        const finalUserData = await api.getUser(authorId, authorUsername);
        
        // Hitung hasil buruan
        let huntSummary = "";
        for (const animal in huntLoot) {
            const info = huntLoot[animal];
            // Peluang 50% untuk mendapatkan setiap jenis hewan
            if (Math.random() < 0.5) {
                const amount = Math.floor(Math.random() * info.max) + 1;
                finalUserData[animal] = (finalUserData[animal] || 0) + amount;
                huntSummary += `${info.emoji} **${animal.charAt(0).toUpperCase() + animal.slice(1)}**: ${amount}\n`;
            }
        }
        
        // 2. MODIFY: Ubah data di memori
        // Kurangi durability senjata yang punya durability paling tinggi
        if ((finalUserData.sworddurability || 0) > (finalUserData.bowdurability || 0)) {
            finalUserData.sworddurability -= 1;
        } else {
            finalUserData.bowdurability -= 1;
        }
        finalUserData.lastberburu = currentTime;

        // 3. POST: Kirim kembali data yang sudah diperbarui ke API
        await api.updateUser(authorId, finalUserData);

        // Tampilkan hasil akhir
        if (huntSummary === "") {
            huntSummary = "Sayang sekali, semua buruanmu lolos kali ini...";
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("🎉 Hasil Perburuan!")
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(huntSummary)
            .setFooter({ text: "Gunakan hasil buruanmu untuk dimasak di `!masak`!"});
        
        await missionMessage.edit({ embeds: [resultEmbed] });

    } catch (error) {
        console.error("[BERBURU CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan saat berburu: ${error.message}`);
    } finally {
        activeMissions.delete(authorId);
    }
  },
};

// Salin fungsi clockString dari !taxi atau !copet
function clockString(ms) {
    let h = Math.floor(ms / 3600000);
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}