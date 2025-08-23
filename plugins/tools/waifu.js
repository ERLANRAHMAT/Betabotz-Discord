const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config');
const waifuLimiter = require('../../waifuLimitManager');
const { createCanvas, loadImage } = require('canvas');

// --- API Helper Functions ---
const API_BASE = "/features/waifus"; // Path relatif setelah /api/proxy

// [PERBAIKAN] Membuat instance axios khusus untuk file ini agar tidak bentrok
// dengan api_handler.js. Kita beri nama 'waifuApi'.
const waifuApi = axios.create({
    baseURL: config.api.baseUrl, // Mengambil dari config, misal: 'https://api2.danafxc.my.id'
    params: { apikey: config.api.apiKey }
});

async function getWaifuData(endpoint, params = {}) {
    try {
        const res = await waifuApi.get(`${API_BASE}${endpoint}`, { params });
        if (res.data && res.data.status) return res.data.data;
        throw new Error(res.data.message || "Gagal mengambil data waifu.");
    } catch (e) {
        throw new Error(e.response?.data?.message || e.message);
    }
}
async function postWaifuData(endpoint, params = {}) {
    try {
        const res = await waifuApi.post(`${API_BASE}${endpoint}`, null, { params });
        if (res.data.status) return res.data;
        throw new Error(res.data.message || "Gagal mengirim data waifu.");
    } catch (e) {
        throw new Error(e.response?.data?.message || e.message);
    }
}
async function deleteWaifuData(endpoint, params = {}) {
    try {
        const res = await waifuApi.delete(`${API_BASE}${endpoint}`, { params });
        if (res.data.status) return res.data;
        throw new Error(res.data.message || "Gagal menghapus data waifu.");
    } catch (e) {
        throw new Error(e.response?.data?.message || e.message);
    }
}

async function createMarriedImage(userAvatarUrl, waifuImageUrl) {
    try {
        const avatar = await loadImage(userAvatarUrl);
        const waifu = await loadImage(waifuImageUrl);
        const canvasSize = 256;
        const canvas = createCanvas(canvasSize * 2, canvasSize);
        const ctx = canvas.getContext('2d');
        const drawImageCover = (img, x, y, w, h) => {
            const imgRatio = img.width / img.height; const canvasRatio = w / h;
            let sx, sy, sWidth, sHeight;
            if (imgRatio > canvasRatio) { sHeight = img.height; sWidth = sHeight * canvasRatio; sx = (img.width - sWidth) / 2; sy = 0; }
            else { sWidth = img.width; sHeight = sWidth / canvasRatio; sy = (img.height - sHeight) / 2; sx = 0; }
            ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
        };
        drawImageCover(avatar, 0, 0, canvasSize, canvasSize);
        drawImageCover(waifu, canvasSize, 0, canvasSize, canvasSize);
        ctx.font = '64px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'red';
        ctx.fillText('❤️', canvasSize, canvasSize / 2);
        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error("Gagal membuat gambar pernikahan:", error);
        return null;
    }
}
// --- End API Helpers ---

