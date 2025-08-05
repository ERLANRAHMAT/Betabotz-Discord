const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config');
const waifuLimiter = require('../../waifuLimitManager');
const { createCanvas, loadImage } = require('canvas');

// --- API Helper Functions ---
const API_BASE = "https://api.danafxc.my.id/api/waifus";
const API_KEY = config.apikey_dana; 

async function searchWaifu(name) {
    const res = await axios.get(`${API_BASE}/search`, { params: { apikey: API_KEY, nama: name } });
    if (!res.data || !res.data.character_details) throw new Error("Karakter tidak ditemukan.");
    return { details: res.data.character_details, images: res.data.images || [] };
}

async function getRandomWaifu() {
    let attempts = 0;
    while (attempts < 5) {
        const res = await axios.get(`${API_BASE}/random`, { params: { apikey: API_KEY } });
        const data = res.data?.data;
        if (data && data.character_details && data.images && data.images.length > 0) {
            return { details: data.character_details, images: data.images };
        }
        attempts++;
    }
    throw new Error("Gagal mendapatkan waifu acak dengan gambar setelah 5x percobaan.");
}

async function getMyClaim(userId) {
    const res = await axios.get(`${API_BASE}/myclaim`, { params: { apikey: API_KEY, userId } });
    return res.data?.data;
}

async function getMyMarriage(userId) {
    const res = await axios.get(`${API_BASE}/mymarriage`, { params: { apikey: API_KEY, userId } });
    return res.data?.data;
}

async function getRanking() {
    const res = await axios.get(`${API_BASE}/ranking`, { params: { apikey: API_KEY } });
    return res.data?.data;
}

async function claimWaifu(userId, waifuId, imageUrl) {
    const encodedImageUrl = (imageUrl);
    return await axios.post(`${API_BASE}/claim`, null, { 
        params: { apikey: API_KEY, userId, waifuid: waifuId, imgurl: encodedImageUrl } 
    });
}

async function unclaimWaifu(userId) {
    return await axios.delete(`${API_BASE}/unclaim`, { params: { apikey: API_KEY, userId } });
}

async function marryWaifu(userId) {
    return await axios.post(`${API_BASE}/marry`, null, { params: { apikey: API_KEY, userId } });
}

async function getWaifuRank(waifuId) {
    try {
        const ranks = await getRanking();
        if (!ranks) return null;
        const waifuInRank = ranks.find(w => w.waifuid === waifuId);
        return waifuInRank ? waifuInRank.rankwaifu : null;
    } catch (error) {
        return null;
    }
}

async function createMarriedImage(userAvatarUrl, waifuImageUrl) {
    try {
        const avatar = await loadImage(userAvatarUrl);
        const waifu = await loadImage(waifuImageUrl);

        const canvasSize = 256;
        const canvas = createCanvas(canvasSize * 2, canvasSize);
        const ctx = canvas.getContext('2d');

        // Fungsi kecil untuk menggambar dengan aspect ratio 'cover'
        const drawImageCover = (img, x, y, w, h) => {
            const imgRatio = img.width / img.height;
            const canvasRatio = w / h;
            let sx, sy, sWidth, sHeight;

            // Jika gambar lebih lebar dari kotak (crop kiri/kanan)
            if (imgRatio > canvasRatio) {
                sHeight = img.height;
                sWidth = sHeight * canvasRatio;
                sx = (img.width - sWidth) / 2;
                sy = 0;
            } else { // Jika gambar lebih tinggi dari kotak (crop atas/bawah)
                sWidth = img.width;
                sHeight = sWidth / canvasRatio;
                sy = (img.height - sHeight) / 2;
                sx = 0;
            }
            // Gambar bagian yang sudah dihitung ke canvas
            ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
        };

        // Gunakan fungsi di atas untuk menggambar avatar dan waifu
        drawImageCover(avatar, 0, 0, canvasSize, canvasSize);
        drawImageCover(waifu, canvasSize, 0, canvasSize, canvasSize);

        // Tambahkan emoji hati di tengah
       ctx.font = '64px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'red'; // Set fill color to red
            ctx.fillText('❤️', canvasSize, canvasSize / 2);

        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error("Gagal membuat gambar pernikahan:", error);
        return null;
    }
}

// --- End API Helpers ---

