const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.js');

module.exports = {
  prefix: "qrcode",
  category: "tools",
  aliases: ["qr"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const textToEncode = args.join(" ");

    if (!textToEncode) {
        return message.reply("Masukkan teks atau URL yang ingin dijadikan QR code!\nContoh: `!qrcode https://api.danafxc.my.id`");
    }

    const processingMsg = await message.reply("⏳ Sedang membuat QR Code, mohon tunggu...");

    try {
        const apiUrl = `${config.api.baseUrl}/tools/qrcode?apikey=${config.api.apiKey}&url=${encodeURIComponent(textToEncode)}`;
        const response = await axios.post(apiUrl, null, {
            responseType: 'arraybuffer'
        });
        
        const imageBuffer = response.data;

        const attachment = new AttachmentBuilder(imageBuffer, { name: 'qrcode.png' });
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("✅ QR Code Berhasil Dibuat")
            .setDescription(`Ini adalah QR Code untuk teks:\n\`\`\`${textToEncode}\`\`\``)
            .setImage('attachment://qrcode.png') // Menampilkan gambar dari attachment
            .setTimestamp()
            .setFooter({ text: `Diminta oleh ${message.author.username}` });

        await processingMsg.edit({ content: null, embeds: [embed], files: [attachment] });

    } catch (error) {
        console.error('Error saat membuat QR Code:', error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.toString() || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal membuat QR Code. Penyebab: \`${errorMessage}\``);
    }
  },
};
