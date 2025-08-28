const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  prefix: "say",
  category: "tools",
  aliases: ["echo", "ucap"], // Menambahkan alias yang umum
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    // Validasi izin
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("Anda tidak memiliki izin untuk menggunakan perintah ini.");
    }

    const textToSay = args.join(" ");

    if (!textToSay) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("Bantuan Perintah Say")
            .setDescription("Gunakan perintah ini untuk membuat bot mengulang pesan yang Anda ketik.")
            .addFields({ name: "Contoh Penggunaan", value: "`!say Halo semuanya!`" });
        return message.reply({ embeds: [helpEmbed] });
    }

    // Opsi untuk mengirim pesan sebagai embed
    const isEmbed = textToSay.startsWith("--embed");
    const content = isEmbed ? textToSay.replace("--embed", "").trim() : textToSay;

    if (message.deletable) {
        await message.delete().catch(err => {
            console.error("Gagal menghapus pesan:", err);
        });
    }

    if (isEmbed) {
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setDescription(content);
      await message.channel.send({ embeds: [embed] });
    } else {
      await message.channel.send(content);
    }
  },
};