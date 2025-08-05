const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config'); // Sesuaikan path sesuai struktur folder Anda

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function getHMinus(deadline) {
    const today = new Date();
    const dline = new Date(deadline);
    today.setHours(0,0,0,0); // Set ke awal hari
    dline.setHours(0,0,0,0); // Set ke awal hari
    const diff = Math.floor((dline - today) / (1000 * 60 * 60 * 24));
    return diff;
}

function groupByType(tugasList, type) {
    return tugasList.filter(t => t[type]);
}

function buildTaskContent(list) {
    if (!list.length) return '';
    return list.map(t =>
        `**${t.matakuliah}**\n- *${t.Namatugas}*\n- Deadline: ${formatDate(t.deadline)}`
    ).join('\n\n');
}

async function getTugasMahasiswa() {
    try {
        const url = 'https://api.danafxc.my.id/tugas/mahasiswa';
        console.log('[REMINDER] Mengambil data tugas dari API...');
        const { data } = await axios.get(url);
        if (!data.tugas) {
            console.log('[REMINDER] Gagal: Data tugas kosong atau tidak ditemukan.');
            return [];
        }
        console.log('[REMINDER] Berhasil mengambil data tugas.');
        return data.tugas;
    } catch (e) {
        console.error('[REMINDER] Gagal mengambil data tugas:', e.message || e);
        return [];
    }
}

async function sendReminderToDiscordChannel(client, channelId, embed) {
    const channel = client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        console.error(`[REMINDER] Channel dengan ID ${channelId} tidak ditemukan atau bukan channel teks.`);
        return false;
    }
    try {
        await channel.send({ embeds: [embed] });
        return true;
    } catch (e) {
        console.error(`[REMINDER] Gagal mengirim pesan ke channel ${channelId}:`, e.message || e);
        return false;
    }
}

