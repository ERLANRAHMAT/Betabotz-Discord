const { EmbedBuilder } = require('discord.js');

module.exports = {
  prefix: "say",
  category: "tools",
  aliases: ["echo", "ucap"], // Menambahkan alias yang umum
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const textToSay = args.join(" ");

    if (!textToSay) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("Bantuan Perintah Say")
            .setDescription("Gunakan perintah ini untuk membuat bot mengulang pesan yang Anda ketik.")
            .addFields({ name: "Contoh Penggunaan", value: "`!say Halo semuanya!`" });
        return message.reply({ embeds: [helpEmbed] });
    }

    if (message.deletable) {
        await message.delete().catch(err => {
            console.error("Gagal menghapus pesan:", err);
        });
    }

    await message.channel.send(textToSay);
  },
};