// --- Core Function: Present Waifu with Gallery ---
async function presentWaifu(originalMessage, author, waifuData, remaining) {
    const { character_details: details, images } = waifuData;
    if (!details) return originalMessage.edit({ content: `❌ Terjadi kesalahan: Data karakter tidak ditemukan.` });
    
    const galleryImages = images.slice(0, 10);
    if (galleryImages.length === 0) return originalMessage.edit({ content: `❌ Karakter **${details.nama}** ditemukan, tetapi tidak ada gambar.` });

    let currentIndex = 0;
    const rankData = await getWaifuData('/ranking').catch(() => []);
    const rankInfo = rankData.find(w => w.waifuid == details.waifuid);
    const rank = rankInfo ? rankInfo.rankwaifu : null;

    const createEmbed = (index) => {
        const description = details.anime === 'Discovered' ? `**${details.nama}**` : `**${details.nama}** dari *${details.anime}*`;
        const embed = new EmbedBuilder().setColor(0xffb6c1).setTitle(details.nama)
            .setURL(`https://www.google.com/search?q=${encodeURIComponent(details.nama + ' ' + details.anime)}`)
            .setDescription(description).setImage(galleryImages[index])
            .setFooter({ text: `Sisa jatah harianmu: ${remaining}/${waifuLimiter.MAX_USES}` });
        if (rank) embed.addFields({ name: '🏆 Peringkat', value: `#${rank}`, inline: true });
        if (galleryImages.length > 1) embed.addFields({ name: '🖼️ Gambar', value: `${index + 1} / ${galleryImages.length}`, inline: true });
        return embed;
    };
    const createButtons = (index, disabled = false) => {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev_img').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(disabled || index === 0),
            new ButtonBuilder().setCustomId('claim_waifu').setLabel("Klaim").setEmoji("💖").setStyle(ButtonStyle.Success).setDisabled(disabled),
            new ButtonBuilder().setCustomId('skip_waifu').setLabel("Lewati").setStyle(ButtonStyle.Danger).setDisabled(disabled),
            new ButtonBuilder().setCustomId('next_img').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(disabled || index >= galleryImages.length - 1)
        );
    };

    const response = await originalMessage.edit({ content: null, embeds: [createEmbed(currentIndex)], components: [createButtons(currentIndex)] });
    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        if (i.user.id !== author.id) return i.reply({ content: 'Tombol ini bukan untukmu!', ephemeral: true });
        await i.deferUpdate();
        switch (i.customId) {
            case 'prev_img': if (currentIndex > 0) currentIndex--; await response.edit({ embeds: [createEmbed(currentIndex)], components: [createButtons(currentIndex)] }); break;
            case 'next_img': if (currentIndex < galleryImages.length - 1) currentIndex++; await response.edit({ embeds: [createEmbed(currentIndex)], components: [createButtons(currentIndex)] }); break;
            case 'claim_waifu': case 'skip_waifu':
                collector.stop();
                if (i.customId === 'claim_waifu') {
                    try {
                        const chosenImageUrl = galleryImages[currentIndex];
                        const res = await postWaifuData('/claim', { userId: author.id, waifuid: details.waifuid, imgurl: chosenImageUrl });
                        await response.edit({ content: `✅ ${res.message}`, embeds: [], components: [] });
                    } catch (err) { await response.edit({ content: `❌ Gagal klaim: ${err.message}`, embeds: [], components: [] }); }
                } else { await response.edit({ content: "😢 Waifu dilewatkan.", embeds: [], components: [] }); }
                break;
        }
    });
    collector.on('end', (c, reason) => { if (reason === 'time') response.edit({ content: "⌛ Waktu habis!", embeds: [], components: [createButtons(currentIndex, true)] }).catch(() => {}); });
}
// --- End Core Function ---

// --- Sub-Command Handlers ---
async function handleGacha(message, args, client) {
    const userId = message.author.id;
    const limit = waifuLimiter.checkLimit(userId);
    if (!limit.isAllowed) return message.reply(`❗ Jatah harianmu habis. Sisa: **${limit.remaining}/${waifuLimiter.MAX_USES}**`);
    const processingMsg = await message.reply("🎲 Meroll waifu acak...");
    try {
        const waifuData = await getWaifuData('/random');
        waifuLimiter.useLimit(userId);
        await presentWaifu(processingMsg, message.author, waifuData, limit.remaining - 1);
    } catch (e) { await processingMsg.edit(`❌ Gagal meroll waifu: ${e.message}`); }
}

