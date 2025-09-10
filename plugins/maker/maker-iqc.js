const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.js');

module.exports = {
  prefix: "iqc",
  category: "maker",
  aliases: ["imagequote"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    let quoteText = args.join(" ");
    if (!quoteText && message.reference?.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            quoteText = repliedMsg.content;
        } catch {
            return message.reply("Gagal mengambil teks dari pesan yang di-reply.");
        }
    }

    if (!quoteText) {
        return message.reply("Masukkan teks atau reply sebuah pesan.\n\n*Contoh:*\n`!iqc Kata-kata mutiara`");
    }

    if (quoteText.length > 500) {
        return message.reply('Teks terlalu panjang, maksimal 500 karakter!');
    }

    const processingMsg = await message.reply("🎨 Membuat gambar kutipan...");

    try {
        const apiUrl = `${config.api.baseUrl}/maker/iqc?apikey=${config.api.apiKey}&text=${encodeURIComponent(quoteText)}`;

        const response = await axios.get(apiUrl, {
            responseType: 'arraybuffer'
        });
        
        const imageBuffer = response.data;

        const attachment = new AttachmentBuilder(imageBuffer, { name: 'quote.png' });

        await message.reply({ 
            content: `Ini kutipan dari ${message.author}:`,
            files: [attachment] 
        });
        
        if (processingMsg.deletable) await processingMsg.delete().catch(() => {});

    } catch (error) {
        console.error('Error pada fitur iqc:', error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.toString() || error.message || "Terjadi kesalahan.";
        await processingMsg.edit(`Gagal membuat gambar kutipan. Penyebab: \`${errorMessage}\``);
    }
  },
};
