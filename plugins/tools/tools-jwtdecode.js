const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');

module.exports = {
  prefix: "jwtdecode",
  category: "tools",
  aliases: ["decodedjwt", "jwt"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    let jwtToken = args.join(" ");
    if (!jwtToken && message.reference?.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            jwtToken = repliedMsg.content;
        } catch {
            return message.reply("Gagal mengambil teks dari pesan yang di-reply.");
        }
    }

    if (!jwtToken) {
        return message.reply("Masukkan token JWT yang ingin di-decode, atau reply pesan yang berisi token.");
    }

    const processingMsg = await message.reply("🔍 Mendekode token JWT, mohon tunggu...");

    try {
        const form = new FormData();
        form.append('jwt', jwtToken.trim());
        
        const apiUrl = `${config.api.baseUrl}/tools/jwt-decode?apikey=${config.api.apiKey}`;

        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
        });
        const result = response.data;
        if (!result || typeof result.header !== 'object' || typeof result.payload !== 'object') {
            throw new Error("API tidak mengembalikan hasil decode yang valid.");
        }
        const headerString = JSON.stringify(result.header, null, 2);
        const payloadString = JSON.stringify(result.payload, null, 2);

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("✅ JWT Berhasil Di-decode")
            .addFields(
                { name: 'Header', value: "```json\n" + headerString + "\n```" },
                { name: 'Payload', value: "```json\n" + payloadString + "\n```" }
            )
            .setFooter({ text: `Diproses untuk ${message.author.username}` })
            .setTimestamp();

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error(`[JWTDECODE ERROR]:`, error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal mendekode token. Penyebab: \`${errorMessage}\``);
    }
  },
};

