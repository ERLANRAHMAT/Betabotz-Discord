const { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { sticker5 } = require("../../lib/sticker"); // Asumsi file ini ada
const config = require("../../config");

const packname = config.botName;
const author = config.ownerID;
const errorStickerPath = path.join(__dirname, "../../media/sticker/emror.webp");

// Konfigurasi stiker
/**
 * Fungsi inti untuk membuat stiker dari teks dan mengirimkannya.
 * @param {import('discord.js').Interaction} interaction
 * @param {string} apiUrl - URL API untuk membuat stiker.
 * @param {boolean} isVideo - Apakah outputnya video (MP4) atau gambar (WEBP).
 */
async function createSticker(interaction, apiUrl, isVideo = false) {
  const filename = isVideo ? "sticker.mp4" : "sticker.webp";

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`API returned status ${res.status}`);
    const fileBuffer = await res.buffer();
    
    let finalBuffer = fileBuffer;
    if (!isVideo && typeof sticker5 === 'function') {
      try {
        const processedSticker = await sticker5(fileBuffer, null, packname, author);
        if (processedSticker) finalBuffer = processedSticker;
      } catch (stickerError) {
        console.warn("[STICKER] Gagal memproses metadata, mengirim stiker asli:", stickerError);
      }
    }
    
    // Edit balasan awal dengan hasil stiker
    await interaction.editReply({
      files: [new AttachmentBuilder(finalBuffer, { name: filename })],
    });

  } catch (e) {
    console.error("Gagal membuat stiker:", e);
    if (fs.existsSync(errorStickerPath)) {
      await interaction.editReply({ files: [new AttachmentBuilder(errorStickerPath)] });
    } else {
      await interaction.editReply("❌ Gagal membuat stiker. Terjadi kesalahan.");
    }
  }
}

module.exports = {
  // [BARU] Properti 'data' untuk mendefinisikan slash command
  data: new SlashCommandBuilder()
    .setName('sticker')
    .setDescription('Membuat stiker dari teks dengan berbagai gaya.')
    .addSubcommand(sub => sub.setName('attp').setDescription('Stiker teks bergerak dengan latar gradien.').addStringOption(opt => opt.setName('teks').setDescription('Teks untuk stiker').setRequired(true)))
    .addSubcommand(sub => sub.setName('ttp').setDescription('Stiker teks dengan latar belakang hitam.').addStringOption(opt => opt.setName('teks').setDescription('Teks untuk stiker').setRequired(true)))
    .addSubcommand(sub => sub.setName('brat').setDescription('Stiker teks di atas template "brat".').addStringOption(opt => opt.setName('teks').setDescription('Teks untuk stiker (gunakan "|" untuk baris baru)').setRequired(true)))
    .addSubcommand(sub => sub.setName('bratvideo').setDescription('Video stiker di atas template "brat".').addStringOption(opt => opt.setName('teks').setDescription('Teks untuk stiker').setRequired(true))),

  category: "maker",
  
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply();

    const subCommand = interaction.options.getSubcommand();
    const text = interaction.options.getString('teks');
    let apiUrl;

    switch (subCommand) {
        case 'attp':
            apiUrl = `https://api.betabotz.eu.org/api/maker/attp?text=${encodeURIComponent(text)}&apikey=${config.apikey_lann}`;
            await createSticker(interaction, apiUrl, false);
            break;
        case 'ttp':
            apiUrl = `https://api.betabotz.eu.org/api/maker/ttp?text=${encodeURIComponent(text)}&apikey=${config.apikey_lann}`;
            await createSticker(interaction, apiUrl, false);
            break;
        case 'brat':
            apiUrl = `https://api.betabotz.eu.org/api/maker/brat?text=${encodeURIComponent(text)}&apikey=${config.apikey_lann}`;
            await createSticker(interaction, apiUrl, false);
            break;
        case 'bratvideo':
            apiUrl = `https://api.betabotz.eu.org/api/maker/brat-video?text=${encodeURIComponent(text)}&apikey=${config.apikey_lann}`;
            await createSticker(interaction, apiUrl, true);
            break;
    }
  },
};