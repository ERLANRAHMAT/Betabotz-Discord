const { EmbedBuilder } = require('discord.js');

module.exports = {
  prefix: "dadu",
  category: "fun",
  aliases: ["dice", "dadu", "random"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    let min = 1;
    let max = 6; // Default dadu 6 sisi

    const arg1 = parseInt(args[0]);
    const arg2 = parseInt(args[1]);

    // Logika untuk menentukan rentang berdasarkan argumen
    if (!isNaN(arg1) && !isNaN(arg2)) {
        // Kasus: !roll <min> <maks>
        min = Math.min(arg1, arg2);
        max = Math.max(arg1, arg2);
    } else if (!isNaN(arg1)) {
        // Kasus: !roll <maks>
        max = arg1;
    } else if (args.length > 0) {
        // Kasus: Argumen tidak valid
        return message.reply("❗ Argumen tidak valid. Harap masukkan angka. Contoh: `!roll 100` atau `!roll 50 100`");
    }

    // Pastikan rentang valid
    if (min >= max) {
        return message.reply("❗ Angka maksimal harus lebih besar dari angka minimal.");
    }

    // Hasilkan angka acak
    const result = Math.floor(Math.random() * (max - min + 1)) + min;

    // Buat embed untuk menampilkan hasil
    const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle("🎲 Hasil Pengocokan Dadu")
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        .addFields(
            { name: 'Rentang', value: `\`${min}\` - \`${max}\``, inline: true },
            { name: 'Hasil', value: `**${result}**`, inline: true }
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};