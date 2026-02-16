const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

const activeMissions = new Set();
const cooldown = 300000; 
const staminaCost = 20;
const delay = ms => new Promise(res => setTimeout(res, ms));

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
        const userData = await api.getUser(authorId, authorUsername);
        const lastCopet = userData.kerjatiga || 0;
        const currentTime = Date.now();
        if (currentTime - lastCopet < cooldown) {
            const remainingTime = cooldown - (currentTime - lastCopet);
            return message.reply(`🚓 Polisi masih berpatroli, jangan gegabah!\nKembali lagi dalam **${clockString(remainingTime)}**.`);
        }
        if (userData.stamina < staminaCost) {
            return message.reply(`❗ Stamina tidak cukup. Kamu butuh setidaknya **${staminaCost}** stamina untuk mencopet.`);
        }
        activeMissions.add(authorId);

        const embed = new EmbedBuilder().setColor(0x34495E).setTitle("💀 Misi Copet Dimulai");
        const missionMessage = await message.reply({ embeds: [embed.setDescription("🔍 Mengincar target di keramaian...")] });
        
        await delay(4000);
        await missionMessage.edit({ embeds: [embed.setDescription("➕ Memulai aksi...")] });
        await delay(4000);
        await missionMessage.edit({ embeds: [embed.setDescription("👜 Merampas tas target...")] });
        await delay(4000);
        await missionMessage.edit({ embeds: [embed.setDescription("🏃‍♂️ Berhasil kabur! Menghitung hasil...")] });
        await delay(2000);

        // Hitung hadiah
        const randomMoney = Math.floor(Math.random() * 2000) + 500; 
        const randomExp = Math.floor(Math.random() * 100) + 20;   

        // 2. MODIFY: Ubah data di memori
        userData.money += randomMoney;
        userData.rpg.exp += randomExp;
        userData.stamina -= staminaCost;
        userData.warn = (userData.warn || 0) + 1;
        // Auto-penjara jika warn >= 5
        if (userData.warn >= 5) {
            userData.jail = { status: true, reason: "Terlalu banyak melakukan copet!", until: Date.now() + 24 * 60 * 60 * 1000 };
            userData.warn = 0;
            await api.updateUser(authorId, userData);
            await missionMessage.edit("⛓️ Kamu tertangkap polisi karena terlalu sering mencopet! Kamu masuk penjara selama 1 hari.");
            activeMissions.delete(authorId);
            return;
        }
        userData.kerjatiga = currentTime;

        await api.updateUser(authorId, userData);

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
        activeMissions.delete(authorId);
    }
  },
};