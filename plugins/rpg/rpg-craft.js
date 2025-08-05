const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const api = require('../../api_handler.js');
const { shopItems } = require('./rpg-shop.js');

// ==================== PUSAT DATA RESEP CRAFTING ====================
// Untuk mengubah resep atau menambah item, cukup edit di sini!
// Kunci (misal: 'pickaxe') harus sama dengan nama properti di database Anda.
const recipes = {
    axe: 
    { name: 'Axe', emoji: '🪓', materials: { kayu: 15, batu: 10, iron: 15, string: 10 }, result: { axe: 1 }, durability: { axedurability: 40 } },

    pickaxe: {
        name: 'Pickaxe',
        emoji: '⛏️',
        materials: { kayu: 10, batu: 5, iron: 5, string: 20 },
        result: { pickaxe: 1 },
        durability: { pickaxedurability: 40 }
    },
    sword: {
        name: 'Sword',
        emoji: '⚔️',
        materials: { kayu: 10, iron: 15 },
        result: { sword: 1 },
        durability: { sworddurability: 40 }
    },
    pisau: {
        name: 'Pisau',
        emoji: '🔪',
        materials: { kayu: 15, iron: 20 },
        result: { pisau: 1 },
        durability: { pisaudurability: 40 }
    },
    axe: {
        name: 'Axe',
        emoji: '🪓',
        materials: { kayu: 15, batu: 10, iron: 15, string: 10 },
        result: { axe: 1 },
        durability: { axedurability: 40 }
    },
    bow: {
        name: 'Bow',
        emoji: '🏹',
        materials: { kayu: 10, iron: 5, string: 10 },
        result: { bow: 1 },
        durability: { bowdurability: 40 }
    },
    pancingan: {
        name: 'pancingan',
        emoji: '🎣',
        materials: { kayu: 10, iron: 2, string: 20 },
        result: { fishingrod: 1 },
        durability: { fishingroddurability: 40 }
    },
    armor: {
        name: 'Armor',
        emoji: '🥼',
        materials: { iron: 25, diamond: 5 }, // Resep disesuaikan agar lebih logis
        result: { armor: 1 },
        durability: { armordurability: 50 }
    },
    katana: {
        name: 'Katana',
        emoji: '🦯',
        materials: { kayu: 10, iron: 15, diamond: 5, emerald: 3 },
        result: { katana: 1 },
        durability: { katanadurability: 40 }
    }
};
// =================================================================

module.exports = {
  prefix: "craft",
  category: "rpg",
  aliases: ["blacksmith", "crafting"],
  
  async execute(message, args, client) {
    const itemToCraft = args[0]?.toLowerCase();
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    // Jika tidak ada argumen, tampilkan daftar resep
    if (!itemToCraft) {
        const recipeList = Object.values(recipes).map(recipe => {
            const materials = Object.entries(recipe.materials)
                .map(([mat, amount]) => `${amount} ${mat}`)
                .join(', ');
            return `**${recipe.emoji} ${recipe.name}**: \n> *Bahan:* ${materials}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0xD2691E)
            .setTitle("🔨 Blacksmith - Daftar Crafting")
            .setDescription("Gunakan `!craft <nama_item>` untuk membuat barang.\n\n" + recipeList)
            .setFooter({ text: "Pastikan bahan-bahanmu cukup!" });

        return message.reply({ embeds: [embed] });
    }

    const recipe = recipes[itemToCraft];
    if (!recipe) {
        return message.reply(`❌ Resep untuk membuat **${itemToCraft}** tidak ditemukan.`);
    }
    
    const processingMsg = await message.reply(`🛠️ Mencoba membuat **${recipe.name}**...`);

   try {
        const userData = await api.getUser(authorId, authorUsername);
        const resultItemKey = Object.keys(recipe.result)[0];
        if (userData[resultItemKey] > 0) {
            return processingMsg.edit(`❗ Kamu sudah memiliki **${recipe.name}**.`);
        }

        let missingMaterials = [];
        let totalCost = 0;
        let canBuyAll = true;

        for (const [material, requiredAmount] of Object.entries(recipe.materials)) {
            const userAmount = userData[material] || 0;
            if (userAmount < requiredAmount) {
                const needed = requiredAmount - userAmount;
                missingMaterials.push({ name: material, amount: needed });
                
                const itemPrice = shopItems[material]?.buyPrice;
                if (itemPrice) {
                    totalCost += itemPrice * needed;
                } else {
                    canBuyAll = false; // Tandai jika ada bahan yang tidak bisa dibeli
                }
            }
        }

        // --- LOGIKA BARU DENGAN TOMBOL ---
        if (missingMaterials.length > 0) {
            const missingList = missingMaterials.map(m => `- ${m.amount} ${m.name}`).join('\n');
            let description = `❌ Bahan tidak cukup! Kamu kekurangan:\n${missingList}`;
            
            const row = new ActionRowBuilder();
            const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle("Bahan Tidak Cukup!").setDescription(description);

            if (canBuyAll && totalCost > 0) {
                embed.addFields({ name: "Beli Otomatis", value: `Kamu bisa membeli semua bahan yang kurang seharga **💰 ${totalCost.toLocaleString('id-ID')}** Money.` });
                row.addComponents(new ButtonBuilder().setCustomId('craft_buy_missing').setLabel(`Beli Bahan (${totalCost.toLocaleString('id-ID')})`).setStyle(ButtonStyle.Success));
            } else {
                embed.setFooter({ text: "Beberapa bahan tidak tersedia di !shop." });
            }

            const replyMsg = await processingMsg.edit({ content: null, embeds: [embed], components: canBuyAll ? [row] : [] });
            
            if (!canBuyAll) return;

            const collector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
            collector.on('collect', async i => {
                if (i.user.id !== authorId) return i.reply({ content: "Tombol ini bukan untukmu!", ephemeral: true });
                await i.deferUpdate();
                collector.stop();

                try {
                    const freshUserData = await api.getUser(authorId, authorUsername);
                    if (freshUserData.money < totalCost) {
                        return replyMsg.edit({ content: `💰 Uangmu tidak cukup untuk membeli semua bahan!`, embeds: [], components: [] });
                    }

                    freshUserData.money -= totalCost;
                    missingMaterials.forEach(mat => {
                        freshUserData[mat.name] = (freshUserData[mat.name] || 0) + mat.amount;
                    });
                    
                    await api.updateUser(authorId, freshUserData);
                    await replyMsg.edit({ content: `✅ Berhasil membeli semua bahan yang kurang! Coba \`!craft ${itemToCraft}\` lagi sekarang.`, embeds: [], components: [] });

                } catch (e) {
                    await replyMsg.edit({ content: `❌ Gagal membeli bahan: ${e.message}`, embeds: [], components: [] });
                }
            });
            return;
        }

        // --- Logika Crafting jika bahan cukup ---
        for (const [material, requiredAmount] of Object.entries(recipe.materials)) { userData[material] -= requiredAmount; }
        for (const [item, amount] of Object.entries(recipe.result)) { userData[item] = (userData[item] || 0) + amount; }
        for (const [dura, value] of Object.entries(recipe.durability)) { userData[dura] = value; }
        
        await api.updateUser(authorId, userData);
        await processingMsg.edit(`✅ Berhasil membuat **1 ${recipe.name} ${recipe.emoji}**!`);

    } catch (error) {
        console.error("[CRAFT CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan saat crafting: ${error.message}`);
    }
  },
};