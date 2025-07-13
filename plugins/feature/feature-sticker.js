const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { sticker5 } = require("../../lib/sticker");
const config = require("../../config");

// Konfigurasi stiker
const packname = process.env.STICKER_PACKNAME || "BetaBotz";
const author = process.env.STICKER_AUTHOR || "Arteon";
const errorStickerPath = path.join(__dirname, "../../media/sticker/emror.webp");

/**
 * Fungsi inti untuk membuat stiker dari teks dan mengirimkannya.
 * @param {import('discord.js').Message} message - Objek pesan dari Discord.
 * @param {string} apiUrl - URL API untuk membuat stiker.
 * @param {boolean} isVideo - Apakah outputnya video (MP4) atau gambar (WEBP).
 */
async function createSticker(message, apiUrl, isVideo = false) {
  const filename = isVideo ? "sticker.mp4" : "sticker.webp";

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error(`API returned status ${res.status}`);
    }
    const fileBuffer = await res.buffer();

    // Untuk stiker (bukan video), kita bisa proses dengan metadata kustom
    let finalBuffer = fileBuffer;
    if (!isVideo && typeof sticker5 === 'function') {
      try {
        const processedSticker = await sticker5(fileBuffer, null, packname, author, ["🎨"]);
        if (processedSticker) finalBuffer = processedSticker;
      } catch (stickerError) {
        console.error("[STICKER] Gagal memproses dengan metadata, mengirim stiker asli:", stickerError);
      }
    }
    
    // Kirim hasilnya
    await message.reply({
      files: [new AttachmentBuilder(finalBuffer, { name: filename })],
    });

  } catch (e) {
    console.error("Gagal membuat stiker:", e);
    // Jika terjadi error, kirim stiker error jika ada
    if (fs.existsSync(errorStickerPath)) {
      await message.reply({
        files: [new AttachmentBuilder(errorStickerPath)],
      });
    } else {
      await message.reply("❌ Gagal membuat stiker. Terjadi kesalahan.");
    }
  }
}

/**
 * Fungsi untuk membuat embed bantuan.
 */
function createHelpEmbed() {
    return new EmbedBuilder()
      .setColor(0x7289DA)
      .setTitle("🎨 Panduan Perintah Stiker Teks")
      .setDescription(
        "Berikut adalah perintah yang tersedia untuk membuat stiker dari teks:\n\n" +
        "• `!attp <teks>`\nMembuat stiker teks bergerak dengan latar belakang gradien.\n\n" +
        "• `!ttp <teks>`\nMembuat stiker teks dengan latar belakang hitam.\n\n" +
        "• `!brat <teks>`\nMembuat stiker teks di atas template 'brat'.\n\n" +
        "• `!bratvideo <teks>`\nMembuat video stiker di atas template 'brat'."
      )
      .setFooter({ text: "Anda juga bisa me-reply pesan untuk mengambil teksnya." });
}


module.exports = {
  // Perintah utama, akan menampilkan bantuan jika dipanggil (!sticker)
  prefix: "sticker",
  category: "maker",

  /**
   * Fungsi execute utama sekarang berfungsi sebagai perintah bantuan.
   * @param {import('discord.js').Message} message
   */
  execute: async (message) => {
    await message.reply({ embeds: [createHelpEmbed()] });
  },

  // Sub-perintah yang akan didaftarkan secara otomatis oleh index.js
  subCommands: {
    attp: {
      aliases: [],
      /** @param {import('discord.js').Message} message */
      handler: async (message, args, client) => {
        const text = args.join(" ") || (message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).content : "");
        if (!text) return message.reply("Contoh: `!attp Halo Dunia` atau reply pesan.");

        const apiUrl = `https://api.betabotz.eu.org/api/maker/attp?text=${encodeURIComponent(text.substring(0, 150))}&apikey=${config.apikey_lann}`;
        await createSticker(message, apiUrl, false);
      }
    },
    ttp: {
      aliases: [],
      /** @param {import('discord.js').Message} message */
      handler: async (message, args, client) => {
        const text = args.join(" ") || (message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).content : "");
        if (!text) return message.reply("Contoh: `!ttp Halo Dunia` atau reply pesan.");
        
        const apiUrl = `https://api.betabotz.eu.org/api/maker/ttp?text=${encodeURIComponent(text.substring(0, 150))}&apikey=${config.apikey_lann}`;
        await createSticker(message, apiUrl, false);
      }
    },
    brat: {
      aliases: [],
      /** @param {import('discord.js').Message} message */
      handler: async (message, args, client) => {
        const text = args.join(" ") || (message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).content : "");
        if (!text) return message.reply("Contoh: `!brat Teks Atas | Teks Bawah` atau reply pesan.");
        
        const apiUrl = `https://api.betabotz.eu.org/api/maker/brat?text=${encodeURIComponent(text.substring(0, 150))}&apikey=${config.apikey_lann}`;
        await createSticker(message, apiUrl, false);
      }
    },
    bratvideo: {
      aliases: [],
      /** @param {import('discord.js').Message} message */
      handler: async (message, args, client) => {
        const text = args.join(" ") || (message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).content : "");
        if (!text) return message.reply("Contoh: `!bratvideo Teks` atau reply pesan.");
        
        const apiUrl = `https://api.betabotz.eu.org/api/maker/brat-video?text=${encodeURIComponent(text.substring(0, 150))}&apikey=${config.apikey_lann}`;
        await createSticker(message, apiUrl, true);
      }
    }
  }
};