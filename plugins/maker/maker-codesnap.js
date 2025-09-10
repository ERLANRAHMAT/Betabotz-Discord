const { AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config');

module.exports = {
  prefix: "codesnap",
  category: "tools",
  aliases: ["cs"],
  
  async execute(message, args, client) {
    if (!message.reference || !message.reference.messageId) {
        return message.reply(`Perintah ini digunakan dengan cara me-reply pesan berisi kode.\n\n*Contoh:*\n1. Kirim kodemu.\n2. Reply pesan kodemu dengan \`!codesnap\`.`);
    }

    const processingMsg = await message.reply("📸 Membuat codesnap, mohon tunggu...");

    try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);

        let codeToSnap;
        let backgroundImageBuffer = null;
        const attachment = repliedMsg.attachments.first();
        if (attachment && attachment.contentType?.startsWith('image/')) {
            codeToSnap = repliedMsg.content; 
            if (!codeToSnap) {
                return processingMsg.edit('❌ Gambar yang Anda reply tidak memiliki caption berisi kode.');
            }
            const imageResponse = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            backgroundImageBuffer = Buffer.from(imageResponse.data);
        } else if (repliedMsg.content) {
            codeToSnap = repliedMsg.content;
        } else {
            return processingMsg.edit('❌ Pesan yang Anda reply tidak berisi teks atau gambar yang valid.');
        }

        const form = new FormData();
        form.append('code', codeToSnap);

        if (backgroundImageBuffer) {
            form.append('background', backgroundImageBuffer, { filename: 'background.png' });
        }

        const params = { apikey: config.api.apiKey };
        const blurValue = parseInt(args[0]);
        if (!isNaN(blurValue) && blurValue >= 1 && blurValue <= 100) {
            params.blur = blurValue;
        }
        
        const queryString = new URLSearchParams(params).toString();
        const apiUrl = `${config.api.baseUrl}/tools/codesnap?${queryString}`;
        
        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        const resultAttachment = new AttachmentBuilder(response.data, { name: 'codesnap.png' });
        await message.reply({ files: [resultAttachment] });
        await processingMsg.delete().catch(() => {});

    } catch (error) {
        console.error('Error pada fitur codesnap:', error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.toString() || error.message || "Terjadi kesalahan.";
        await processingMsg.edit(`Gagal membuat codesnap. Penyebab: \`${errorMessage}\``);
    }
  },
};