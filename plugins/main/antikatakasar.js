const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const antiBadwordManager = require('../antiBadwordManager');

module.exports = {
  prefix: "antibadword",
  category: "moderation",
  aliases: ["abw"],
  
  async execute(message, args, client) {
    // Hanya admin server yang bisa menggunakan perintah ini
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("❌ Anda harus memiliki izin 'Manage Server' untuk menggunakan perintah ini.");
    }

    const action = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    if (action === 'on') {
        antiBadwordManager.enable(guildId);
        await message.reply("✅ Fitur Anti-Kata Kasar telah **diaktifkan** untuk server ini.");
    } else if (action === 'off') {
        antiBadwordManager.disable(guildId);
        await message.reply("☑️ Fitur Anti-Kata Kasar telah **dinonaktifkan** untuk server ini.");
    } else {
        const status = antiBadwordManager.enabledGuilds.has(guildId) ? "🟢 Aktif" : "🔴 Tidak Aktif";
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("Pengaturan Fitur Anti-Kata Kasar")
            .setDescription(`Status saat ini untuk server ini: **${status}**`)
            .addFields(
                { name: "`!antikatakasar on`", value: "Untuk mengaktifkan fitur." },
                { name: "`!antikatakasar off`", value: "Untuk menonaktifkan fitur." }
            );
        await message.reply({ embeds: [helpEmbed] });
    }
  },
};