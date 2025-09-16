const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');

module.exports = {
  prefix: "dsql",
  category: "tools",
  aliases: ["diagramsql"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    let sqlQuery = args.join(' ');

    if (!sqlQuery && message.reference?.messageId) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        sqlQuery = repliedMsg.content;
      } catch {
        return message.reply("Gagal mengambil teks dari pesan yang di-reply.");
      }
    }

    if (!sqlQuery) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("Bantuan Perintah Diagram SQL")
            .setDescription("Gunakan perintah ini untuk mengubah query SQL menjadi diagram visual.")
            .addFields(
                { name: "Cara 1: Teks Langsung", value: "`!dsql CREATE TABLE users (...)`" },
                { name: "Cara 2: Reply Pesan", value: "Kirim pesan berisi query, lalu reply dengan `!dsql`." }
            );
        return message.reply({ embeds: [helpEmbed] });
    }

    if (sqlQuery.length > 4096) return message.reply('Query SQL terlalu panjang, maksimal 4096 karakter!');

    const processingMsg = await message.reply("📊 Membuat diagram SQL, mohon tunggu...");

    try {
        const apiUrl = `${config.api.baseUrl}/tools/sql?apikey=${config.api.apiKey}`;

        const form = new FormData();
        form.append('sql', sqlQuery);
        
        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        const attachment = new AttachmentBuilder(response.data, { name: 'sql_diagram.png' });
        
        await message.reply({
            content: "Ini diagram SQL Anda!",
            files: [attachment]
        });
        
        if (processingMsg.deletable) await processingMsg.delete().catch(() => {});

    } catch (error) {
        console.error('Error pada fitur dsql:', error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.toString() || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal membuat diagram. Penyebab: \`${errorMessage}\``);
    }
  },
};