// --- Core Function: Present Waifu with Gallery ---
async function presentWaifu(message, author, waifuData, remaining) {
    try {
        const { details, images } = waifuData;
        const galleryImages = images.slice(0,10);
        
        if (galleryImages.length === 0) {
            return message.edit({ content: `❌ Karakter **${details.nama}** ditemukan, tetapi tidak ada gambar yang tersedia.` });
        }

        let currentIndex = 0;
        const rank = await getWaifuRank(details.waifuid);

        const createEmbed = (index) => {
            const description = details.anime === 'Discovered' ? `*Dari sumber yang tidak diketahui*` : `Dari *${details.anime}*`;
            const embed = new EmbedBuilder()
                .setColor(0xffb6c1).setTitle(details.nama)
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

        const sentMessage = message.editable ? await message.edit({ content: null, embeds: [createEmbed(currentIndex)], components: [createButtons(currentIndex)] }) : await message.channel.send({ embeds: [createEmbed(currentIndex)], components: [createButtons(currentIndex)] });
        
        const collector = sentMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            try {
                // Log untuk debugging di terminal
                console.log(`[Waifu Collector] Interaksi diterima: ${i.customId} dari ${i.user.username}`);
                
                if (i.user.id !== author.id) {
                    return i.reply({ content: 'Tombol ini bukan untukmu!', ephemeral: true });
                }

                // Segera akui interaksi untuk menghindari error "Interaction Failed"
                await i.deferUpdate();
                console.log(`[Waifu Collector] Interaksi di-defer.`);

                switch (i.customId) {
                    case 'prev_img':
                        if (currentIndex > 0) currentIndex--;
                        await sentMessage.edit({ embeds: [createEmbed(currentIndex)], components: [createButtons(currentIndex)] });
                        break;
                    case 'next_img':
                        if (currentIndex < galleryImages.length - 1) currentIndex++;
                        await sentMessage.edit({ embeds: [createEmbed(currentIndex)], components: [createButtons(currentIndex)] });
                        break;
                    case 'claim_waifu':
                    case 'skip_waifu':
                        collector.stop(); // Hentikan collector agar tidak ada klik ganda
                        await sentMessage.edit({ components: [createButtons(currentIndex, true)] }); // Nonaktifkan tombol
                        
                        if (i.customId === 'claim_waifu') {
                            try {
                                const chosenImageUrl = galleryImages[currentIndex];
                                const res = await claimWaifu(author.id, details.waifuid, chosenImageUrl);
                                await sentMessage.edit({ content: `✅ **${details.nama}** Berhasil klaim waifu, selamat sekarang dia jadi punya kamu! yang setia... :b`, embeds: [], components: [] });
                            } catch (err) {
                                await sentMessage.edit({ content: `❌ Gagal klaim: kamu sudah memiliki waifu! hayyy jangan karbit!`, embeds: [], components: [] });
                            }
                        } else { // skip_waifu
                            await sentMessage.edit({ content: "😢 Waifu dilewatkan.", embeds: [], components: [] });
                        }
                        break;
                }
            } catch (error) {
                console.error("[Waifu Collector] Terjadi error kritis saat mengumpulkan interaksi:", error);
                await sentMessage.edit({ content: "Terjadi error saat memproses pilihanmu.", embeds:[], components: [] }).catch(()=>{});
            }
        });

        collector.on('end', (c, reason) => {
            // Hanya nonaktifkan tombol jika collector berakhir karena waktu habis
            if (reason === 'time') {
                sentMessage.edit({ content: "⌛ Waktu habis! Kamu tidak mengklaim waifu ini.", embeds: [], components: [createButtons(currentIndex, true)] }).catch(() => {});
            }
        });

    } catch (e) {
        console.error("Error di presentWaifu:", e);
        if(message.editable) await message.edit({ content: "Gagal menampilkan waifu." });
    }
}

// --- Sub-Command Handlers ---
async function handleGacha(message) {
    const userId = message.author.id;
    const limit = waifuLimiter.checkLimit(userId);
    if (!limit.isAllowed) return message.reply(`❗ Jatah harianmu habis. Sisa: **${limit.remaining}/${waifuLimiter.MAX_USES}**`);
    const processingMsg = await message.reply("🎲 Meroll waifu acak untukmu...");
    try {
        const waifuData = await getRandomWaifu();
        waifuLimiter.useLimit(userId);
        await presentWaifu(processingMsg, message.author, waifuData, limit.remaining - 1);
    } catch (e) { await processingMsg.edit(`❌ Gagal meroll waifu: ${e.message}`); }
}