async function handleSearch(message, args, client) {
    const userId = message.author.id;
    const name = args.join(' ');
    if (!name) return message.reply("Masukkan nama waifu. Contoh: `!waifu search Minato Aqua`");

    const limit = waifuLimiter.checkLimit(userId);
    if (!limit.isAllowed) return message.reply(`❗ Jatah harianmu habis. Sisa: **${limit.remaining}/${waifuLimiter.MAX_USES}**`);
    
    const processingMsg = await message.reply(`🔍 Mencari waifu bernama **${name}**...`);
    try {
        // [PERBAIKAN] Menggunakan 'waifuApi' yang sudah didefinisikan di atas file ini
        const res = await waifuApi.get(`${API_BASE}/search`, { params: { nama: name } });
        
        if (res.data && res.data.status) {
            // [PERBAIKAN] Memformat respons agar sesuai dengan yang diharapkan oleh presentWaifu
            const waifuData = {
                character_details: res.data.character_details,
                images: res.data.images
            };
            waifuLimiter.useLimit(userId);
            await presentWaifu(processingMsg, message.author, waifuData, limit.remaining - 1);
        } else {
            throw new Error(res.data.message || "API tidak memberikan respons yang valid.");
        }
    } catch (e) { 
        const errorMessage = e.response?.data?.message || e.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`❌ Gagal mencari waifu: ${errorMessage}`); 
    }
}

async function handleMyWaifu(message, args, client) {
    const processingMsg = await message.reply("💍 Memeriksa status pernikahanmu...");
    const userId = message.author.id;
    try {
        const marriage = await getWaifuData('/mymarriage', { userId });
        const waifu = marriage.waifu;
        const marriedAt = new Date(marriage.marriageDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('💍 Waifu yang Telah Dinikahi')
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(`**${waifu.nama}** dari *${waifu.anime}*`)
            .setFooter({ text: `ID Waifu: ${waifu.waifuid}` })
            .addFields({ name: 'Dinikahi Pada', value: marriedAt, inline: true });
            
        const userAvatar = message.author.displayAvatarURL({ extension: 'png', size: 256 });
        const marriedImageBuffer = await createMarriedImage(userAvatar, waifu.imgurl);
        
        if (marriedImageBuffer) {
            const attachment = new AttachmentBuilder(marriedImageBuffer, { name: 'waifu-married.png' });
            embed.setImage('attachment://waifu-married.png');
            return await processingMsg.edit({ content: null, embeds: [embed], files: [attachment] });
        }
        
        embed.setImage(waifu.imgurl);
        return await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (e) {
        return processingMsg.edit("💔 Kamu belum menikah. Gunakan `!waifu marry` untuk menikahi salah satu waifumu yang sudah di-klaim!");
    }
}

async function handleUnclaim(message, args, client) {
    const processingMsg = await message.reply("🔍 Mengambil daftar klaim-mu...");
    const userId = message.author.id;
    try {
        const claims = await getWaifuData('/myclaim', { userId });
        if (!claims || claims.length === 0) return processingMsg.edit("❌ Kamu tidak punya waifu untuk dilepaskan.");
        
        const options = claims.map(c => ({
            label: c.waifu.nama.substring(0, 100),
            description: `ID: ${c.waifu.waifuid}`,
            value: c.waifu.waifuid.toString()
        }));
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('unclaim_select')
                .setPlaceholder('Pilih waifu yang akan dilepaskan...')
                .addOptions(options)
        );
        const response = await processingMsg.edit({ content: "Siapa yang akan kamu lepaskan dari koleksimu?", components: [row] });
        
        const collector = response.createMessageComponentCollector({ 
            filter: i => i.user.id === userId, 
            componentType: ComponentType.StringSelect, 
            time: 60000 
        });

        collector.on('collect', async i => {
            await i.deferUpdate();
            const waifuIdToUnclaim = i.values[0];
            
            // [PERBAIKAN] Cari nama waifu dari data yang sudah kita ambil
            const unclaimedWaifu = claims.find(c => c.waifu.waifuid.toString() === waifuIdToUnclaim);
            const waifuName = unclaimedWaifu ? unclaimedWaifu.waifu.nama : "Waifu tersebut";

            try {
                await deleteWaifuData('/unclaim', { userId, waifuid: waifuIdToUnclaim });
                // [PERBAIKAN] Gunakan pesan baru yang lebih dramatis
                await response.edit({ 
                    content: `💔 Dengan berat hati, kamu telah melepaskan **${waifuName}**. Semoga dia menemukan kebahagiaan baru.`, 
                    components: [] 
                });
            } catch (e) { 
                await response.edit({ content: `❌ Gagal melepaskan: ${e.message}`, components: [] }); 
            }
            collector.stop();
        });

    } catch (e) { 
        await processingMsg.edit(`❌ Gagal mengambil daftar klaim: ${e.message}`); 
    }
}

async function handleMyList(message, args, client) {
    const processingMsg = await message.reply("💖 Mengambil daftar waifu yang kamu klaim...");
    const userId = message.author.id;
    try {
        const claims = await getWaifuData('/myclaim', { userId });
        if (!claims || claims.length === 0) return processingMsg.edit("😢 Kamu belum memiliki waifu yang di-klaim. Gunakan `!waifu roll`!");

        const options = claims.map((c, i) => ({
            label: c.waifu.nama.substring(0, 100),
            description: `Diklaim pada: ${new Date(c.claimDetails.claimedAt).toLocaleDateString('id-ID')}`,
            value: i.toString()
        }));
        
        const selectMenu = new StringSelectMenuBuilder().setCustomId('mywaifu_list_select').setPlaceholder('Pilih waifu untuk dilihat detailnya...').addOptions(options);
        const response = await processingMsg.edit({ content: `Kamu memiliki **${claims.length}** waifu yang di-klaim.`, components: [new ActionRowBuilder().addComponents(selectMenu)] });
        
        const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000, filter: i => i.user.id === userId });
        collector.on('collect', async i => {
            await i.deferUpdate();
            const claim = claims[parseInt(i.values[0])];
            const embed = new EmbedBuilder().setColor(0xFF69B4).setTitle(`💖 Detail Klaim`)
                .setDescription(`**${claim.waifu.nama}** dari *${claim.waifu.anime}*`)
                .setImage(claim.claimDetails.imgurl)
                .setFooter({ text: `ID Waifu: ${claim.waifu.waifuid}` });
            await response.edit({ content: null, embeds: [embed], components: [] });
            collector.stop();
        });

    } catch (e) {
        await processingMsg.edit(`❌ Gagal mengambil daftar klaim: ${e.message}`);
    }
}

