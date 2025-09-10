const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');

module.exports = {
  prefix: "ocr",
  category: "tools",
  aliases: ["totext"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    let attachment;
    if (message.attachments.size > 0) {
        attachment = message.attachments.first();
    } else if (message.reference && message.reference.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            attachment = repliedMsg.attachments.first();
        } catch (error) {
            return message.reply("Gagal mengambil gambar dari pesan yang di-reply.");
        }
    }

    if (!attachment || !attachment.contentType?.startsWith('image/')) {
        return message.reply("Harap kirim gambar dengan caption `!ocr` atau reply sebuah gambar untuk membaca teksnya.");
    }
    const processingMsg = await message.reply("🔍 Membaca teks pada gambar, mohon tunggu...");

    try {
        const imageUrl = attachment.url;
        const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' }).then(res => res.data);

        const form = new FormData();
        form.append('image', imageBuffer, {
            filename: 'ocr_image.png', 
            contentType: attachment.contentType
        });
        
        const apiUrl = `${config.api.baseUrl}/tools/ocr?apikey=${config.api.apiKey}`;

        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
        });

        const result = response.data;

        if (!result || !result.text) {
            throw new Error("API tidak mengembalikan teks yang dapat dibaca.");
        }

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("📄 Hasil OCR (Teks dari Gambar)")
            .setDescription("```\n" + result.text + "\n```")
            .setFooter({ text: `Diproses untuk ${message.author.username}` })
            .setTimestamp();

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error(`[OCR ERROR]:`, error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal membaca teks dari gambar. Penyebab: \`${errorMessage}\``);
    }
  },
};

