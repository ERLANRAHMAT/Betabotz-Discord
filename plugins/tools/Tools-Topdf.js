const { AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');
const path = require('path');

const WORD_MIME_TYPES = [
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
];

module.exports = {
  prefix: "topdf",
  category: "tools",
  aliases: ["convertpdf"],
  
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
            return message.reply("Gagal mengambil file dari pesan yang di-reply.");
        }
    }
    if (!attachment) {
        return message.reply("Harap kirim file dokumen (.doc/.docx) dengan caption `!topdf` atau reply sebuah pesan yang berisi file dokumen.");
    }
    if (!WORD_MIME_TYPES.includes(attachment.contentType)) {
        return message.reply("❌ File yang Anda kirim bukan dokumen Word (.doc atau .docx) yang valid.");
    }

    const processingMsg = await message.reply("🔄 Mengonversi dokumen ke PDF, mohon tunggu...");

    try {
        const documentUrl = attachment.url;
        const documentBuffer = await axios.get(documentUrl, { responseType: 'arraybuffer' }).then(res => res.data);

        const form = new FormData();
        form.append('document', documentBuffer, {
            filename: attachment.name,
            contentType: attachment.contentType
        });
        
        const apiUrl = `${config.api.baseUrl}/tools/convert?apikey=${config.api.apiKey}`;

        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        const resultAttachment = new AttachmentBuilder(response.data, { name: `${path.parse(attachment.name).name}.pdf` });
        
        await message.reply({ 
            content: "✅ Dokumen berhasil dikonversi ke PDF!",
            files: [resultAttachment] 
        });
        if (processingMsg.deletable) await processingMsg.delete().catch(() => {});

    } catch (error) {
        console.error(`[TOPDF ERROR]:`, error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.toString() || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal mengonversi dokumen. Penyebab: \`${errorMessage}\``);
    }
  },
};