async function handleMarry(message, args, client) {
    const processingMsg = await message.reply("🔍 Mengambil daftar klaim-mu...");
    const userId = message.author.id;
    try {
        const claims = await getWaifuData('/myclaim', { userId });
        if (!claims || claims.length === 0) return processingMsg.edit("❌ Kamu harus meng-klaim waifu terlebih dahulu sebelum menikah.");
        const options = claims.map(c => ({ label: c.waifu.nama.substring(0, 100), description: `Bisa dinikahi setelah: ${new Date(c.claimDetails.marriedAt).toLocaleDateString('id-ID')}`, value: c.waifu.waifuid.toString() }));
        const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('marry_select').setPlaceholder('Pilih waifu yang akan dinikahi...').addOptions(options));
        const response = await processingMsg.edit({ content: "Pilih waifu dari daftar klaimmu yang ingin kamu nikahi:", components: [row] });
        const collector = response.createMessageComponentCollector({ filter: i => i.user.id === userId, componentType: ComponentType.StringSelect, time: 60000 });
        collector.on('collect', async i => {
            await i.deferUpdate();
            try {
                const res = await postWaifuData('/marry', { userId, waifuid: i.values[0] });
                await response.edit({ content: `🎉 ${res.message}`, components: [] });
            } catch (e) { await response.edit({ content: `❌ Gagal menikah: ${e.message}`, components: [] }); }
            collector.stop();
        });
    } catch (e) { await processingMsg.edit(`❌ Gagal: ${e.message}`); }
}

