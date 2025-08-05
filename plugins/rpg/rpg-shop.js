const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');
const config = require("../../config");

// ==================== PUSAT DATA TOKO ====================
// Untuk mengubah harga atau menambah item, cukup edit di sini!
const shopItems = {
    // Kunci harus sama dengan properti di database Anda
    limit: { name: 'Limit', emoji: '🎟️', buyPrice: 100000, sellPrice: 25000, description: 'Beli 1 limit tambahan.' },
    potion: { name: 'Potion', emoji: '🧪', buyPrice: 20000, sellPrice: 10000, description: 'Memulihkan health & stamina.' },
    diamond: { name: 'Diamond', emoji: '💎', buyPrice: 1000000, sellPrice: 1000000, description: 'Batu mulia langka.' },
    emas: { name: 'Emas', emoji: '🟡', buyPrice: 500000, sellPrice: 500000, description: 'emas.' },
    iron: { name: 'Besi', emoji: '🔩', buyPrice: 30000, sellPrice: 10000, description: 'Logam kuat untuk crafting.' },
    kayu: { name: 'Kayu', emoji: '🪵', buyPrice: 500, sellPrice: 200, description: 'Sumber daya dasar.' },
    batu: { name: 'Batu', emoji: '🪨', buyPrice: 500, sellPrice: 200, description: 'Sumber daya dasar.' },
    string: { name: 'String', emoji: '🧵', buyPrice: 1000, sellPrice: 500, description: 'Digunakan untuk mancing, dll.' },
    sampah: { name: 'Sampah', emoji: '🗑️', buyPrice: null, sellPrice: 20, description: 'Bisa dijual, tidak bisa dibeli.' },
    common: { name: 'Common Crate', emoji: '📦', buyPrice: 5000, sellPrice: 1000, description: 'Lootbox biasa.' },
    uncommon: { name: 'Uncommon Crate', emoji: '🎁', buyPrice: 15000, sellPrice: 5000, description: 'Lootbox langka.' },
    mythic: { name: 'Mythic Crate', emoji: '✨', buyPrice: 50000, sellPrice: 15000, description: 'Lootbox mitos.' },
    legendary: { name: 'Legendary Crate', emoji: '👑', buyPrice: 10000000, sellPrice: 10000000, description: 'Lootbox legendaris.' },
    coal: { name: 'Coal', emoji: '🪨', buyPrice: 1000, sellPrice: 500, description: 'Bahan bakar untuk memasak.' },
    umpan: { name: 'Umpan', emoji: '🪱', buyPrice: 1000, sellPrice: 300, description: 'Untuk memancing ikan.' },
};
// =========================================================

async function handleBuy(message, itemKey, amount) {
    const item = shopItems[itemKey];
    if (!item) return message.reply("❌ Item tidak ditemukan di toko.");
    if (!item.buyPrice) return message.reply(`❌ Kamu tidak bisa membeli **${item.name}**.`);

    const totalCost = item.buyPrice * amount;
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    try {
        const userData = await api.getUser(authorId, authorUsername);
        if (userData.money < totalCost) {
            return message.reply(`💰 Uangmu tidak cukup! Butuh **${totalCost.toLocaleString('id-ID')}** Money.`);
        }

        userData.money -= totalCost;
        userData[itemKey] = (userData[itemKey] || 0) + amount;

        await api.updateUser(authorId, userData);

        await message.reply(`✅ Berhasil membeli **${amount} ${item.name}** seharga **${totalCost.toLocaleString('id-ID')}** Money.`);
    } catch (e) {
        await message.reply(`❌ Gagal melakukan transaksi: ${e.message}`);
    }
}

async function handleSell(message, itemKey, amount) {
    const item = shopItems[itemKey];
    if (!item) return message.reply("❌ Item tidak ditemukan di inventaris.");
    if (!item.sellPrice) return message.reply(`❌ Kamu tidak bisa menjual **${item.name}**.`);

    const authorId = message.author.id;
    const authorUsername = message.author.username;

    try {
        const userData = await api.getUser(authorId, authorUsername);
        const userItemCount = userData[itemKey] || 0;

        if (userItemCount < amount) {
            return message.reply(`📦 Item **${item.name}** di inventarismu tidak cukup! Kamu hanya punya ${userItemCount}.`);
        }

        const totalEarnings = item.sellPrice * amount;
        userData[itemKey] -= amount;
        userData.money += totalEarnings;

        await api.updateUser(authorId, userData);

        await message.reply(`✅ Berhasil menjual **${amount} ${item.name}** dan mendapatkan **${totalEarnings.toLocaleString('id-ID')}** Money.`);
    } catch (e) {
        await message.reply(`❌ Gagal melakukan transaksi: ${e.message}`);
    }
}

module.exports = {
  prefix: "shop",
  category: "rpg",
  aliases: ["toko", "buy", "sell"],
  
  async execute(message, args, client) {
    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();
    
    let action, itemKey, amount;
    
    if (['buy', 'sell'].includes(command)) {
        action = command;
        itemKey = args[0]?.toLowerCase();
        amount = parseInt(args[1]) || 1;
    } else { // !shop buy item 1
        action = args[0]?.toLowerCase();
        itemKey = args[1]?.toLowerCase();
        amount = parseInt(args[2]) || 1;
    }
    
    if (!action) {
        const buyList = Object.entries(shopItems).filter(([k, v]) => v.buyPrice).map(([k, v]) => `${v.emoji} **${v.name}**: ${v.buyPrice.toLocaleString('id-ID')} Money`).join('\n');
        const sellList = Object.entries(shopItems).filter(([k, v]) => v.sellPrice).map(([k, v]) => `${v.emoji} **${v.name}**: ${v.sellPrice.toLocaleString('id-ID')} Money`).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x5865F2).setTitle("🏪 Toko RPG")
            .setDescription("Gunakan `!shop buy/sell <item> <jumlah>`")
            .addFields(
                { name: '--- Beli ---', value: buyList, inline: true },
                { name: '--- Jual ---', value: sellList, inline: true }
            );
        return message.reply({ embeds: [embed] });
    }

    if (amount <= 0) return message.reply("Jumlah harus lebih dari 0.");
    
    if (action === 'buy') {
        if (!itemKey) return message.reply("Kamu mau beli apa? Contoh: `!shop buy potion 5`");
        await handleBuy(message, itemKey, amount);
    } else if (action === 'sell') {
        if (!itemKey) return message.reply("Kamu mau jual apa? Contoh: `!shop sell sampah 10`");
        await handleSell(message, itemKey, amount);
    } else {
        message.reply("Perintah tidak valid. Gunakan `buy` atau `sell`.");
    }
  },
    shopItems: shopItems 
};