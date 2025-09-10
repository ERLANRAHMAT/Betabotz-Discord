const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');

module.exports = {
  prefix: "decodeqr",
  category: "tools",
  aliases: ["readqr"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
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
        return message.reply("Harap kirim gambar QR Code dengan caption `!decodeqr` atau reply sebuah gambar QR Code.");
    }
    // --- AKHIR LOGIKA BARU ---

    const processingMsg = await message.reply("🔍 Membaca QR Code, mohon tunggu...");

    try {
        const imageUrl = attachment.url;
        const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' }).then(res => res.data);

        const form = new FormData();
        form.append('image', imageBuffer, {
            filename: 'qrcode.png', 
            contentType: attachment.contentType
        });
        
        const apiUrl = `${config.api.baseUrl}/tools/decode-qrcode?apikey=${config.api.apiKey}`;

        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
        });

        const result = response.data;

        if (!result || !result.result) {
            throw new Error("Tidak dapat menemukan QR Code pada gambar atau API tidak memberikan hasil.");
        }

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("✅ QR Code Berhasil Dibaca")
            .setDescription("Berikut adalah teks atau link yang terkandung di dalam QR Code:")
            .addFields({ name: 'Isi Teks', value: result.result })
            .setFooter({ text: `Diproses untuk ${message.author.username}` })
            .setTimestamp();

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error(`[DECODEQR ERROR]:`, error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal membaca QR Code. Penyebab: \`${errorMessage}\``);
    }
  },
};

