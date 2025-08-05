const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// --- State Management & Konfigurasi ---
const gameSessions = new Map(); // Kunci: userId
const cooldown = 5 * 60 * 1000; // 5 menit

// --- Fungsi Helper ---
function createMiningAreas() {
    const areaNames = ["👑Emas", "🪙Perak", "💎Berlian", "💎Batu Permata", "☢️Uranium", "Emas Hitam", "Kristal", "Rubi", "Safir", "Topaz", "Ametis", "Zamrud"];
    return areaNames.map((name, i) => ({
        area: `Tambang ${name}`,
        keyword: name.toLowerCase().replace(/ /g, "_"),
        reward: {
            exp: 50 + (i * 20),
            money: 100 + (i * 30),
            diamond: Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0,
            emas: Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : 0,
            iron: Math.random() > 0.4 ? Math.floor(Math.random() * 7) + 1 : 0,
            batu: Math.random() > 0.3 ? Math.floor(Math.random() * 10) + 1 : 0,
        }
    }));
}

function formatTime(ms) {
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return `${m} menit ${s} detik`;
}

// --- Handler Perintah & Pesan ---
module.exports = {
  prefix: "tambang",
  category: "rpg",
  aliases: ["mining"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    if (args[0]?.toLowerCase() === 'start') {
        if (gameSessions.has(authorId)) {
            return message.reply("⏳ Anda masih dalam sesi menambang. Selesaikan dulu atau ketik `stop`.");
        }

        try {
            const userData = await api.getUser(authorId, authorUsername);
            const lastMine = userData.kerjasatu || 0;
            if (Date.now() - lastMine < cooldown) {
                const remaining = cooldown - (Date.now() - lastMine);
                return message.reply(`Silakan tunggu **${formatTime(remaining)}** lagi sebelum menambang kembali.`);
            }
            if (userData.rpg.health <= 0 || userData.stamina <= 0) {
                return message.reply("❗ Kamu kelelahan atau terluka. Pulihkan dirimu terlebih dahulu! dengan !health");
            }

            const areas = createMiningAreas();
            gameSessions.set(authorId, {
                areas: areas,
                currentArea: 0
            });

            const firstArea = areas[0];
            const embed = new EmbedBuilder()
                .setColor(0x795548)
                .setTitle("🏞️ Area Pertambangan Ditemukan!")
                .setDescription(`Kamu menemukan **${firstArea.area}**.\n\nKetik \`${firstArea.keyword}\` untuk mulai menambang.`)
                .setFooter({ text: "Ketik `stop` untuk berhenti kapan saja." });
            
            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("[TAMBANG START ERROR]", error);
            message.reply(`❌ Terjadi kesalahan: ${error.message}`);
        }
    } else {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB).setTitle("⛏️ Bantuan Game Tambang")
            .setDescription("Ketik `!tambang start` untuk memulai petualangan menambang sumber daya.");
        await message.reply({ embeds: [helpEmbed] });
    }
  },

  handleMessage: async (message, client) => {
    const authorId = message.author.id;
    if (!gameSessions.has(authorId) || message.author.bot) return;

    const session = gameSessions.get(authorId);
    const currentArea = session.areas[session.currentArea];
    const userInput = message.content.toLowerCase().trim();

    if (userInput === 'stop') {
        gameSessions.delete(authorId);
        return message.reply("❌ Pertambangan telah dihentikan.");
    }

    if (userInput === currentArea.keyword) {
        const processingMsg = await message.reply(`⛏️ Menambang di **${currentArea.area}**...`);
        try {
            // Pola GET -> MODIFY -> POST
            const userData = await api.getUser(authorId, message.author.username);
            
            const reward = currentArea.reward;
            let rewardText = "";

            // Tambahkan hadiah ke data pengguna
            userData.rpg.exp += reward.exp;
            rewardText += `✨ +${reward.exp} XP\n`;

            userData.money += reward.money;
            rewardText += `💰 +${reward.money} Money\n`;
            
            for (const resource in reward) {
                if (typeof userData[resource] === 'number' && typeof reward[resource] === 'number') {
                    userData[resource] += reward[resource];
                    if(reward[resource] > 0) rewardText += `+${reward[resource]} ${resource}\n`;
                }
            }

            // Update cooldown setelah aksi pertama
            if (session.currentArea === 0) {
                userData.kerjasatu = Date.now();
            }

            await api.updateUser(authorId, userData);

            session.currentArea++;
            
            let replyEmbed;
            if (session.currentArea >= session.areas.length) {
                // Selesai
                replyEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71).setTitle("🎉 Selamat!")
                    .setDescription(`Kamu telah menyelesaikan semua area pertambangan!\n\n**Total Hadiah Terakhir:**\n${rewardText}`);
                gameSessions.delete(authorId);
            } else {
                // Lanjut ke area berikutnya
                const nextArea = session.areas[session.currentArea];
                replyEmbed = new EmbedBuilder()
                    .setColor(0x795548).setTitle(`✅ Berhasil Menambang di ${currentArea.area}!`)
                    .setDescription(`Kamu mendapatkan:\n${rewardText}\n\nSekarang kamu berada di **${nextArea.area}**.\nKetik \`${nextArea.keyword}\` untuk melanjutkan.`)
                    .setFooter({ text: "Ketik `stop` untuk berhenti." });
            }
            await processingMsg.edit({ content: null, embeds: [replyEmbed] });

        } catch (error) {
            console.error("[TAMBANG ACTION ERROR]", error);
            await processingMsg.edit(`❌ Terjadi kesalahan saat menambang: ${error.message}`);
            gameSessions.delete(authorId);
        }
    }
  }
};