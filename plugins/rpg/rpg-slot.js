const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// --- Konfigurasi Game ---
const cooldown = 20000; // 20 detik
const minBet = 100;
const consolationPrize = 500;
const emojis = ["💎", "💰", "🏆", "🎁", "⭐"]; // Emoji untuk slot

// Fungsi helper untuk delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Fungsi untuk format waktu
function msToTime(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    return `${seconds} detik`;
}

// Fungsi untuk membuat tampilan slot
function createSlotEmbed(frame1, frame2, frame3) {
    return new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle("🎰 Mesin Slot")
        .setDescription(
            `───────────\n` +
            `│ ${frame1[0]} │ ${frame2[0]} │ ${frame3[0]} │\n` +
            `➤ ${frame1[1]} │ ${frame2[1]} │ ${frame3[1]} │ ◄\n` +
            `│ ${frame1[2]} │ ${frame2[2]} │ ${frame3[2]} │\n` +
            `───────────`
        );
}

module.exports = {
  prefix: "slot",
  category: "rpg",
  aliases: ["ws"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    
    try {
        const userData = await api.getUser(authorId, authorUsername);
        const lastSlot = userData.lastslot || 0;
        const currentTime = Date.now();

        // Cek Cooldown
        if (currentTime - lastSlot < cooldown) {
            const remainingTime = cooldown - (currentTime - lastSlot);
            return message.reply(`⏳ Tunggu **${msToTime(remainingTime)}** lagi untuk bermain.`);
        }

        let betAmount;
        if (args[0]?.toLowerCase() === 'all') {
            betAmount = userData.money;
        } else {
            betAmount = parseInt(args[0]);
        }

        if (isNaN(betAmount)) return message.reply(`❓ Berapa banyak yang ingin kamu pertaruhkan?\nContoh: \`!slot 1000\` atau \`!slot all\``);
        if (betAmount < minBet) return message.reply(`Minimal taruhan adalah **${minBet}** Money.`);
        if (userData.money < betAmount) return message.reply(`💰 Uangmu tidak cukup! Kamu hanya punya **${userData.money.toLocaleString('id-ID')}** Money.`);

        
        let x = [], y = [], z = [];
        const initialEmbed = createSlotEmbed(['❓','❓','❓'], ['❓','❓','❓'], ['❓','❓','❓']).setFooter({ text: "Memutar..." });
        const gameMessage = await message.reply({ embeds: [initialEmbed] });

        // Animasi
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 3; j++) {
                x[j] = emojis[Math.floor(Math.random() * emojis.length)];
                y[j] = emojis[Math.floor(Math.random() * emojis.length)];
                z[j] = emojis[Math.floor(Math.random() * emojis.length)];
            }
            await gameMessage.edit({ embeds: [createSlotEmbed(x, y, z).setFooter({ text: "Memutar..." })] });
            await delay(800);
        }

        let resultText;
        const winMultiplier = 3; 
        
        if (x[1] === y[1] && y[1] === z[1]) {
            const winnings = betAmount * (winMultiplier - 1);
            userData.money += winnings;
            resultText = `🎉 **JACKPOT!** Kamu menang **${(betAmount * winMultiplier).toLocaleString('id-ID')}** Money! (Keuntungan: +${winnings.toLocaleString('id-ID')})`;
        } else if (x[1] === y[1] || y[1] === z[1]) {
            userData.money += consolationPrize;
            resultText = `👍 **Nyaris!** Kamu mendapatkan hadiah hiburan **${consolationPrize.toLocaleString('id-ID')}** Money!`;
        } else {
            userData.money -= betAmount;
            resultText = `😔 **Rungkad!** Kamu kehilangan **${betAmount.toLocaleString('id-ID')}** Money.`;
        }
        
        userData.lastslot = Date.now();

        await api.updateUser(authorId, userData);

        const finalEmbed = createSlotEmbed(x, y, z)
            .setFooter({ text: `Saldo Akhir: ${userData.money.toLocaleString('id-ID')} Money`});
        
        await gameMessage.edit({ embeds: [finalEmbed] });
        await message.channel.send({ content: `${message.author}\n${resultText}` });

    } catch (error) {
        console.error("[SLOT CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan saat bermain slot: ${error.message}`);
    }
  },
};