async function handleUnmarry(message, args, client) {
    const userId = message.author.id;
    const processingMsg = await message.reply("💔 Memeriksa status pernikahanmu...");

    try {
        // Cek dulu apakah user benar-benar sudah menikah
        const marriage = await getWaifuData('/mymarriage', { userId });
        const waifuName = marriage.waifu.nama;

        const confirmEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle("❓ Konfirmasi Perceraian")
            .setDescription(`Apakah kamu benar-benar yakin ingin bercerai dengan **${waifuName}**?\n\nTindakan ini tidak bisa dibatalkan.`);

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('unmarry_confirm').setLabel('Ya, Ceraikan').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('unmarry_cancel').setLabel('Batal').setStyle(ButtonStyle.Secondary)
        );
        
        const response = await processingMsg.edit({ content: null, embeds: [confirmEmbed], components: [buttons] });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === userId,
            time: 30000 // Waktu konfirmasi 30 detik
        });

        collector.on('collect', async i => {
            await i.deferUpdate();
            collector.stop();
            if (i.customId === 'unmarry_confirm') {
                try {
                    const res = await deleteWaifuData('/unmarry', { userId });
                    await response.edit({ content: `✅ ${res.message}`, embeds: [], components: [] });
                } catch (e) {
                    await response.edit({ content: `❌ Gagal bercerai: ${e.message}`, embeds: [], components: [] });
                }
            } else { // unmarry_cancel
                await response.edit({ content: "👍 Perceraian dibatalkan.", embeds: [], components: [] });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                response.edit({ content: "⌛ Waktu konfirmasi habis.", embeds: [], components: [] });
            }
        });

    } catch (e) {
        // Jika getWaifuData('/mymarriage') gagal, berarti user belum menikah
        await processingMsg.edit(`❌ Gagal: ${e.message}`);
    }
}


async function handleRank(message, args, client) {
    const processingMsg = await message.reply("🏆 Mengambil papan peringkat...");
    try {
        const ranks = await getWaifuData('/ranking');
        const rankList = ranks.slice(0, 10).map((w, i) => `**${i + 1}.** **${w.nama}** - Diklaim oleh **${w.claimedBy.length}** orang`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFFD700).setTitle("🏆 Top 10 Waifu Terpopuler").setDescription(rankList);
        await processingMsg.edit({ content: null, embeds: [embed] });
    } catch (e) { await processingMsg.edit(`❌ Gagal mengambil ranking: ${e.message}`); }
}

// --- Main Export ---
module.exports = {
  prefix: "waifu",
  category: "fun",
  aliases: ["w"],
  
  async execute(message, args, client) {
    const subCommand = args[0]?.toLowerCase();
    const restArgs = args.slice(1);
    switch (subCommand) {
        case 'search': return handleSearch(message, restArgs, client);
        case 'roll': case 'gacha': return handleGacha(message, restArgs, client);
        case 'my': return handleMyWaifu(message, restArgs, client); // [DIUBAH]
        case 'list': case 'koleksi': return handleMyList(message, restArgs, client); // [BARU]
        case 'unclaim': return handleUnclaim(message, restArgs, client);
        case 'marry': case 'nikah': return handleMarry(message, restArgs, client);
        case 'unmarry': case 'cerai': return handleUnmarry(message, restArgs, client);
        case 'rank': case 'top': return handleRank(message, restArgs, client);
        default:
            const limit = waifuLimiter.checkLimit(message.author.id);
            const helpEmbed = new EmbedBuilder().setColor(0xffc0cb).setTitle("💖 Bantuan Perintah Waifu")
              .setDescription(`**Sisa Jatah Harian:** ${limit.remaining}/${waifuLimiter.MAX_USES}`)
              .addFields(
                  { name: '`!waifu roll`', value: 'Mencari waifu acak.' },
                  { name: '`!waifu search <nama>`', value: 'Mencari waifu spesifik.' },
                  { name: '`!waifu my`', value: 'Melihat waifu yang sudah kamu nikahi.' }, // [DIUBAH]
                  { name: '`!waifu list`', value: 'Melihat daftar waifu yang kamu klaim.' }, // [BARU]
                  { name: '`!waifu unclaim`', value: 'Melepaskan salah satu waifu yang kamu klaim.' },
                  { name: '`!waifu marry`', value: 'Menikahi salah satu waifu yang kamu klaim.' },
                  { name: '`!waifu unmarry`', value: 'Menceraikan waifu yang sudah dinikahi.' },
                  { name: '`!waifu rank`', value: 'Melihat papan peringkat.' }
              );
            return message.reply({ embeds: [helpEmbed] });
    }
  },
};
