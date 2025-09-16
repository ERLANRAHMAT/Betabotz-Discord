const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');

module.exports = {
  prefix: "favicon",
  category: "tools",
  aliases: ["fav"],
  
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
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("🖼️ Bantuan Favicon Generator")
            .setDescription("Kirim atau reply sebuah gambar dengan perintah ini untuk membuat favicon.\n\n**Cara Penggunaan:**\n1. `!favicon` (sambil mengirim gambar di caption)\n2. `!favicon` (sambil me-reply gambar)\n3. `!favicon 16,32,192` (untuk menentukan ukuran custom)")
            .setFooter({ text: "Ukuran maksimal per dimensi adalah 512px." });
        return message.reply({ embeds: [helpEmbed] });
    }
    const processingMsg = await message.reply("⚙️ Membuat favicon, mohon tunggu...");

    try {
        const imageBuffer = await axios.get(attachment.url, { responseType: 'arraybuffer' }).then(res => res.data);
        const form = new FormData();
        form.append('image', imageBuffer, { filename: attachment.name, contentType: attachment.contentType });

        const params = { apikey: config.api.apiKey };
        const sizes = args[0];

        if (sizes) {
            const sizeArray = sizes.split(',');
            for (const size of sizeArray) {
                const num = parseInt(size);
                if (isNaN(num) || num <= 0 || num > 512) {
                    return processingMsg.edit(`❌ Ukuran tidak valid: \`${size}\`. Ukuran harus berupa angka antara 1 dan 512.`);
                }
            }
            params.sizes = sizes;
        }
        
        const queryString = new URLSearchParams(params).toString();
        const apiUrl = `${config.api.baseUrl}/tools/favicon-generator?${queryString}`;

        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        const resultAttachment = new AttachmentBuilder(response.data, { name: 'favicons.zip' });
        
        await message.reply({ 
            content: "✅ Favicon Anda berhasil dibuat dan dikemas dalam file .zip!",
            files: [resultAttachment] 
        });
        
        if (processingMsg.deletable) await processingMsg.delete().catch(() => {});

    } catch (error) {
        console.error(`[FAVICON ERROR]:`, error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal membuat favicon. Penyebab: \`${errorMessage}\``);
    }
  },
};
