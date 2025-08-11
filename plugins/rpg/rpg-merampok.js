const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');


const cooldown = 3600000; 
const successRate = 0.60;  
const fineAmount = 5000;  
const targetMinMoney = 10000; 


function clockString(ms) {
    let h = Math.floor(ms / 3600000);
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

module.exports = {
  prefix: "merampok",
  category: "rpg",
  aliases: ["rob", "rampok"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const targetUser = message.mentions.users.first();

    if (!targetUser) {
        return message.reply("Siapa yang mau kamu rampok? Mention targetnya! Contoh: `!merampok @user`");
    }
    if (targetUser.id === authorId) {
        return message.reply("Tidak bisa merampok diri sendiri!");
    }
    if (targetUser.bot) {
        return message.reply("Merampok bot? Ide yang buruk.");
    }

    const processingMsg = await message.reply(`🏃‍♂️ Merencanakan perampokan terhadap **${targetUser.username}**...`);

    try {
        const [authorData, targetData] = await Promise.all([
            api.getUser(authorId, authorUsername),
            api.getUser(targetUser.id, targetUser.username)
        ]);

        const lastRob = authorData.lastrob || 0;
        const currentTime = Date.now();
        if (currentTime - lastRob < cooldown) {
            const remainingTime = cooldown - (currentTime - lastRob);
            return processingMsg.edit(`Anda sudah merampok dan sedang bersembunyi. Tunggu **${clockString(remainingTime)}** lagi.`);
        }

        if (targetData.money < targetMinMoney) {
            return processingMsg.edit(`Target terlalu miskin, tidak sepadan dengan risikonya.`);
        }
        if (Math.random() < successRate) {
            const amountStolen = Math.floor(Math.random() * (targetData.money * 0.1)) + 1; // Rampok hingga 10% uang target

            authorData.money += amountStolen;
            targetData.money -= amountStolen;
            authorData.lastrob = currentTime;
            await Promise.all([
                api.updateUser(authorId, authorData),
                api.updateUser(targetUser.id, targetData)
            ]);

            await processingMsg.edit(`✅ **Berhasil!** Kamu berhasil merampok **${targetUser.username}** dan mendapatkan **${amountStolen.toLocaleString('id-ID')}** Money!`);

        } else {
                        authorData.money = Math.max(0, authorData.money - fineAmount);
            authorData.warn = (authorData.warn || 0) + 1;
            authorData.lastrob = currentTime;
            
            await api.updateUser(authorId, authorData);
            
            await processingMsg.edit(`❌ **Gagal!** Kamu ketahuan saat mencoba merampok **${targetUser.username}**.\nKamu didenda **${fineAmount.toLocaleString('id-ID')}** Money dan mendapatkan +1 Poin Peringatan (Warn).`);
        }

    } catch (error) {
        console.error("[MERAMPOK CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};