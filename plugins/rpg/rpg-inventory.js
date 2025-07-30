const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// --- Lookup Tables untuk Peralatan ---
// Ini membuat kode lebih rapi daripada if/else yang panjang
const EQUIPMENT_NAMES = {
    armor: ['Tidak Punya', 'Leather Armor', 'Iron Armor', 'Gold Armor', 'Diamond Armor', 'Emerald Armor', 'Crystal Armor', 'Obsidian Armor', 'Netherite Armor', 'Wither Armor', 'Dragon Armor', 'Hacker Armor', 'GOD Armor'],
    sword: ['Tidak Punya', 'Wooden Sword', 'Iron Sword', 'Gold Sword', 'Diamond Sword', 'Netherite Sword', 'Crystal Sword', 'Obsidian Sword', 'Netherite Sword', 'Wither Sword', 'Dragon Sword', 'Hacker Sword', 'GOD Sword'],
    fishingrod: ['Tidak Punya', 'Wood FishingRod', 'Iron FishingRod', 'Gold FishingRod', 'Diamond FishingRod', 'Netherite FishingRod', 'Crystal FishingRod', 'Obsidian FishingRod', 'Netherite FishingRod', 'Wither FishingRod', 'Dragon FishingRod', 'Hacker FishingRod', 'GOD FishingRod'],
    pickaxe: ['Tidak Punya', 'Wood Pickaxe', 'Iron Pickaxe', 'Gold Pickaxe', 'Diamond Pickaxe', 'Netherite Pickaxe', 'Crystal Pickaxe', 'Obsidian Pickaxe', 'Netherite Pickaxe', 'Wither Pickaxe', 'Dragon Pickaxe', 'Hacker Pickaxe', 'GOD Pickaxe'],
    katana: ['Tidak Punya', 'Wood Katana', 'Iron Katana', 'Gold Katana', 'Diamond Katana', 'Netherite Katana', 'Crystal Katana', 'Obsidian Katana', 'Netherite Katana', 'Wither Katana', 'Dragon Katana', 'Hacker Katana', 'GOD Katana'],
    axe: ['Tidak Punya', 'Wood Axe', 'Iron Axe', 'Gold Axe', 'Diamond Axe', 'Netherite Axe', 'Crystal Axe', 'Obsidian Axe', 'Netherite Axe', 'Wither Axe', 'Dragon Axe', 'Hacker Axe', 'GOD Axe'],
    bow: ['Tidak Punya', 'Wood Bow', 'Iron Bow', 'Gold Bow', 'Diamond Bow', 'Netherite Bow', 'Crystal Bow', 'Obsidian Bow', 'Netherite Bow', 'Wither Bow', 'Dragon Bow', 'Hacker Bow', 'GOD Bow']
};

function getEquipmentName(type, level) {
    return EQUIPMENT_NAMES[type]?.[level] || 'Tidak Diketahui';
}
// ---

module.exports = {
  prefix: "inventory",
  category: "rpg",
  aliases: ["inv", "stats"],
  
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first() || message.author;
    const processingMsg = await message.reply(`🎒 Membuka inventaris & profil milik **${targetUser.username}**...`);

    try {
        const userData = await api.getUser(targetUser.id, targetUser.username);

        // Bagian Informasi Dasar
        const infoText = 
            `**Peran:** ${userData.role || 'Newbie'}\n` +
            `**Level:** ${userData.rpg?.level || 1}\n` +
            `**XP:** ${(userData.rpg?.exp || 0).toLocaleString('id-ID')}\n` +
            `**Money:** 💰 ${(userData.money || 0).toLocaleString('id-ID')}\n` +
            `**Limit:** 🎟️ ${(userData.limit || 0)}`;

        // Bagian Status
        const statusText = 
            `**Health:** ❤️ ${userData.health || 100}\n` +
            `**Stamina:** ⚡ ${userData.stamina || 100}\n` +
            `**Mana:** 💧 ${userData.rpg?.mana || 50}`;
        
        // Bagian Tas Ransel
        const backpackText = 
            `**Diamond:** 💎 ${(userData.diamond || 0)}\n` +
            `**Emas:** 🪙 ${(userData.emas || 0)}\n` +
            `**Besi:** 🔩 ${(userData.iron || 0)}\n` +
            `**Kayu:** 🪵 ${(userData.kayu || 0)}\n` +
            `**Batu:** 🪨 ${(userData.batu || 0)}\n` +
            `**Potion:** 🧪 ${(userData.potion || 0)}`;

        // Bagian Peralatan & Durability
        const equipmentText =
            `**Armor:** ${getEquipmentName('armor', userData.armor)} (${userData.armordurability || 0})\n` +
            `**Pedang:** ${getEquipmentName('sword', userData.sword)} (${userData.sworddurability || 0})\n` +
            `**Kapak:** ${getEquipmentName('axe', userData.axe)} (${userData.axedurability || 0})\n` +
            `**Pickaxe:** ${getEquipmentName('pickaxe', userData.pickaxe)} (${userData.pickaxedurability || 0})\n` +
            `**Pancingan:** ${getEquipmentName('fishingrod', userData.fishingrod)} (${userData.fishingroddurability || 0})`;
            
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Profil RPG: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '👤 Informasi Dasar', value: infoText, inline: true },
                { name: '📊 Status', value: statusText, inline: true },
                { name: '🎒 Tas Ransel', value: backpackText, inline: false },
                { name: '⚔️ Peralatan (Durability)', value: equipmentText, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Data diambil dari database RPG Anda' });
        
        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error("[INVENTORY CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan saat mengambil data profil: ${error.message}`);
    }
  },
};