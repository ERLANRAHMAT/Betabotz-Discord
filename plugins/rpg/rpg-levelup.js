const { EmbedBuilder } = require('discord.js');
const levelHandler = require('../../level_handler.js');

module.exports = {
  prefix: "levelup",
  category: "rpg",
  aliases: ["lvlup", "lvl"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    
    const processingMsg = await message.reply("✨ Memeriksa status EXP dan level...");

    try {
        const result = await levelHandler.attemptLevelUp(authorId, authorUsername);

        if (result.leveledUp) {
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle("🎉 LEVEL UP!")
                .setAuthor({ name: authorUsername, iconURL: message.author.displayAvatarURL() })
                .setDescription(`Selamat, kamu telah naik dari **Level ${result.oldLevel}** ke **Level ${result.newLevel}**!`);
            
            await processingMsg.edit({ content: null, embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle("📊 Status Level")
                .setAuthor({ name: authorUsername, iconURL: message.author.displayAvatarURL() })
                .setDescription(`EXP kamu belum cukup untuk naik level.`)
                .addFields({
                    name: `Butuh ${result.expNeeded.toLocaleString('id-ID')} XP lagi`,
                    value: `(Saat ini: ${result.currentExp.toLocaleString('id-ID')} / ${result.requiredExp.toLocaleString('id-ID')} XP)`
                });

            await processingMsg.edit({ content: null, embeds: [embed] });
        }
    } catch (error) {
        await processingMsg.edit(`❌ Terjadi kesalahan saat mencoba menaikkan level: ${error.message}`);
    }
  },
};