async function handleSearch(message, args) {
    const userId = message.author.id;
    const limit = waifuLimiter.checkLimit(userId);
    if (!limit.isAllowed) return message.reply(`❗ Jatah harianmu habis. Sisa: **${limit.remaining}/${waifuLimiter.MAX_USES}**`);
    const name = args.join(' ');
    if (!name) return message.reply("Masukkan nama waifu. Contoh: `!waifu search Minato Aqua`");
    const processingMsg = await message.reply(`🔍 Mencari waifu bernama **${name}**...`);
    try {
        const waifuData = await searchWaifu(name);
        waifuLimiter.useLimit(userId);
        await presentWaifu(processingMsg, message.author, waifuData, limit.remaining - 1);
    } catch (e) { await processingMsg.edit(`❌ Gagal mencari waifu: ${e.message}`); }
}

async function handleMyWaifu(message) {
    const processingMsg = await message.reply("🔍 Memeriksa status waifumu saat ini...");
    const userId = message.author.id;

    try {
        // Langkah 1: Cek endpoint /myclaim (untuk yang belum menikah)
        const claim = await getMyClaim(userId);
        const waifu = claim.waifu;
        const claimDetails = claim.claimDetails;
        const rank = await getWaifuRank(waifu.waifuid);
        const claimedAt = new Date(claimDetails.claimedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const description = waifu.anime === 'Discovered' ? `**${waifu.nama}**` : `**${waifu.nama}** dari *${waifu.anime}*`;

        const embed = new EmbedBuilder()
            .setColor(0xFF69B4).setTitle('💖 Waifumu Saat Ini')
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(description).setImage(waifu.imgurl).setFooter({ text: `ID Waifu: ${waifu.waifuid}` });
        if (rank) embed.addFields({ name: '🏆 Peringkat', value: `#${rank}`, inline: true });
        embed.addFields({ name: 'Diklaim Sejak', value: claimedAt, inline: true });
        embed.addFields({ name: 'Status', value: 'Belum dinikahi. Gunakan `!waifu marry`!' });
        
        return await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (claimError) {
        // Jika gagal di /myclaim, cetak log errornya dan lanjut cek /mymarriage
        console.log(`[MY WAIFU] Info: Gagal fetch dari /myclaim untuk user ${userId}. Pesan: ${claimError.response?.data?.message || claimError.message}. Lanjut memeriksa /mymarriage...`);
        
        try {
            const marriage = await getMyMarriage(userId);
            const waifu = marriage.waifu;
            const rank = await getWaifuRank(waifu.waifuid);
            const marriedAt = new Date(marriage.marriageDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            
            const description = waifu.anime === 'Discovered' ? `**${waifu.nama}**` : `**${waifu.nama}** dari *${waifu.anime}*`;

            const embed = new EmbedBuilder()
                .setColor(0xFFD700).setTitle('💍 Waifu yang Telah Dinikahi')
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setDescription(description).setFooter({ text: `ID Waifu: ${waifu.waifuid}` });
            if (rank) embed.addFields({ name: '🏆 Peringkat', value: `#${rank}`, inline: true });
            embed.addFields({ name: 'Dinikahi Pada', value: marriedAt, inline: true });

            const userAvatar = message.author.displayAvatarURL({ extension: 'png', size: 256 });
            const marriedImageBuffer = await createMarriedImage(userAvatar, waifu.imgurl);
            
            if (marriedImageBuffer) {
                const attachment = new AttachmentBuilder(marriedImageBuffer, { name: 'waifu-married.png' });
                embed.setImage('attachment://waifu-married.png');
                return await processingMsg.edit({ content: null, embeds: [embed], files: [attachment] });
            } else {
                embed.setImage(waifu.imgurl);
                return await processingMsg.edit({ content: null, embeds: [embed] });
            }

        } catch (marriageError) {
            // Jika gagal juga di /mymarriage, baru dipastikan user belum punya apa-apa
            console.log(`[Waifu MY] Gagal fetch dari /mymarriage untuk user ${userId}. Pesan: ${marriageError.response?.data?.message || marriageError.message}.`);
            return await processingMsg.edit("😢 Kamu belum memiliki waifu, baik yang di-claim maupun yang sudah dinikahi. Gunakan `!waifu roll` untuk mencari waifu kamu!");
        }
    }
}

async function handleUnclaim(message) {
    try {
        const claim = await getMyClaim(message.author.id);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_unclaim').setLabel('Ya, Lepaskan').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_unclaim').setLabel('Batal').setStyle(ButtonStyle.Secondary)
        );
        const confirmMsg = await message.reply({ content: `💔 Yakin ingin melepaskan **${claim.waifu.nama}**?`, components: [row] });
        
        const collector = confirmMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });
        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'Bukan untukmu!', ephemeral: true });
            await i.deferUpdate();
            if (i.customId === 'confirm_unclaim') {
                const res = await unclaimWaifu(message.author.id);
                await confirmMsg.edit({ content: `✅ "tcihh dasar tidak setia"`, components: [] });
            } else { await confirmMsg.edit({ content: '👍 Unclaim dibatalkan.', components: [] }); }
            collector.stop();
        });
        collector.on('end', (c, reason) => { if (reason === 'time') confirmMsg.edit({ content: 'Waktu habis.', components: [] }); });
    } catch (e) {
        message.reply("❌ Kamu tidak punya waifu untuk dilepaskan. Mungkin dia sudah kamu nikahi?");
    }
}

