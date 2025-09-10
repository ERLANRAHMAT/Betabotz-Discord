const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { sticker5 } = require("../../lib/sticker");
const config = require("../../config");
const axios = require('axios');

const packname = config.botName 
const author = config.ownerID 
const errorStickerPath = path.join(__dirname, "../../media/sticker/emror.webp");

async function sendSticker(message, processingMsg, fileBuffer, isVideo = false) {
    const filename = isVideo ? "sticker.mp4" : "sticker.webp";
    try {
        let finalBuffer = fileBuffer;
        if (!isVideo && typeof sticker5 === 'function') {
            try {
                const processedSticker = await sticker5(fileBuffer, null, packname, author);
                if (processedSticker) finalBuffer = processedSticker;
            } catch (stickerError) {
                console.warn("[STICKER] Gagal memproses metadata, mengirim stiker asli:", stickerError);
            }
        }
        await message.reply({ files: [new AttachmentBuilder(finalBuffer, { name: filename })] });
        if (processingMsg.deletable) await processingMsg.delete().catch(() => {});
    } catch (e) {
        console.error("Gagal mengirim stiker:", e);
        if (fs.existsSync(errorStickerPath)) {
            await processingMsg.edit({ content: null, files: [new AttachmentBuilder(errorStickerPath)] });
        } else {
            await processingMsg.edit("❌ Gagal membuat stiker. Terjadi kesalahan.");
        }
    }
}

module.exports = {
  prefix: "sticker",
  category: "maker",
  aliases: ["attp", "ttp", "brat", "bratvideo", "qc", "quotely"], // qc ditambahkan
  
  async execute(message, args, client) {
    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();

    // --- Logika untuk QC (Quotely) ---
    if (command === 'qc' || command === 'quotely') {
        let targetMessage;
        let text;
        let targetUser;

        if (message.reference?.messageId) {
            targetMessage = await message.channel.messages.fetch(message.reference.messageId);
            text = args.join(" ") || targetMessage.content;
            targetUser = targetMessage.author;
        } else {
            text = args.join(" ");
            targetUser = message.author;
        }

        if (!text) return message.reply("Teks tidak boleh kosong! Reply sebuah pesan atau ketik `!qc <teks>`.");
        if (text.length > 100) return message.reply('Maksimal 100 Teks!');

        const processingMsg = await message.reply(`Membuat stiker quote untuk **${targetUser.username}**...`);
        try {
            const avatar = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
            const apiUrl = `${config.api.baseUrl}/maker/qc?apikey=${config.api.apiKey}&text=${encodeURIComponent(text)}&username=${encodeURIComponent(targetUser.username)}&avatar=${encodeURIComponent(avatar)}`;
            
            const response = await axios.post(apiUrl, null, { responseType: 'arraybuffer' });
            await sendSticker(message, processingMsg, response.data, false);
        } catch (e) {
            await processingMsg.edit(`❌ Gagal membuat stiker quote: ${e.message}`);
        }
        return;
    }

    // --- Logika untuk stiker lain (attp, ttp, dll.) ---
    let text = args.join(" ");
    if (!text && message.reference?.messageId) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        text = repliedMsg.content;
      } catch {
        return message.reply("Gagal mengambil teks dari pesan yang di-reply.");
      }
    }
    if (!text && command !== 'sticker') {
        return message.reply(`Teks tidak boleh kosong!\nContoh: \`!${command} Halo Dunia\``);
    }

    const processingMsg = await message.reply(`Membuat stiker *${command}*...`);
    let apiUrl;

    try {
        switch (command) {
            case 'attp':
                apiUrl = `https://api.betabotz.eu.org/api/maker/attp?text=${encodeURIComponent(text)}&apikey=${config.apikey_lann}`;
                const attpRes = await fetch(apiUrl);
                if (!attpRes.ok) throw new Error(`API attp gagal: ${attpRes.status}`);
                const attpBuffer = await attpRes.buffer();
                await sendSticker(message, processingMsg, attpBuffer, false);
                break;
            case 'ttp':
                apiUrl = `https://api.betabotz.eu.org/api/maker/ttp?text=${encodeURIComponent(text)}&apikey=${config.apikey_lann}`;
                const ttpRes = await fetch(apiUrl);
                if (!ttpRes.ok) throw new Error(`API ttp gagal: ${ttpRes.status}`);
                const ttpBuffer = await ttpRes.buffer();
                await sendSticker(message, processingMsg, ttpBuffer, false);
                break;
            case 'brat':
                apiUrl = `${config.api.baseUrl}/maker/brat?text=${encodeURIComponent(text)}&apikey=${config.api.apiKey}`;
                const bratRes = await axios.post(apiUrl, null, { responseType: 'arraybuffer' });
                await sendSticker(message, processingMsg, bratRes.data, false);
                break;
            case 'bratvideo':
                apiUrl = `https://api.betabotz.eu.org/api/maker/brat-video?text=${encodeURIComponent(text)}&apikey=${config.apikey_lann}`;
                const bratVidRes = await fetch(apiUrl);
                if (!bratVidRes.ok) throw new Error(`API bratvideo gagal: ${bratVidRes.status}`);
                const bratVidBuffer = await bratVidRes.buffer();
                await sendSticker(message, processingMsg, bratVidBuffer, true);
                break;
            default:
                const helpEmbed = new EmbedBuilder()
                    .setColor(0x7289DA).setTitle("🎨 Panduan Perintah Stiker")
                    .setDescription(
                        "Gunakan perintah berikut untuk membuat stiker dari teks:\n\n" +
                        "• `!attp <teks>`\nStiker teks bergerak.\n\n" +
                        "• `!ttp <teks>`\nStiker teks latar hitam.\n\n" +
                        "• `!brat <teks>`\nStiker teks template 'brat'.\n\n" +
                        "• `!bratvideo <teks>`\nVideo stiker template 'brat'.\n\n" +
                        "• `!qc <teks>` atau reply pesan\nStiker quote."
                    );
                await processingMsg.edit({ content: null, embeds: [helpEmbed] });
        }
    } catch (e) {
        console.error(`[STICKER ERROR] Perintah ${command}:`, e);
        await processingMsg.edit(`❌ Gagal membuat stiker: ${e.message}`);
    }
  },
};