async function sendTaskReminders(client, commandChannelId = null) {
    const tugasList = await getTugasMahasiswa();
    if (!tugasList.length) {
        console.log('[REMINDER] Tidak ada data tugas untuk dikirim.');
        if (commandChannelId) {
            const channel = client.channels.cache.get(commandChannelId);
            if (channel) channel.send("Tidak ada data tugas yang ditemukan.");
        }
        return;
    }

    const h3Tugas = tugasList.filter(t => getHMinus(t.deadline) === 3);
    const h1Tugas = tugasList.filter(t => getHMinus(t.deadline) === 1);

    // Filter ILAB tasks specifically for H-3 and H-1
    const ilabH3Tugas = h3Tugas.filter(t => t.ilab);
    const ilabH1Tugas = h1Tugas.filter(t => t.ilab);
    const combinedIlabTugas = [...ilabH3Tugas, ...ilabH1Tugas];

    // Determine target channels for general reminders
    let targetGeneralChannelIds = new Set(config.reminderChannelIds || []);
    // Add the channel where the command was issued to the target list
    if (commandChannelId) {
        targetGeneralChannelIds.add(commandChannelId);
    }
    const finalGeneralChannelIds = Array.from(targetGeneralChannelIds);

    const ilabChannelId = config.ilabChannelId; // ID channel khusus ILAB

    for (const channelId of finalGeneralChannelIds) {
        // --- Logika Pengingat H-3 (Umum) ---
        if (h3Tugas.length) {
            let h3Description = '';
            const vclassList = groupByType(h3Tugas, 'vclass');
            const ilabListForGeneral = groupByType(h3Tugas, 'ilab'); // ILAB tasks for general H-3 reminder
            const kelompokList = groupByType(h3Tugas, 'kelompok');
            const praktikumList = groupByType(h3Tugas, 'praktikum');

            if (vclassList.length) h3Description += `\n**=== INFO VCLASS DEADLINE ===**\n${buildTaskContent(vclassList)}\n`;
            if (ilabListForGeneral.length) h3Description += `\n**--- INFO ILAB DEADLINE ---**\n${buildTaskContent(ilabListForGeneral)}\n`;
            if (kelompokList.length) h3Description += `\n**=== INFO TUGAS KELOMPOK ===**\n${buildTaskContent(kelompokList)}\n`;
            if (praktikumList.length) h3Description += `\n**=== INFO PRAKTIKUM DEADLINE ===**\n${buildTaskContent(praktikumList)}\n`;

            if (h3Description.trim()) {
                const embed = new EmbedBuilder()
                    .setColor('#FFD700') // Warna Kuning untuk H-3
                    .setTitle('🔔 REMINDER H-3 DEADLINE TUGAS! 🔔')
                    .setDescription(h3Description.trim())
                    .setTimestamp()
                    .setFooter({ text: 'Jangan lupa dikerjakan ya!' });

                await sendReminderToDiscordChannel(client, channelId, embed);
                console.log(`[REMINDER] H-3 Tugas reminder terkirim ke channel ${channelId}`);
            } else {
                console.log(`[REMINDER] Tidak ada tugas H-3 yang perlu diingatkan di channel ${channelId}.`);
            }
        } else {
            console.log(`[REMINDER] Tidak ada tugas dengan deadline H-3 untuk channel ${channelId}.`);
        }

        // --- Logika Pengingat H-1 (Umum) ---
        if (h1Tugas.length) {
            let h1Description = '';
            const vclassList = groupByType(h1Tugas, 'vclass');
            const ilabListForGeneral = groupByType(h1Tugas, 'ilab'); // ILAB tasks for general H-1 reminder
            const kelompokList = groupByType(h1Tugas, 'kelompok');
            const praktikumList = groupByType(h1Tugas, 'praktikum');

            if (vclassList.length) h1Description += `\n**=== INFO VCLASS DEADLINE ===**\n${buildTaskContent(vclassList)}\n`;
            if (ilabListForGeneral.length) h1Description += `\n**--- INFO ILAB DEADLINE ---**\n${buildTaskContent(ilabListForGeneral)}\n`;
            if (kelompokList.length) h1Description += `\n**=== INFO TUGAS KELOMPOK ===**\n${buildTaskContent(kelompokList)}\n`;
            if (praktikumList.length) h1Description += `\n**=== INFO PRAKTIKUM DEADLINE ===**\n${buildTaskContent(praktikumList)}\n`;

            if (h1Description.trim()) {
                const embed = new EmbedBuilder()
                    .setColor('#FF4500') // Warna OrangeRed untuk H-1 (lebih mendesak)
                    .setTitle('🚨 FINAL REMINDER H-1 DEADLINE TUGAS! 🚨')
                    .setDescription(h1Description.trim())
                    .setTimestamp()
                    .setFooter({ text: 'JANGAN SAMPAI LUPA!' });

                await sendReminderToDiscordChannel(client, channelId, embed);
                console.log(`[REMINDER] H-1 Tugas reminder terkirim ke channel ${channelId}`);
            } else {
                console.log(`[REMINDER] Tidak ada tugas H-1 yang perlu diingatkan di channel ${channelId}.`);
            }
        } else {
            console.log(`[REMINDER] Tidak ada tugas dengan deadline H-1 untuk channel ${channelId}.`);
        }
    }

    // --- Logika Channel Khusus ILAB (H-3 dan H-1 saja) ---
    if (combinedIlabTugas.length && ilabChannelId) {
        let ilabDescription = buildTaskContent(combinedIlabTugas);
        if (ilabDescription.trim()) {
            const embed = new EmbedBuilder()
                .setColor('#8A2BE2') // Warna BlueViolet untuk ILAB
                .setTitle('🧪 INFO TUGAS ILAB (H-3 & H-1) 🧪')
                .setDescription(`Berikut adalah daftar tugas ILAB yang mendekati deadline:\n\n${ilabDescription.trim()}`)
                .setTimestamp()
                .setFooter({ text: 'Perhatian khusus untuk tugas ILAB ini!' });

            await sendReminderToDiscordChannel(client, ilabChannelId, embed);
            console.log(`[REMINDER] Tugas ILAB (H-3 & H-1) terkirim ke channel khusus ILAB ${ilabChannelId}`);
        } else {
            console.log('[REMINDER] Tidak ada tugas ILAB H-3 atau H-1 yang perlu diingatkan.');
        }
    } else if (!ilabChannelId) {
        console.warn('[REMINDER] ilabChannelId tidak ditemukan di config.js. Tugas ILAB tidak akan dikirim ke channel khusus.');
    }
}

module.exports = {
    prefix: "tugasku", // Prefix perintah (misal: !tugasku)
    category: "info",
    aliases: ["tugas", "deadline"],
    /**
     * Mengeksekusi perintah pengingat tugas.
     * @param {import('discord.js').Message} message - Objek pesan Discord.
     * @param {string[]} args - Argumen yang diberikan bersama perintah.
     * @param {import('discord.js').Client} client - Instance klien Discord.
     */
    async execute(message, args, client) {
        // Ambil ID owner dari config.js
        const ownerId = config.ownerId; // Pastikan ini ada di config.js Anda!

        // Cek apakah pengirim pesan adalah owner
        if (message.author.id !== ownerId) {
            return message.reply("Maaf, perintah ini hanya bisa digunakan oleh owner bot.");
        }

        await message.channel.send("🔄 Memeriksa tugas terbaru dan mengirimkan pengingat...");
        // Panggil fungsi pengirim pengingat, sertakan ID channel tempat perintah dikeluarkan
        await sendTaskReminders(client, message.channel.id);
        console.log(`[COMMAND] Tugas reminder dipicu secara manual oleh ${message.author.tag} di channel ${message.channel.id}`);
    },
};