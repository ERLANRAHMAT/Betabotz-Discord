const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.js');

module.exports = {
  prefix: "obfuscate",
  category: "tools",
  aliases: ["obfus"],
  
  async execute(message, args, client) {
    let codeToObfuscate = args.join(" ");
    if (!codeToObfuscate && message.reference?.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            codeToObfuscate = repliedMsg.content;
        } catch {
            return message.reply("Gagal mengambil teks dari pesan yang di-reply.");
        }
    }

    if (!codeToObfuscate) {
        return message.reply("Masukkan kode yang ingin di-obfuscate, atau reply pesan yang berisi kode.");
    }

    const processingMsg = await message.reply("🔒 Mengamankan kodemu, mohon tunggu...");

    try {
        const apiUrl = `${config.api.baseUrl}/tools/obfuscate?apikey=${config.api.apiKey}`;
        
        const response = await axios.post(
            apiUrl, 
            { code: codeToObfuscate }, 

        );

        const result = response.data;
        if (!result.status || !result.result) {
            throw new Error(result.message || "API tidak memberikan hasil yang valid.");
        }
                const attachment = new AttachmentBuilder(Buffer.from(result.result, 'utf-8'), { name: 'obfuscated_code.js' });

        await message.reply({
            content: "✅ Kode berhasil di-obfuscate!",
            files: [attachment]
        });

        if (processingMsg.deletable) await processingMsg.delete().catch(() => {});

    } catch (error) {
        console.error("[OBFUSCATE CMD ERROR]", error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan.";
        await processingMsg.edit(`❌ Gagal: ${errorMessage}`);
    }
  },
};
