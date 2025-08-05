const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const api = require('../../api_handler.js'); // [PERBAIKAN] Mengimpor handler API
const config = require('../../config.js');

async function createCoupleImage(user1AvatarUrl, user2AvatarUrl) {
    try {
        const avatar1 = await loadImage(user1AvatarUrl);
        const avatar2 = await loadImage(user2AvatarUrl);
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
        drawImageCover(avatar1, 0, 0, canvasSize, canvasSize);
        drawImageCover(avatar2, canvasSize, 0, canvasSize, canvasSize);
        ctx.font = '64px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'red';
        ctx.fillText('❤️', canvasSize, canvasSize / 2);
        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error("Gagal membuat gambar pasangan:", error);
        return null;
    }
}

module.exports = {
  prefix: "pasangan",
  category: "fun",
  aliases: ["tembak", "putus", "cekpasangan"],
  
  async execute(message, args, client) {
    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const target = message.mentions.members.first();

    try {
        if (command === 'tembak') {
            if (!target) return message.reply("Kamu mau nembak siapa? Mention orangnya! Contoh: `!tembak @user`");
            if (target.id === authorId) return message.reply("Tidak bisa menembak diri sendiri!");
            if (target.user.bot) return message.reply("Tidak bisa menembak bot!");

            // GET data untuk pengecekan
            const authorData = await api.getUser(authorId, authorUsername);
            const targetData = await api.getUser(target.id, target.user.username);

            if (authorData.pasangan) return message.reply(`Kamu sudah punya pasangan! Setia dong.`);
            if (targetData.pasangan) return message.reply(`Maaf, ${target.user.username} sudah punya pasangan.`);
            if (targetData.proposalFrom) return message.reply(`${target.user.username} sedang menunggu jawaban dari orang lain.`);

            // MODIFY & POST untuk menyimpan status lamaran
            targetData.proposalFrom = authorId;
            await api.updateUser(target.id, targetData);
            
            const embed = new EmbedBuilder().setColor(0xFF69B4).setTitle("💌 Sebuah Surat Cinta Tiba!").setDescription(`${message.author} telah menyatakan perasaannya kepadamu, ${target}!\n\nApa jawabanmu?`).setFooter({ text: "Kamu punya waktu 2 menit untuk menjawab." });
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pasangan_terima').setLabel('Terima').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('pasangan_tolak').setLabel('Tolak').setStyle(ButtonStyle.Danger)
            );
            const proposalMsg = await message.channel.send({ content: `${target}`, embeds: [embed], components: [buttons] });
            const collector = proposalMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

            collector.on('collect', async i => {
                if (i.user.id !== target.id) return i.reply({ content: 'Bukan untukmu!', ephemeral: true });
                await i.deferUpdate();
                collector.stop();

                // GET -> MODIFY -> POST untuk kedua user
                const finalAuthorData = await api.getUser(authorId, authorUsername);
                const finalTargetData = await api.getUser(target.id, target.user.username);
                
                if (i.customId === 'pasangan_terima') {
                    finalAuthorData.pasangan = target.id;
                    finalTargetData.pasangan = authorId;
                    finalTargetData.proposalFrom = null;
                    await api.updateUser(authorId, finalAuthorData);
                    await api.updateUser(target.id, finalTargetData);
                    await proposalMsg.edit({ content: `🎉 Selamat! ${target.user.username} dan ${message.author.username} resmi berpacaran!`, embeds: [], components: [] });
                } else {
                    finalTargetData.proposalFrom = null;
                    await api.updateUser(target.id, finalTargetData);
                    await proposalMsg.edit({ content: `💔 Yah, ${message.author.username}, cintamu ditolak oleh ${target.user.username}.`, embeds: [], components: [] });
                }
            });
            collector.on('end', async (c, reason) => {
                if (reason === 'time') {
                    const finalTargetData = await api.getUser(target.id, target.user.username);
                    if(finalTargetData.proposalFrom === authorId) { // Hanya hapus jika proposal masih ada
                       finalTargetData.proposalFrom = null;
                       await api.updateUser(target.id, finalTargetData);
                    }
                    proposalMsg.edit({ content: "⌛ Lamaran tidak dijawab dan kedaluwarsa.", embeds: [], components: [] });
                }
            });
        }
        
        else if (command === 'putus') {
            const authorData = await api.getUser(authorId, authorUsername);
            const partnerId = authorData.pasangan;
            if (!partnerId) return message.reply("Kamu jomblo, mau mutusin siapa? :(");

            let partnerMember = await message.guild.members.fetch(partnerId).catch(() => null);
            if(!partnerMember) { /* ... (Logika partner tidak ada di server) ... */ }

            const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle("💔 Permintaan Putus Hubungan").setDescription(`${message.author} ingin putus denganmu, ${partnerMember}.\n\nApakah kamu setuju?`).setFooter({ text: "Kamu punya waktu 2 menit." });
            const buttons = new ActionRowBuilder().addComponents( new ButtonBuilder().setCustomId('putus_setuju').setLabel('Setuju Putus').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('putus_batal').setLabel('Tidak Setuju').setStyle(ButtonStyle.Secondary));
            const confirmMsg = await message.channel.send({ content: `${partnerMember}`, embeds: [embed], components: [buttons] });
            const collector = confirmMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

            collector.on('collect', async i => {
                if (i.user.id !== partnerId) return i.reply({ content: 'Ini bukan urusanmu!', ephemeral: true });
                await i.deferUpdate();
                collector.stop();
                if (i.customId === 'putus_setuju') {
                    const finalAuthorData = await api.getUser(authorId, authorUsername);
                    const finalPartnerData = await api.getUser(partnerId, partnerMember.user.username);
                    finalAuthorData.pasangan = null;
                    finalPartnerData.pasangan = null;
                    await api.updateUser(authorId, finalAuthorData);
                    await api.updateUser(partnerId, finalPartnerData);
                    await confirmMsg.edit({ content: `🤧 Hubungan antara ${message.author} dan ${partnerMember} telah berakhir.`, embeds: [], components: [] });
                } else { await confirmMsg.edit({ content: `❤️ Permintaan putus ditolak. Hubungan berlanjut!`, embeds: [], components: [] }); }
            });
            collector.on('end', (c, reason) => { if (reason === 'time') confirmMsg.edit({ content: "⌛ Permintaan putus tidak direspons.", embeds: [], components: [] }); });
        }

        else if (command === 'cekpasangan') {
            const checkUser = target ? target.user : message.author;
            const processingMsg = await message.reply(`💞 Mencari data pasangan untuk **${checkUser.username}**...`);
            const userData = await api.getUser(checkUser.id, checkUser.username);
            const partnerId = userData.pasangan;
            if (!partnerId) return processingMsg.edit(`💔 **${checkUser.username}** saat ini jomblo.`);
            
            try {
                const partnerUser = await client.users.fetch(partnerId);
                const user1Avatar = checkUser.displayAvatarURL({ extension: 'png', size: 256 });
                const user2Avatar = partnerUser.displayAvatarURL({ extension: 'png', size: 256 });
                const coupleImageBuffer = await createCoupleImage(user1Avatar, user2Avatar);
                if (!coupleImageBuffer) return processingMsg.edit(`❤️ **${checkUser.username}** berpacaran dengan **${partnerUser.username}**.`);
                
                const attachment = new AttachmentBuilder(coupleImageBuffer, { name: 'pasangan.png' });
                const embed = new EmbedBuilder().setColor(0xFF69B4).setTitle("💕 Pasangan Sejati").setDescription(`**${checkUser.username}**\n❤️\n**${partnerUser.username}**`).setImage('attachment://pasangan.png');
                await processingMsg.edit({ content: null, embeds: [embed], files: [attachment] });
            } catch (error) {
                await processingMsg.edit(`❤️ **${checkUser.username}** berpacaran, tapi datanya tidak dapat diambil.`);
            }
        } 
        
        else {
            const helpEmbed = new EmbedBuilder().setColor(0xFF69B4).setTitle("💞 Bantuan Perintah Pasangan").addFields( { name: "`!tembak @user`", value: "Menyatakan perasaanmu." }, { name: "`!putus`", value: "Memutuskan hubungan." }, { name: "`!cekpasangan`", value: "Melihat status hubungan." });
            return message.reply({ embeds: [helpEmbed] });
        }
    } catch (error) {
        console.error("[PASANGAN CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};