async function handleMarry(message) {
     try {
        const claim = await getMyClaim(message.author.id);
        const now = new Date();
        const eligibleDate = new Date(claim.claimDetails.marriedAt);
        const waifu = claim.waifu;
        
        if (now < eligibleDate) {
            const timeRemaining = eligibleDate.getTime() - now.getTime();
            const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            return message.reply(`💔 Belum bisa menikahi **${waifu.nama}**.\nKembali setelah **${eligibleDate.toLocaleDateString('id-ID')}**.\n*Sisa: **${days} hari ${hours} jam**.*`);
        }
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_marry').setLabel(`Nikahi ${waifu.nama}`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cancel_marry').setLabel('Batal').setStyle(ButtonStyle.Secondary)
        );
        const confirmMsg = await message.reply({ content: `💍 Yakin ingin menikahi **${waifu.nama}**? Ini **permanen**!`, components: [row] });
        
        const collector = confirmMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });
        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'Bukan untukmu!', ephemeral: true });
            await i.deferUpdate();
            if (i.customId === 'confirm_marry') {
                try {
                    await marryWaifu(message.author.id);
                    await confirmMsg.edit({ content: `🎉 Selamat! Kamu telah resmi menikah dengan **${waifu.nama}**!`, components: [] });
                } catch(err) { await confirmMsg.edit({ content: `❌ Gagal menikah: ${err.response?.data?.message || err.message}`, components: [] }); }
            } else { await confirmMsg.edit({ content: '👍 Pernikahan dibatalkan.', components: [] }); }
            collector.stop();
        });
        collector.on('end', (c, reason) => { if (reason === 'time') confirmMsg.edit({ content: 'Waktu habis.', components: [] }); });
    } catch (e) {
        message.reply("❌ Kamu harus punya waifu untuk menikahi! atau kamu sudah menikahi nya");
    }
}

async function handleRank(message) {
    try {
        const ranks = await getRanking();
        if (!ranks || ranks.length === 0) return message.reply("Belum ada ranking.");
        const rankList = ranks.slice(0, 10).map((w, i) => {
            const animeText = w.anime === 'Discovered' ? '' : ` (*${w.anime}*)`;
            return `**${i + 1}.** **${w.nama}**${animeText} - Klaim: **${w.claimedBy.length}**`;
        }).join('\n');
        const embed = new EmbedBuilder().setColor(0xFFD700).setTitle("🏆 Top 10 Waifu Terpopuler").setDescription(rankList);
        message.reply({ embeds: [embed] });
    } catch (e) {
        message.reply(`❌ Gagal mengambil ranking.`);
    }
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
        case 'search': return handleSearch(message, restArgs);
        case 'roll': case 'gacha': return handleGacha(message);
        case 'my': case 'list': case 'koleksi': return handleMyWaifu(message);
        case 'unclaim': case 'lepas': return handleUnclaim(message);
        case 'marry': case 'nikah': return handleMarry(message);
        case 'rank': case 'top': return handleRank(message);
        default:
            const helpEmbed = new EmbedBuilder()
              .setColor(0xffc0cb)
              .setTitle("💖 Bantuan Perintah Waifu")
              .setDescription("Sistem gacha dan koleksi waifu!\n**Sisa Jatah Harian:** " + waifuLimiter.checkLimit(message.author.id).remaining + "/" + waifuLimiter.MAX_USES)
              .addFields(
                  { name: '`!waifu roll` atau `gacha`', value: 'Mencari waifu acak.' },
                  { name: '`!waifu search <nama>`', value: 'Mencari waifu spesifik.' },
                  { name: '`!waifu my` atau `list`', value: 'Melihat waifu yang kamu klaim/nikahi.' },
                  { name: '`!waifu unclaim`', value: 'Melepaskan waifu yang kamu klaim (jika belum dinikahi).' },
                  { name: '`!waifu marry`', value: 'Menikahi waifumu saat ini (permanen setelah waktu tertentu).' },
                  { name: '`!waifu rank`', value: 'Melihat ranking waifu paling populer.' }
              );
            return message.reply({ embeds: [helpEmbed] });
    }
  },
};