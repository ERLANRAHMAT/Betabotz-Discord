const { AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');

module.exports = {
  prefix: "filterid",
  category: "maker",
  aliases: [],
  
  async execute(message, args, client) {
    let attachment;

    // --- LOGIKA BARU: Cek gambar di pesan saat ini atau di reply ---
    if (message.attachments.size > 0) {
        // Prioritaskan gambar yang dikirim bersamaan dengan perintah
        attachment = message.attachments.first();
    } else if (message.reference && message.reference.messageId) {
        // Jika tidak ada, coba cari di pesan yang di-reply
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            attachment = repliedMsg.attachments.first();
        } catch (error) {
            return message.reply("Gagal mengambil gambar dari pesan yang di-reply.");
        }
    }

    // Jika tidak ada gambar sama sekali di kedua tempat
    if (!attachment || !attachment.contentType?.startsWith('image/')) {
        return message.reply("Harap kirim gambar dengan caption `!filterid` atau reply sebuah gambar.");
    }
    // --- AKHIR LOGIKA BARU ---

    const processingMsg = await message.reply("🎨 Menerapkan filter ID Viral, mohon tunggu...");

    try {
        const imageUrl = attachment.url;
        const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' }).then(res => res.data);

        const form = new FormData();
        form.append('image', imageBuffer, {
            filename: 'image.png',
            contentType: attachment.contentType
        });
        
        const apiUrl = `${config.api.baseUrl}/maker/Idviral1?apikey=${config.api.apiKey}`;

        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        const resultAttachment = new AttachmentBuilder(response.data, { name: 'filterid.png' });
        await message.reply({ files: [resultAttachment] });
        if (processingMsg.deletable) await processingMsg.delete().catch(() => {});

    } catch (error) {
        console.error(`[FILTERID ERROR]:`, error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.toString() || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal menerapkan filter. Penyebab: \`${errorMessage}\``);
    }
  },
};

