const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');const { db } = require('../../database.js');
const config = require('../../config.js'); 
const { createCanvas, loadImage } = require('canvas');


//fungsi canva nya
async function createCoupleImage(user1AvatarUrl, user2AvatarUrl) {
    try {
        const avatar1 = await loadImage(user1AvatarUrl);
        const avatar2 = await loadImage(user2AvatarUrl);
        const canvasSize = 256;
        const canvas = createCanvas(canvasSize * 2, canvasSize);
        const ctx = canvas.getContext('2d');

        const drawImageCover = (img, x, y, w, h) => {
            const imgRatio = img.width / img.height;
            const canvasRatio = w / h;
            let sx, sy, sWidth, sHeight;
            if (imgRatio > canvasRatio) {
                sHeight = img.height; sWidth = sHeight * canvasRatio;
                sx = (img.width - sWidth) / 2; sy = 0;
            } else {
                sWidth = img.width; sHeight = sWidth / canvasRatio;
                sy = (img.height - sHeight) / 2; sx = 0;
            }
            ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
        };

        drawImageCover(avatar1, 0, 0, canvasSize, canvasSize);
        drawImageCover(avatar2, canvasSize, 0, canvasSize, canvasSize);

        ctx.font = '64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'red';
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
  aliases: ["tembak", "terima", "tolak", "putus", "cekpasangan"],
  
  async execute(message, args, client) {
    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();
    const authorId = message.author.id;
    const target = message.mentions.members.first();

    // Pastikan data pengguna ada di database sebelum melanjutkan
    if (target) {
        db.users[target.id] = db.users[target.id] || { username: target.user.username };
    }
    
    // --- Sub-perintah TEMBAK ---
    if (command === 'tembak') {
        if (!target) return message.reply("Kamu mau nembak siapa? Mention orangnya! Contoh: `!tembak @user`");
        if (target.id === authorId) return message.reply("Tidak bisa menembak diri sendiri!");
        if (db.users[authorId].pasangan) return message.reply(`Kamu sudah punya pasangan! Setia dong.`);
        if (db.users[target.id].pasangan) return message.reply(`Maaf, ${target.user.username} sudah punya pasangan. kamu telat nembak nya :b`);
        if (db.users[target.id].proposalFrom) return message.reply(`${target.user.username} sedang menunggu jawaban dari orang lain.`);

        db.users[target.id].proposalFrom = authorId;
        
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle("💌 Sebuah Surat Cinta Tiba!")
            .setDescription(`${message.author} telah menyatakan perasaannya kepadamu, ${target}!\n\nApa jawabanmu?`)
            .setFooter({ text: "Kamu punya waktu 2 menit untuk menjawab." });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pasangan_terima').setLabel('Terima').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('pasangan_tolak').setLabel('Tolak').setStyle(ButtonStyle.Danger)
        );

        const proposalMsg = await message.channel.send({ content: `${target}`, embeds: [embed], components: [buttons] });
        const collector = proposalMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

        collector.on('collect', async i => {
            if (i.user.id !== target.id) return i.reply({ content: 'Bukan untukmu!', ephemeral: true });
            
            await i.deferUpdate();
            if (i.customId === 'pasangan_terima') {
                db.users[authorId].pasangan = target.id;
                db.users[target.id].pasangan = authorId;
                delete db.users[target.id].proposalFrom;
                await proposalMsg.edit({ 
                    content: `🎉 Selamat! ${target.user.username} dan ${message.author.username} sekarang resmi berpacaran!`, 
                    embeds: [], components: [] 
                });
            } else {
                delete db.users[target.id].proposalFrom;
                await proposalMsg.edit({ 
                    content: `💔 Yah, ${message.author.username}, cintamu ditolak oleh ${target.user.username}.`, 
                    embeds: [], components: [] 
                });
            }
            collector.stop();
        });
        collector.on('end', (c, reason) => {
            if (reason === 'time') {
                if(db.users[target.id]) delete db.users[target.id].proposalFrom;
                proposalMsg.edit({ content: "⌛ Lamaran tidak dijawab dan telah kedaluwarsa.", embeds: [], components: [] });
            }
        });
    }
    
    // --- Sub-perintah PUTUS ---
    else if (command === 'putus') {
        const partnerId = db.users[authorId].pasangan;
        if (!partnerId) {
            return message.reply("Kamu jomblo, mau mutusin siapa? :(");
        }

        // Ambil objek member dari partner
        let partnerMember;
        try {
            partnerMember = await message.guild.members.fetch(partnerId);
        } catch (error) {
            // Jika partner sudah tidak ada di server, putuskan secara sepihak
            db.users[authorId].pasangan = null;
            return message.reply("Pasanganmu sudah tidak ada di server ini. Hubungan kalian otomatis berakhir.");
        }

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle("💔 Permintaan Putus Hubungan")
            .setDescription(`${message.author} ingin putus denganmu, ${partnerMember}.\n\nApakah kamu setuju untuk mengakhiri hubungan ini?`)
            .setFooter({ text: "Kamu punya waktu 2 menit untuk merespons." });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('putus_setuju').setLabel('Setuju Putus').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('putus_batal').setLabel('Tidak Setuju').setStyle(ButtonStyle.Secondary)
        );

        const confirmationMsg = await message.channel.send({ content: `${partnerMember}`, embeds: [embed], components: [buttons] });

        const collector = confirmationMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

        collector.on('collect', async i => {
            // Hanya partner yang bisa merespons
            if (i.user.id !== partnerId) {
                return i.reply({ content: 'Ini bukan urusanmu!', ephemeral: true });
            }

            await i.deferUpdate();
            if (i.customId === 'putus_setuju') {
                db.users[authorId].pasangan = null;
                db.users[partnerId].pasangan = null;
                await confirmationMsg.edit({ 
                    content: `🤧 Atas persetujuan bersama, hubungan antara ${message.author} dan ${partnerMember} telah berakhir.`, 
                    embeds: [], components: [] 
                });
            } else { // putus_batal
                await confirmationMsg.edit({ 
                    content: `❤️ Permintaan putus ditolak oleh ${partnerMember}. Hubungan kalian masih berlanjut!`, 
                    embeds: [], components: [] 
                });
            }
            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                confirmationMsg.edit({ content: "⌛ Permintaan putus tidak direspons dan dibatalkan.", embeds: [], components: [] });
            }
        });
    }


    // --- Sub-perintah CEKPASANGAN ---
    else if (command === 'cekpasangan') {
        const checkUser = target ? target.user : message.author;
        const partnerId = db.users[checkUser.id]?.pasangan;

        if (!partnerId) {
            return message.reply(`💔 **${checkUser.username}** saat ini jomblo.`);
        }

        const processingMsg = await message.reply(`💞 Mencari data pasangan untuk **${checkUser.username}**...`);
        
        try {
            // Ambil data pengguna partner
            const partnerUser = await client.users.fetch(partnerId);

            // Siapkan URL avatar
            const user1Avatar = checkUser.displayAvatarURL({ extension: 'png', size: 256 });
            const user2Avatar = partnerUser.displayAvatarURL({ extension: 'png', size: 256 });

            // Buat gambar gabungan
            const coupleImageBuffer = await createCoupleImage(user1Avatar, user2Avatar);

            if (!coupleImageBuffer) {
                // Fallback jika pembuatan gambar gagal
                return processingMsg.edit(`❤️ **${checkUser.username}** sedang berpacaran dengan **${partnerUser.username}**.`);
            }

            const attachment = new AttachmentBuilder(coupleImageBuffer, { name: 'pasangan.png' });
            const embed = new EmbedBuilder()
                .setColor(0xFF69B4)
                .setTitle("💕 Pasangan Sejati")
                .setDescription(`**${checkUser.username}**\n❤️\n**${partnerUser.username}**`)
                .setImage('attachment://pasangan.png');

            await processingMsg.edit({ content: null, embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error("Error saat cek pasangan:", error);
            await processingMsg.edit(`❤️ **${checkUser.username}** sedang berpacaran dengan seseorang, tetapi datanya tidak dapat diambil.`);
        }
    }
  },
};