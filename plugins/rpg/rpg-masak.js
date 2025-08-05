const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const api = require('../../api_handler.js');
const config = require('../../config.js');
const { shopItems } = require('./rpg-shop.js');

// ==================== PUSAT DATA RESEP MASAKAN ====================
// Untuk mengubah resep atau menambah masakan, cukup edit di sini!
const recipes = {
    ayambakar: { name: 'Ayam Bakar', emoji: '🍖', ingredients: { ayam: 2, coal: 1 }, result: { ayambakar: 1 } },
    ayamgoreng: { name: 'Ayam Goreng', emoji: '🍗', ingredients: { ayam: 2, coal: 1 }, result: { ayamgoreng: 1 } },
    oporayam: { name: 'Opor Ayam', emoji: '🍜', ingredients: { ayam: 2, coal: 1 }, result: { oporayam: 1 } },
    gulaiayam: { name: 'Gulai Ayam', emoji: '🍲', ingredients: { ayam: 2, coal: 1 }, result: { gulai: 1 } },
    steak: { name: 'Steak', emoji: '🥩', ingredients: { sapi: 2, coal: 1 }, result: { steak: 1 } },
    rendang: { name: 'Rendang', emoji: '🥘', ingredients: { sapi: 2, coal: 1 }, result: { rendang: 1 } },
    babipanggang: { name: 'Babi Panggang', emoji: '🥠', ingredients: { babi: 2, coal: 1 }, result: { babipanggang: 1 } },
    ikanbakar: { name: 'Ikan Bakar', emoji: '🐟', ingredients: { ikan: 2, coal: 1 }, result: { ikanbakar: 1 } },
    lelebakar: { name: 'Lele Bakar', emoji: '🐠', ingredients: { lele: 2, coal: 1 }, result: { lelebakar: 1 } },
    nilabakar: { name: 'Nila Bakar', emoji: '🐟', ingredients: { nila: 2, coal: 1 }, result: { nilabakar: 1 } },
    bawalbakar: { name: 'Bawal Bakar', emoji: '🐡', ingredients: { bawal: 2, coal: 1 }, result: { bawalbakar: 1 } },
    udangbakar: { name: 'Udang Bakar', emoji: '🦐', ingredients: { udang: 2, coal: 1 }, result: { udangbakar: 1 } },
    pausbakar: { name: 'Paus Bakar', emoji: '🐳', ingredients: { paus: 2, coal: 1 }, result: { pausbakar: 1 } },
    kepitingbakar: { name: 'Kepiting Bakar', emoji: '🦀', ingredients: { kepiting: 2, coal: 1 }, result: { kepitingbakar: 1 } },
};
// Biaya "bahan bakar" untuk setiap kali memasak
const cookingCost = { kayu: 5, coal: 5 };
// =================================================================

