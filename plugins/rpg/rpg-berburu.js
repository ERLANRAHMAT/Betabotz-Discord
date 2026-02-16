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
    ayam: { max: 3, emoji: '🐓' },
    babi: { max: 2, emoji: '🐖' },
    sapi: { max: 1, emoji: '🐄' },
    kambing: { max: 2, emoji: '🐐' },
    kerbau: { max: 1, emoji: '🐃' },
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

        // Cek Armor
       
        const armorDur = userData.armordurability || 0;
        let armorBonus = 0;

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
        
        await delay(5000);
        await missionMessage.edit({ embeds: [embed.setDescription("🐾 Mengikuti jejak...")] });
        await delay(5000);
        await missionMessage.edit({ embeds: [embed.setDescription("🎯 Menemukan target dan menyerang!")] });
        await delay(3000);
        const finalUserData = await api.getUser(authorId, authorUsername);
        
        let huntSummary = "";
        for (const animal in huntLoot) {
            const info = huntLoot[animal];
            if (Math.random() < (0.5 + armorBonus)) {
                const amount = Math.floor(Math.random() * info.max) + 1;
                finalUserData[animal] = (finalUserData[animal] || 0) + amount;
                huntSummary += `${info.emoji} **${animal.charAt(0).toUpperCase() + animal.slice(1)}**: ${amount}\n`;
            }
        }
        if ((finalUserData.sworddurability || 0) > (finalUserData.bowdurability || 0)) {
            finalUserData.sworddurability -= 1;
        } else {
            finalUserData.bowdurability -= 1;
        }
        finalUserData.lastberburu = currentTime;
        if ( armorDur > 0) {
            finalUserData.armordurability -= 1;
        }
        await api.updateUser(authorId, finalUserData);
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

function clockString(ms) {
    let h = Math.floor(ms / 3600000);
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}