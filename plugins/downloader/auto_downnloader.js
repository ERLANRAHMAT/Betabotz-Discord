const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const config = require("../../config");
const fs = require('fs'); 
const path = require('path');
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
// --- Fungsi-Fungsi Downloader ---

async function downloadTikTok(url, message) {
    try {
        const response = await axios.get(`https://api.betabotz.eu.org/api/download/tiktok?url=${url}&apikey=${config.apikey_lann}`);
        const result = response.data.result;
        if (!result || !result.video || result.video.length === 0) throw new Error("Tidak ada video yang ditemukan.");

        const videoUrl = result.video[0];
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('TikTok Downloader')
            .setDescription(`Video dari: **${result.author?.nickname || 'Unknown'}**\n\n${result.description || ''}`)
            .setThumbnail(result.cover)
            .setFooter({ text: `Diminta oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Tonton Video').setStyle(ButtonStyle.Link).setURL(videoUrl)
        );

        await message.reply({ embeds: [embed], components: [row] });
    } catch (e) {
        console.error("[AutoDL TikTok]", e);
        // Jangan kirim pesan error agar tidak spam jika link mati
    }
}

async function downloadInstagram(url, message) {
    try {
        const response = await axios.get(`https://api.betabotz.eu.org/api/download/igdowloader?url=${url}&apikey=${config.apikey_lann}`);
        const results = response.data.message;
        if (!results || results.length === 0) throw new Error("Tidak ada media yang ditemukan.");
        
        await message.reply(`Menemukan ${results.length} media dari Instagram, mengirim...`);
        for (const item of results) {
            await message.channel.send(item._url);
        }
    } catch (e) {
        console.error("[AutoDL Instagram]", e);
    }
}

async function downloadPinterest(url, message) {
    try {
        const response = await axios.get(`https://api.betabotz.eu.org/api/download/pinterest?url=${url}&apikey=${config.apikey_lann}`);
        const result = response.data.result?.data;
        if (!result) throw new Error("Gagal mengambil data Pinterest.");

        const embed = new EmbedBuilder()
            .setColor(0xBD081C)
            .setTitle(result.title || "Pinterest Downloader")
            .setURL(result.pin_url)
            .setFooter({ text: `Diminta oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

        if (result.media_type === 'video/mp4' && result.video) {
            await message.reply({ content: result.video, embeds: [embed] });
        } else if (result.image) {
            embed.setImage(result.image);
            await message.reply({ embeds: [embed] });
        }
    } catch (e) {
        console.error("[AutoDL Pinterest]", e);
    }
}

async function downloadYoutube(url, message) {
    try {
        const response = await axios.get(`https://api.betabotz.eu.org/api/download/ytmp4?url=${url}&apikey=${config.apikey_lann}`);
        const res = response.data.result;
        if (!res || !res.mp4) throw new Error("Gagal mengambil data YouTube.");

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(res.title)
            .setURL(res.source)
            .setThumbnail(res.thumbnail)
            .addFields({ name: 'Durasi', value: res.duration, inline: true })
            .setFooter({ text: `Diminta oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Download Video (MP4)').setStyle(ButtonStyle.Link).setURL(res.mp4),
            new ButtonBuilder().setLabel('Download Audio (MP3)').setStyle(ButtonStyle.Link).setURL(res.mp3)
        );

        await message.reply({ embeds: [embed], components: [row] });
    } catch (e) {
        console.error("[AutoDL YouTube]", e);
    }
}

// GANTI FUNGSI LAMA downloadFacebook ANDA DENGAN YANG INI:

async function downloadFacebook(url, message) {
    let statusMsg;
    try {
        // Beri tahu pengguna bahwa proses sedang berjalan
        statusMsg = await message.channel.send(`📥 Mengunduh video Facebook untuk ${message.author}...`);

        const apiUrl = `https://api.betabotz.eu.org/api/download/fbdown?url=${encodeURIComponent(url)}&apikey=${config.apikey_lann}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        const data = response.data;

        // Gunakan hasil pertama dari API (biasanya kualitas SD yang lebih kecil)
        if (!data.result || !Array.isArray(data.result) || !data.result[0] || !data.result[0]._url) {
            throw new Error("API tidak mengembalikan data video yang valid.");
        }
        const videoUrl = data.result[0]._url;

        // Siapkan folder dan file sementara
        const tempDir = path.join(__dirname, "../../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempFile = path.join(tempDir, `fb_${Date.now()}.mp4`);
        const writer = fs.createWriteStream(tempFile);

        // Unduh video dari URL panjang ke file sementara
        const videoResponse = await axios({
            url: videoUrl,
            method: "GET",
            responseType: "stream",
            timeout: 120000, // Timeout 2 menit untuk download video
        });
        videoResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        // Periksa ukuran file yang sudah diunduh
        const fileSize = fs.statSync(tempFile).size;
        if (fileSize > MAX_FILE_SIZE) {
            fs.unlinkSync(tempFile); // Hapus file yang kebesaran
            await statusMsg.edit(`❌ Video Facebook terlalu besar (${(fileSize / 1024 / 1024).toFixed(2)} MB) untuk diunggah.\nSilakan unduh manual: ${videoUrl}`);
            return;
        }

        // Buat attachment dan kirim file videonya
        const attachment = new AttachmentBuilder(tempFile, { name: 'facebook_video.mp4' });
        await message.reply({
            content: `**Facebook Downloader**\n*Diminta oleh: ${message.author}*`,
            files: [attachment]
        });
        
        if (statusMsg.deletable) await statusMsg.delete().catch(() => {});
        
        // Hapus file sementara setelah berhasil dikirim
        fs.unlinkSync(tempFile);

    } catch (e) {
        console.error("[AutoDL Facebook]", e);
        if (statusMsg) await statusMsg.edit(`Gagal mengunduh video Facebook.`).catch(() => {});
    }
}

async function downloadTwitter(url, message) {
    try {
        const response = await axios.get(`https://api.betabotz.eu.org/api/download/twitter2?url=${url}&apikey=${config.apikey_lann}`);
        const result = response.data.result;
        if (!result || !result.mediaURLs) throw new Error("Gagal mengambil data Twitter.");

        const embed = new EmbedBuilder()
            .setColor(0x1DA1F2)
            .setAuthor({ name: `${result.user_name} (@${result.user_screen_name})` })
            .setDescription(result.text);

        await message.reply({ embeds: [embed] });
        for (const mediaUrl of result.mediaURLs) {
            await message.channel.send(mediaUrl);
        }
    } catch (e) {
        console.error("[AutoDL Twitter]", e);
    }
}

// Tambahkan fungsi downloader lainnya (Douyin, Threads, CapCut, dll.) dengan pola yang sama di sini

// --- Logika Utama Auto-Downloader ---
const tiktokRegex = /^(?:https?:\/\/)?(?:www\.|vt\.|vm\.|t\.)?(?:tiktok\.com\/)(?:\S+)?$/i;
const instagramRegex = /^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/)(?:p\/|reel\/)(?:\S+)?$/i;
const pinterestRegex = /^(?:https?:\/\/)?(?:www\.|pin\.it|pinterest\.com)\/(?:\S+)?$/i;
const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w\-]{11})(?:\S+)?$/i;
const facebookRegex = /^(?:https?:\/\/)?(?:www\.)?(?:facebook|fb)\.(?:com|watch)(?:\S+)?$/i;
const twitterRegex = /^(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)\/status\/(\d+)/i;
// Tambahkan regex lain di sini

const platforms = [
    { name: 'TikTok', regex: tiktokRegex, handler: downloadTikTok },
    { name: 'Instagram', regex: instagramRegex, handler: downloadInstagram },
    { name: 'Pinterest', regex: pinterestRegex, handler: downloadPinterest },
    { name: 'YouTube', regex: youtubeRegex, handler: downloadYoutube },
    { name: 'Facebook', regex: facebookRegex, handler: downloadFacebook },
    { name: 'Twitter', regex: twitterRegex, handler: downloadTwitter },
    // Tambahkan platform lain di sini
];

module.exports = {
  /**
   * Fungsi ini akan dieksekusi untuk setiap pesan oleh index.js
   * @param {import('discord.js').Message} message
   * @param {import('discord.js').Client} client
   */
  handleMessage: async (message, client) => {
    const serverId = message.guild.id;
    const channelId = message.channel.id;

    if (!config.autoDownload?.enabledServers?.includes(serverId)) {
        return; // Hentikan jika server tidak terdaftar
    }

    // 2. Cek apakah channel tempat pesan dikirim ada di dalam daftar channel yang dikecualikan
    if (config.autoDownload?.excludedChannels?.includes(channelId)) {
        return; // Hentikan jika channel ini dikecualikan
    }

    if (message.author.bot || !message.content.includes('http')) return;
    if (message.content.startsWith(config.prefix)) return;

    // Cek setiap platform yang didukung
    for (const platform of platforms) {
        const match = message.content.match(platform.regex);
        if (match) {
            console.log(`[AutoDL] Mendeteksi link ${platform.name} dari ${message.author.username}`);
            await message.react('⬇️').catch(() => {});
            await platform.handler(match[0], message);
            break; 
        }
    }
  },
};