module.exports = {
  prefix: "masak",
  category: "rpg",
  aliases: ["cook"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const recipeName = args[0]?.toLowerCase();
    const amount = parseInt(args[1]) || 1;

    // Jika tidak ada argumen, tampilkan daftar resep
    if (!recipeName) {
        const recipeList = Object.values(recipes).map(recipe => {
            const ingredients = Object.entries(recipe.ingredients).map(([mat, amt]) => `${amt} ${mat}`).join(', ');
            return `**${recipe.emoji} ${recipe.name}**: \n> *Bahan:* ${ingredients}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0xE67E22).setTitle("🔥 Dapur - Daftar Resep")
            .setDescription(`Gunakan \`!masak <nama_masakan> <jumlah>\`\n\n**Biaya Memasak:**\n> Kamu butuh ${cookingCost.kayu} 🪵 Kayu dan ${cookingCost.coal} 🪨 coal setiap kali memasak.\n\n${recipeList}`);
        return message.reply({ embeds: [embed] });
    }

    const recipe = recipes[recipeName];
    if (!recipe) return message.reply(`❌ Resep untuk **${recipeName}** tidak ditemukan.`);
    if (amount <= 0) return message.reply("Jumlah harus lebih dari 0.");
    
    const processingMsg = await message.reply(`🔥 Menyiapkan tungku untuk memasak **${recipe.name}**...`);

    try {
        // Pola GET -> MODIFY -> POST
        const userData = await api.getUser(authorId, authorUsername);
        if ((userData.kayu || 0) < cookingCost.kayu || (userData.coal || 0) < cookingCost.coal) {
            const kayuNeeded = Math.max(0, cookingCost.kayu - (userData.kayu || 0));
            const coalNeeded = Math.max(0, cookingCost.coal - (userData.coal || 0));
            
            const kayuPrice = shopItems['kayu']?.buyPrice || 0;
            const coalPrice = shopItems['coal']?.buyPrice || 0;

            const totalCost = (kayuNeeded * kayuPrice) + (coalNeeded * coalPrice);
            
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle("🔥 Bahan Bakar Kurang!")
                .setDescription(`Kamu kekurangan bahan bakar untuk menyalakan api:\n- Butuh **${kayuNeeded}** 🪵 Kayu\n- Butuh **${coalNeeded}** ⚫ Coal`);

            const row = new ActionRowBuilder();
            if (totalCost > 0) {
                embed.addFields({ name: "Beli Otomatis", value: `Beli semua bahan bakar yang kurang seharga **💰 ${totalCost.toLocaleString('id-ID')}** Money.` });
                row.addComponents(new ButtonBuilder().setCustomId('cook_buy_fuel').setLabel(`Beli Bahan Bakar (${totalCost.toLocaleString('id-ID')})`).setStyle(ButtonStyle.Success));
            }

            const replyMsg = await processingMsg.edit({ content: null, embeds: [embed], components: totalCost > 0 ? [row] : [] });
            
            if (totalCost === 0) return;

            const collector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
            collector.on('collect', async i => {
                if (i.user.id !== authorId) return i.reply({ content: "Tombol ini bukan untukmu!", ephemeral: true });
                await i.deferUpdate();
                collector.stop();

                try {
                    const freshUserData = await api.getUser(authorId, authorUsername);
                    if (freshUserData.money < totalCost) {
                        return replyMsg.edit({ content: `💰 Uangmu tidak cukup untuk membeli bahan bakar!`, embeds: [], components: [] });
                    }
                    freshUserData.money -= totalCost;
                    freshUserData.kayu = (freshUserData.kayu || 0) + kayuNeeded;
                    freshUserData.coal = (freshUserData.coal || 0) + coalNeeded;
                    await api.updateUser(authorId, freshUserData);
                    await replyMsg.edit({ content: `✅ Berhasil membeli bahan bakar! Coba \`!masak ${recipeName}\` lagi.`, embeds: [], components: [] });
                } catch (e) {
                    await replyMsg.edit({ content: `❌ Gagal membeli bahan: ${e.message}`, embeds: [], components: [] });
                }
            });
            return;
        }

        // Cek biaya "bahan bakar"
        if ((userData.kayu || 0) < cookingCost.kayu || (userData.coal || 0) < cookingCost.coal) {
            return processingMsg.edit(`❌ Kamu kekurangan bahan bakar! Butuh **${cookingCost.kayu} Kayu** dan **${cookingCost.coal} coal** untuk menyalakan api.`);
        }

        // Cek kecukupan bahan resep
        let missingIngredients = [];
        for (const [ingredient, requiredAmount] of Object.entries(recipe.ingredients)) {
            if ((userData[ingredient] || 0) < requiredAmount * amount) {
                missingIngredients.push(`${requiredAmount * amount - (userData[ingredient] || 0)} ${ingredient}`);
            }
        }
        if (missingIngredients.length > 0) {
            return processingMsg.edit(`❌ Bahan masakan tidak cukup! Kamu kekurangan:\n- ${missingIngredients.join('\n- ')}`);
        }

        // Kurangi bahan bakar dan bahan resep
        userData.kayu -= cookingCost.kayu;
        userData.coal -= cookingCost.coal;
        for (const [ingredient, requiredAmount] of Object.entries(recipe.ingredients)) {
            userData[ingredient] -= requiredAmount * amount;
        }

        // Tambah hasil masakan
        const [resultItem, resultAmount] = Object.entries(recipe.result)[0];
        userData[resultItem] = (userData[resultItem] || 0) + (resultAmount * amount);
        
        // Simpan ke API
        await api.updateUser(authorId, userData);

        await processingMsg.edit(`✅ Berhasil memasak **${amount} ${recipe.name} ${recipe.emoji}**!`);

    } catch (error) {
        console.error("[MASAK CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan saat memasak: ${error.message}`);
    }
  },
};