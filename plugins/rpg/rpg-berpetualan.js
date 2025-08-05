const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

const gameSessions = new Map();
const cooldown = 300000; // 5 menit

function createAdventures() {
    const areaNames = [ "Hutan", "Desa ", "Gua", "Puncak", "Danau", "Kastil", "Pulau ", "HutanGelap", "Reruntuhan", "Kuil" ];
    return areaNames.map((areaName, i) => ({
        area: `Petualangan di ${areaName}`,
        keyword: areaName.toLowerCase().replace(/ /g, "_"),
        reward: {
            exp: 100 + (i * 50),
            money: Math.floor(Math.random() * 20000) + 5000,
            potion: Math.random() > 0.5 ? 1 : 0,
            diamond: Math.random() > 0.8 ? 1 : 0, // Peluang lebih kecil
            emas: Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0,
            limit: Math.random() > 0.9 ? 1 : 0, // Peluang kecil dapat limit
        }
    }));
}

function formatTime(ms) {
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return `${m} menit ${s} detik`;
}

module.exports = {
  prefix: "berpetualang",
  category: "rpg",
  aliases: ["adventure", "petualang"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    if (args[0]?.toLowerCase() === 'start') {
        if (gameSessions.has(authorId)) {
            return message.reply("⏳ Anda masih dalam sesi berpetualang. Selesaikan dulu atau ketik `stop`.");
        }

        try {
            const userData = await api.getUser(authorId, authorUsername);
            const lastAdventure = userData.lastadventure || 0;
            if (Date.now() - lastAdventure < cooldown) {
                const remaining = cooldown - (Date.now() - lastAdventure);
                return message.reply(`Silakan tunggu **${formatTime(remaining)}** lagi sebelum berpetualang kembali.`);
            }
            if (userData.rpg.health <= 0 || userData.stamina <= 0) {
                return message.reply("❗ Kamu kelelahan atau terluka. Pulihkan dirimu terlebih dahulu!");
            }

            const adventures = createAdventures();
            gameSessions.set(authorId, {
                areas: adventures,
                currentArea: 0,
                totalReward: {} // Untuk mengakumulasi total hadiah
            });

            const firstArea = adventures[0];
            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle("🏞️ Petualangan Dimulai!")
                .setDescription(`Kamu memulai petualangan di **${firstArea.area}**.\n\nKetik \`${firstArea.keyword}\` untuk melanjutkan.`)
                .setFooter({ text: "Ketik `stop` untuk berhenti kapan saja." });
            
            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("[ADVENTURE START ERROR]", error);
            message.reply(`❌ Terjadi kesalahan: ${error.message}`);
        }
    } else {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB).setTitle("🗺️ Bantuan Game Petualangan")
            .setDescription("Ketik `!berpetualang start` untuk memulai petualangan mencari harta karun.");
        await message.reply({ embeds: [helpEmbed] });
    }
  },

  handleMessage: async (message, client) => {
    const authorId = message.author.id;
    if (!gameSessions.has(authorId) || message.author.bot) return;

    const session = gameSessions.get(authorId);
    const currentAdventure = session.areas[session.currentArea];
    const userInput = message.content.toLowerCase().trim();

    if (userInput === 'stop') {
        gameSessions.delete(authorId);
        return message.reply("❌ Petualangan telah dihentikan.");
    }

    if (userInput === currentAdventure.keyword) {
        const processingMsg = await message.reply(`🚶 Menjelajahi **${currentAdventure.area}**...`);
        try {
            // Pola GET -> MODIFY -> POST
            const userData = await api.getUser(authorId, message.author.username);
            
            const reward = currentAdventure.reward;
            let rewardText = "";

            // Akumulasi dan tambahkan hadiah ke data pengguna
            for (const item in reward) {
                if(item === 'exp') {
                    userData.rpg[item] = (userData.rpg[item] || 0) + reward[item];
                } else {
                    userData[item] = (userData[item] || 0) + reward[item];
                }
                session.totalReward[item] = (session.totalReward[item] || 0) + reward[item];
                if(reward[item] > 0) rewardText += `+${reward[item]} ${item}\n`;
            }
            
            // Update cooldown setelah aksi pertama
            if (session.currentArea === 0) {
                userData.lastadventure = Date.now();
            }

            await api.updateUser(authorId, userData);

            session.currentArea++;
            
            let replyEmbed;
            if (session.currentArea >= session.areas.length) {
                // Selesai
                const totalRewardText = Object.entries(session.totalReward).map(([item, amount]) => `+${amount} ${item}`).join('\n');
                replyEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71).setTitle("🎉 Selamat, Petualangan Selesai!")
                    .setDescription(`Kamu telah menyelesaikan semua area!\n\n**Total Hadiah yang Dikumpulkan:**\n${totalRewardText}`);
                gameSessions.delete(authorId);
            } else {
                // Lanjut ke area berikutnya
                const nextArea = session.areas[session.currentArea];
                replyEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71).setTitle(`✅ ${currentAdventure.area} Selesai!`)
                    .setDescription(`Kamu mendapatkan:\n${rewardText}\n\nPerjalananmu berlanjut ke **${nextArea.area}**.\nKetik \`${nextArea.keyword}\` untuk melanjutkan.`)
                    .setFooter({ text: "Ketik `stop` untuk berhenti." });
            }
            await processingMsg.edit({ content: null, embeds: [replyEmbed] });

        } catch (error) {
            console.error("[ADVENTURE ACTION ERROR]", error);
            await processingMsg.edit(`❌ Terjadi kesalahan: ${error.message}`);
            gameSessions.delete(authorId);
        }
    }
  }
};