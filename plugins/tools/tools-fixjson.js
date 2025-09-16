const { AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');

module.exports = {
  prefix: "fixjson",
  category: "tools",
  aliases: ["jsonfix"],
  
  async execute(message, args, client) {
    let jsonInput = '';
    const attachment = message.attachments.first();
    if (attachment) {
        if (!attachment.name.endsWith('.json')) {
            return message.reply("❌ File yang diunggah harus berformat `.json`.");
        }
        try {
            const response = await axios.get(attachment.url);
            jsonInput = typeof response.data === 'object' ? JSON.stringify(response.data) : response.data;
        } catch (error) {
            return message.reply("Gagal membaca konten dari file yang diunggah.");
        }
    } else if (message.reference && message.reference.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            jsonInput = repliedMsg.content;
        } catch {
            return message.reply("Gagal mengambil teks dari pesan yang di-reply.");
        }
    } else {
        jsonInput = args.join(" ");
    }
    jsonInput = jsonInput.replace(/```json\n|```/g, '').trim();

    if (!jsonInput) {
        return message.reply("Masukkan JSON yang ingin diperbaiki, reply pesan, atau unggah file `.json`.");
    }

    const processingMsg = await message.reply("🛠️ Memperbaiki JSON Anda, mohon tunggu...");

    try {
        const form = new FormData();
        form.append('code', jsonInput);
             const params = { 
            apikey: config.api.apiKey,
            output: 'file' 
        };
        const queryString = new URLSearchParams(params).toString();
        const apiUrl = `${config.api.baseUrl}/tools/fix-json?${queryString}`;
        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });
        const resultAttachment = new AttachmentBuilder(response.data, { name: 'fixed.json' });
        
        await message.reply({
            content: "✅ JSON berhasil diperbaiki dan diformat!",
            files: [resultAttachment]
        });
        
        if (processingMsg.deletable) await processingMsg.delete().catch(() => {});

    } catch (error) {
        console.error(`[FIXJSON ERROR]:`, error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan.";
        await processingMsg.edit(`Gagal memperbaiki JSON. Penyebab: \`${errorMessage}\``);
    }
  },
};

