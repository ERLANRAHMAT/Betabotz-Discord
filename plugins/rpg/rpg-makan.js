const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// ==================== PUSAT DATA KONSUMSI ====================
// Untuk mengubah efek atau menambah item, cukup edit di sini!
const consumables = {
    // Makanan (Stamina)
    ayambakar: { name: 'Ayam Bakar', emoji: '🍖', restores: 'stamina', amount: 20 },
    ayamgoreng: { name: 'Ayam Goreng', emoji: '🍗', restores: 'stamina', amount: 20 },
    rendang: { name: 'Rendang', emoji: '🥘', restores: 'stamina', amount: 25 },
    steak: { name: 'Steak', emoji: '🥩', restores: 'stamina', amount: 25 },
    babipanggang: { name: 'Babi Panggang', emoji: '🥠', restores: 'stamina', amount: 30 },
    gulaiayam: { name: 'Gulai Ayam', emoji: '🍲', restores: 'stamina', amount: 20 },
    oporayam: { name: 'Opor Ayam', emoji: '🍜', restores: 'stamina', amount: 20 },
    sushi: { name: 'Sushi', emoji: '🍣', restores: 'stamina', amount: 15 },
    roti: { name: 'Roti', emoji: '🍞', restores: 'stamina', amount: 10 },
    ikanbakar: { name: 'Ikan Bakar', emoji: '🐟', restores: 'stamina', amount: 20 },
    lelebakar: { name: 'Lele Bakar', emoji: '🐠', restores: 'stamina', amount: 20 },
    nilabakar: { name: 'Nila Bakar', emoji: '🐟', restores: 'stamina', amount: 20 },
    bawalbakar: { name: 'Bawal Bakar', emoji: '🐡', restores: 'stamina', amount: 20 },
    udangbakar: { name: 'Udang Bakar', emoji: '🦐', restores: 'stamina', amount: 20 },
    pausbakar: { name: 'Paus Bakar', emoji: '🐳', restores: 'stamina', amount: 50 },
    kepitingbakar: { name: 'Kepiting Bakar', emoji: '🦀', restores: 'stamina', amount: 35 },
    // Minuman (Stamina/Efek Khusus)
    soda: { name: 'Soda', emoji: '🍺', restores: 'stamina', amount: 10 },
    vodka: { name: 'Vodka', emoji: '🍷', restores: 'stamina', amount: 25 },
    // Medis (Health)
    bandage: { name: 'Bandage', emoji: '💉', restores: 'health', amount: 25 },
    ganja: { name: 'Ganja', emoji: '☘️', restores: 'health', amount: 90 }, 
};
const MAX_STAT = 100;
// =========================================================

module.exports = {
  prefix: "makan",
  category: "rpg",
  aliases: ["eat"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    
    const itemName = args[0]?.toLowerCase();
    const amount = parseInt(args[1]) || 1;

    try {
        const userData = await api.getUser(authorId, authorUsername);
        if (!itemName) {
            const foodList = Object.entries(consumables).map(([key, item]) => {
                const userAmount = userData[key] || 0;
                return `${item.emoji} **${item.name}**: ${userAmount}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle(`🎒 Makanan di Tasmu`)
                .setDescription(foodList)
                .setFooter({ text: "Gunakan `!makan <nama_item> <jumlah>`" });
            return message.reply({ embeds: [embed] });
        }
        
        const item = consumables[itemName];
        if (!item) {
            return message.reply(`❌ Makanan bernama **${itemName}** tidak ditemukan.`);
        }
        if (amount <= 0) return message.reply("Jumlah harus lebih dari 0.");

        const userItemCount = userData[itemName] || 0;
        if (userItemCount < amount) {
            return message.reply(`📦 Kamu tidak punya cukup **${item.name}**. Kamu hanya punya ${userItemCount}.`);
        }

        const statToRestore = item.restores; // 'stamina' atau 'health'
        const currentStatValue = statToRestore === 'health' ? userData.rpg.health : userData[statToRestore];
        
        if (currentStatValue >= MAX_STAT) {
            return message.reply(`❤️ **${statToRestore.charAt(0).toUpperCase() + statToRestore.slice(1)}** kamu sudah penuh!`);
        }

        const oldStat = currentStatValue;

        userData[itemName] -= amount;
        const totalRestore = item.amount * amount;
        
        if (statToRestore === 'health') {
            userData.rpg.health = Math.min(MAX_STAT, userData.rpg.health + totalRestore);
        } else {
            userData[statToRestore] = Math.min(MAX_STAT, userData[statToRestore] + totalRestore);
        }

        await api.updateUser(authorId, userData);
        
        const newStat = statToRestore === 'health' ? userData.rpg.health : userData[statToRestore];

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle(`🍴 Nyam Nyam!`)
            .setDescription(`Kamu memakan **${amount} ${item.name} ${item.emoji}**.`)
            .addFields({
                name: `${statToRestore.charAt(0).toUpperCase() + statToRestore.slice(1)} Dipulihkan`,
                value: `\`${oldStat}\` ➔ \`${newStat}\``
            });

        await message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("[MAKAN CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};