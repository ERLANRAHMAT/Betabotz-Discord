const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');
const config = require('../../config.js');


const transferableItems = {
    money: { name: 'Money', emoji: '💰' },
    limit: { name: 'Limit', emoji: '🎟️' },
    atm: { name: 'Tabungan (ATM)', emoji: '💳' },
    potion: { name: 'Potion', emoji: '🧪' },
    sampah: { name: 'Sampah', emoji: '🗑️' },
    diamond: { name: 'Diamond', emoji: '💎' },
    common: { name: 'Common Crate', emoji: '📦' },
    uncommon: { name: 'Uncommon Crate', emoji: '🎁' },
    mythic: { name: 'Mythic Crate', emoji: '✨' },
    legendary: { name: 'Legendary Crate', emoji: '👑' },
    string: { name: 'String', emoji: '🕸️' },
    kayu: { name: 'Kayu', emoji: '🪵' },
    batu: { name: 'Batu', emoji: '🪨' },
    iron: { name: 'Besi', emoji: '🔩' }
};

module.exports = {
  prefix: "transfer",
  category: "economy",
  aliases: ["tf"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    const itemKey = args[0]?.toLowerCase();
    const amount = parseInt(args[1]);
    const targetUser = message.mentions.users.first();

    if (!itemKey || isNaN(amount) || !targetUser) {
        const itemList = Object.values(transferableItems).map(item => `${item.emoji} ${item.name}`).join('\n');
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("💸 Bantuan Perintah Transfer")
            .setDescription("Gunakan format: `!transfer <item> <jumlah> @user`\nContoh: `!transfer money 1000 @user`")
            .addFields({ name: "Item yang Bisa Ditransfer:", value: itemList });
        return message.reply({ embeds: [helpEmbed] });
    }
        const item = transferableItems[itemKey];
    if (!item) return message.reply(`❌ Item **${itemKey}** tidak bisa ditransfer.`);
    if (amount <= 0) return message.reply("Jumlah transfer harus lebih dari 0.");
    if (targetUser.id === authorId) return message.reply("Tidak bisa mentransfer ke diri sendiri!");
    if (targetUser.bot) return message.reply("Tidak bisa mentransfer ke bot!");

    const processingMsg = await message.reply(`✈️ Memproses transfer **${amount.toLocaleString('id-ID')} ${item.name}** ke **${targetUser.username}**...`);

    try {

        const [senderData, receiverData] = await Promise.all([
            api.getUser(authorId, authorUsername),
            api.getUser(targetUser.id, targetUser.username)
        ]);

        const senderItemCount = senderData[itemKey] || 0;
        if (senderItemCount < amount) {
            return processingMsg.edit(`❌ Gagal! **${item.name}** milikmu tidak cukup untuk ditransfer. Kamu hanya punya ${senderItemCount}.`);
        }

        senderData[itemKey] -= amount;
        receiverData[itemKey] = (receiverData[itemKey] || 0) + amount;
        await Promise.all([
            api.updateUser(authorId, senderData),
            api.updateUser(targetUser.id, receiverData)
        ]);

        await processingMsg.edit(`✅ Berhasil mentransfer **${amount.toLocaleString('id-ID')} ${item.name} ${item.emoji}** dari ${message.author} ke ${targetUser}!`);

    } catch (error) {
        console.error("[TRANSFER CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan saat memproses transfer: ${error.message}`);
    }
  },
};