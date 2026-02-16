const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// Biaya per durability point
const REPAIR_COST = {
    armor: 10000,
    sword: 5000,
    bow: 5000,
    axe: 3000,
    pickaxe: 3000,
    fishingrod: 2000,
    katana: 10000
};

const MAX_DURABILITY = {
    armor: 50,
    sword: 40,
    bow: 40,
    axe: 40,
    pickaxe: 40,
    fishingrod: 40,
    katana: 40
};

module.exports = {
  prefix: "repair",
  category: "rpg",
  aliases: ["perbaiki"],
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const item = args[0]?.toLowerCase();

    if (!item || !REPAIR_COST[item]) {
      return message.reply("Format: `!repair <item>`. Contoh: `!repair armor`. Item: armor, sword, bow, axe, pickaxe, fishingrod, katana");
    }

    const userData = await api.getUser(authorId, authorUsername);
    const duraKey = item + "durability";
    const maxDura = MAX_DURABILITY[item];
    const currentDura = userData[duraKey] || 0;

    if (currentDura >= maxDura) {
      return message.reply(`Durability ${item} sudah penuh (${currentDura}/${maxDura}).`);
    }

    const repairAmount = maxDura - currentDura;
    const totalCost = repairAmount * REPAIR_COST[item];

    if ((userData.money || 0) < totalCost) {
      return message.reply(`💸 Uangmu tidak cukup! Biaya perbaikan penuh: **${totalCost.toLocaleString('id-ID')}** Money.`);
    }

    userData.money -= totalCost;
    userData[duraKey] = maxDura;
    await api.updateUser(authorId, userData);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle("🔧 Perbaikan Berhasil!")
      .setDescription(`Durability **${item}** kamu telah diperbaiki ke maksimal (${maxDura}).\nBiaya: **${totalCost.toLocaleString('id-ID')}** Money.`);

    await message.reply({ embeds: [embed] });
  }
};
