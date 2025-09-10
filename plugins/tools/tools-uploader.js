const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');

module.exports = {
  prefix: "tourl",
  category: "tools",
  aliases: ["upload"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    let attachment;
    let repliedMsg = null;
    if (message.attachments.size > 0) {
        attachment = message.attachments.first();
    } else if (message.reference && message.reference.messageId) {
        try {
            repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            attachment = repliedMsg.attachments.first();
        } catch (error) {
            return message.reply("Gagal mengambil gambar dari pesan yang di-reply.");
        }
    }

    // Jika tidak ada gambar sama sekali
    if (!attachment || !attachment.contentType?.startsWith('image/')) {
        return message.reply("Harap kirim gambar dengan caption `!tourl` atau reply sebuah gambar.");
    }

    const processingMsg = await message.reply("📤 Mengunggah gambar, mohon tunggu...");

    try {
        // Cek batas ukuran file 5MB
        const fileSizeLimit = 5 * 1024 * 1024; 
        if (attachment.size > fileSizeLimit) {
            return processingMsg.edit(`❌ Ukuran gambar melebihi batas 5MB.`);
        }
        const imageUrl = attachment.url;
        const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' }).then(res => res.data);
        const form = new FormData();
        form.append('image', imageBuffer, {
            filename: attachment.name,
            contentType: attachment.contentType
        });
        
        const apiUrl = `${config.api.baseUrl}/features/upload?apikey=${config.api.apiKey}`;
        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
        });

        const result = response.data;

        if (!result || !result.url) {
            throw new Error("API tidak mengembalikan URL yang valid.");
        }
      
        const link = result.url;
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("✅ Gambar Berhasil Diunggah")
            .setDescription("Gambar Anda telah berhasil diunggah dan sekarang memiliki link publik.")
            .addFields({ name: 'URL Publik', value: `${link}` })
            .setImage(link) 
            .setFooter({ text: `Diunggah oleh ${message.author.username}` })
            .setTimestamp();

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error(`[TOURL ERROR]:`, error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal mengunggah gambar. Penyebab: \`${errorMessage}\``);
    }
  },
};

