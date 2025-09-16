const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');
const path = require('path');

module.exports = {
  prefix: "csvtojson",
  category: "tools",
  aliases: ["csvjson"],
  
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
    if (!attachment || !attachment.name.toLowerCase().endsWith('.csv')) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("📄 Bantuan Konversi CSV ke JSON")
            .setDescription("Perintah ini digunakan untuk mengubah file CSV menjadi format JSON.\n\n**Cara Penggunaan:**\n1. Kirim file `.csv` dengan caption `!csvtojson`.\n2. Reply sebuah pesan yang berisi file `.csv` dengan `!csvtojson`.");
        return message.reply({ embeds: [helpEmbed] });
    }

    const processingMsg = await message.reply("🔄 Mengonversi file CSV ke JSON, mohon tunggu...");

    try {
        const documentUrl = attachment.url;
        const documentBuffer = await axios.get(documentUrl, { responseType: 'arraybuffer' }).then(res => res.data);

        const form = new FormData();
        form.append('csvfile', documentBuffer, {
            filename: attachment.name,
            contentType: 'text/csv'
        });
        
        const apiUrl = `${config.api.baseUrl}/tools/csv-to-json?apikey=${config.api.apiKey}`;

        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer' 
        });
        const originalFileName = path.parse(attachment.name).name;
        const resultAttachment = new AttachmentBuilder(response.data, { name: `${originalFileName}.json` });
        
        await message.reply({ 
            content: "✅ File CSV berhasil dikonversi ke JSON!",
            files: [resultAttachment] 
        });
        
        if (processingMsg.deletable) await processingMsg.delete().catch(() => {});

    } catch (error) {
        console.error(`[CSVTOJSON ERROR]:`, error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.toString() || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal mengonversi file. Penyebab: \`${errorMessage}\``);
    }
  },
};
