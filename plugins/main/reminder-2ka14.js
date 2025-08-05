// const axios = require('axios');
// const { EmbedBuilder } = require('discord.js'); // Import EmbedBuilder for rich messages
// // Assuming you have a config file like the gempa bot example
// const config = require('../../config'); // Adjust path as needed

// // Store reminder states for each channel
// let channelReminderStates = {};

// // To track when the last reminder for each type (H-3, H-1) was sent per channel
// // Structure: { 'channelId': { 'H-3': { 'YYYY-MM-DD': true }, 'H-1': { 'YYYY-MM-DD': true } } }
// let lastReminded = {};
// let cachedTugasList = [];

// function formatDate(dateStr) {
//     const [year, month, day] = dateStr.split('-');
//     return `${day}/${month}/${year}`;
// }

// function getHMinus(deadline) {
//     const today = new Date();
//     const dline = new Date(deadline);
//     today.setHours(0,0,0,0);
//     dline.setHours(0,0,0,0);
//     const diff = Math.floor((dline - today) / (1000 * 60 * 60 * 24));
//     return diff;
// }

// function groupByType(tugasList, type) {
//     return tugasList.filter(t => t[type]);
// }

// // Helper to build the message content
// function buildTaskContent(list, typeTitle) {
//     if (!list.length) return '';
//     return list.map(t =>
//         `**${t.matakuliah}**\n- *${t.Namatugas}*\n- Deadline: ${formatDate(t.deadline)}`
//     ).join('\n\n');
// }

// async function getTugasMahasiswa() {
//     try {
//         const url = 'https://api.danafxc.my.id/tugas/mahasiswa';
//         console.log('[REMINDER] Mengambil data tugas dari API...');
//         const { data } = await axios.get(url);
//         if (!data.tugas) {
//             console.log('[REMINDER] Gagal: Data tugas kosong atau tidak ditemukan.');
//             return [];
//         }
//         console.log('[REMINDER] Berhasil mengambil data tugas.');
//         return data.tugas;
//     } catch (e) {
//         console.error('[REMINDER] Gagal mengambil data tugas:', e.message || e);
//         return [];
//     }
// }

// async function sendReminderToDiscordChannel(client, channelId, embed) {
//     const channel = client.channels.cache.get(channelId);
//     if (!channel || !channel.isTextBased()) {
//         console.error(`[REMINDER] Channel with ID ${channelId} not found or not a text channel.`);
//         return false;
//     }
//     try {
//         await channel.send({ embeds: [embed] });
//         return true;
//     } catch (e) {
//         console.error(`[REMINDER] Failed to send message to channel ${channelId}:`, e.message || e);
//         return false;
//     }
// }

// async function updateTugasCache() {
//     const tugasList = await getTugasMahasiswa();
//     cachedTugasList = tugasList;
//     if (!tugasList.length) {
//         console.log('[REMINDER] Tidak ada data tugas yang diambil dari API (cache update).');
//     } else {
//         console.log(`[REMINDER] Cache tugas diperbarui. Jumlah tugas: ${tugasList.length}`);
//     }
// }

// async function tugasReminder(client) {
//     const tugasList = cachedTugasList;
//     if (!tugasList.length) {
//         console.log('[REMINDER] Tidak ada data tugas pada cache untuk dikirim.');
//         return;
//     }

//     const today = new Date();
//     const todayStr = today.toISOString().slice(0,10); // e.g., '2025-07-06'

//     const h3Tugas = tugasList.filter(t => getHMinus(t.deadline) === 3);
//     const h1Tugas = tugasList.filter(t => getHMinus(t.deadline) === 1);

//     // Get the reminder channel IDs from config
//     const reminderChannelIds = config.reminderChannelIds || [];
//     if (reminderChannelIds.length === 0) {
//         console.warn('[REMINDER] No reminderChannelIds found in config. Please add them.');
//         return;
//     }

//     for (const channelId of reminderChannelIds) {
//         // Initialize lastReminded for this channel if not present
//         if (!lastReminded[channelId]) {
//             lastReminded[channelId] = { 'H-3': {}, 'H-1': {} };
//         }

//         // --- H-3 Reminder Logic ---
//         if (h3Tugas.length && !lastReminded[channelId]['H-3'][todayStr]) {
//             let h3Description = '';
//             const vclassList = groupByType(h3Tugas, 'vclass');
//             const ilabList = groupByType(h3Tugas, 'ilab');
//             const kelompokList = groupByType(h3Tugas, 'kelompok');
//             const praktikumList = groupByType(h3Tugas, 'praktikum');

//             if (vclassList.length) h3Description += `\n**=== INFO VCLASS DEADLINE ===**\n${buildTaskContent(vclassList)}\n`;
//             if (ilabList.length) h3Description += `\n**--- INFO ILAB DEADLINE ---**\n${buildTaskContent(ilabList)}\n`;
//             if (kelompokList.length) h3Description += `\n**=== INFO TUGAS KELOMPOK ===**\n${buildTaskContent(kelompokList)}\n`;
//             if (praktikumList.length) h3Description += `\n**=== INFO PRAKTIKUM DEADLINE ===**\n${buildTaskContent(praktikumList)}\n`;

//             if (h3Description.trim()) {
//                 const embed = new EmbedBuilder()
//                     .setColor('#FFD700') // Yellow color for H-3
//                     .setTitle('🔔 REMINDER H-3 DEADLINE TUGAS! 🔔')
//                     .setDescription(h3Description.trim())
//                     .setTimestamp()
//                     .setFooter({ text: 'Jangan lupa dikerjakan ya!' });

//                 const sent = await sendReminderToDiscordChannel(client, channelId, embed);
//                 if (sent) {
//                     lastReminded[channelId]['H-3'][todayStr] = true;
//                     console.log(`[REMINDER] H-3 Tugas reminder sent to channel ${channelId} for ${todayStr}`);
//                 }
//             } else {
//                 console.log(`[REMINDER] Tidak ada tugas H-3 yang perlu diingatkan di channel ${channelId} hari ini.`);
//             }
//         } else if (h3Tugas.length && lastReminded[channelId]['H-3'][todayStr]) {
//             console.log(`[REMINDER] H-3 Reminder sudah dikirim ke channel ${channelId} hari ini.`);
//         } else {
//             console.log(`[REMINDER] Tidak ada tugas dengan deadline H-3 untuk channel ${channelId} hari ini.`);
//         }

//         // --- H-1 Reminder Logic ---
//         if (h1Tugas.length && !lastReminded[channelId]['H-1'][todayStr]) {
//             let h1Description = '';
//             const vclassList = groupByType(h1Tugas, 'vclass');
//             const ilabList = groupByType(h1Tugas, 'ilab');
//             const kelompokList = groupByType(h1Tugas, 'kelompok');
//             const praktikumList = groupByType(h1Tugas, 'praktikum');

//             if (vclassList.length) h1Description += `\n**=== INFO VCLASS DEADLINE ===**\n${buildTaskContent(vclassList)}\n`;
//             if (ilabList.length) h1Description += `\n**--- INFO ILAB DEADLINE ---**\n${buildTaskContent(ilabList)}\n`;
//             if (kelompokList.length) h1Description += `\n**=== INFO TUGAS KELOMPOK ===**\n${buildTaskContent(kelompokList)}\n`;
//             if (praktikumList.length) h1Description += `\n**=== INFO PRAKTIKUM DEADLINE ===**\n${buildTaskContent(praktikumList)}\n`;

//             if (h1Description.trim()) {
//                 const embed = new EmbedBuilder()
//                     .setColor('#FF4500') // OrangeRed color for H-1 (more urgent)
//                     .setTitle('🚨 FINAL REMINDER H-1 DEADLINE TUGAS! 🚨')
//                     .setDescription(h1Description.trim())
//                     .setTimestamp()
//                     .setFooter({ text: 'TINGGAL HARI INI LOH!' });

//                 const sent = await sendReminderToDiscordChannel(client, channelId, embed);
//                 if (sent) {
//                     lastReminded[channelId]['H-1'][todayStr] = true;
//                     console.log(`[REMINDER] H-1 Tugas reminder sent to channel ${channelId} for ${todayStr}`);
//                 }
//             } else {
//                 console.log(`[REMINDER] Tidak ada tugas H-1 yang perlu diingatkan di channel ${channelId} hari ini.`);
//             }
//         } else if (h1Tugas.length && lastReminded[channelId]['H-1'][todayStr]) {
//             console.log(`[REMINDER] H-1 Reminder sudah dikirim ke channel ${channelId} hari ini.`);
//         } else {
//             console.log(`[REMINDER] Tidak ada tugas dengan deadline H-1 untuk channel ${channelId} hari ini.`);
//         }
//     }
// }

// // Function to start the polling interval
// function startTugasReminderPolling(client) {
//     console.log('[REMINDER] Starting tugas reminder polling...');
//     // Initial cache update
//     updateTugasCache();

//     // Set up the interval to run every minute
//     setInterval(async () => {
//         const now = new Date();
//         await updateTugasCache(); // Fetch data every minute to ensure it's fresh

//         // Check if it's 8 PM (20:00) to send reminders
//         if (now.getHours() === 20 && now.getMinutes() === 28) {
//             console.log('[REMINDER] Mengecek tugas pada jam 20:00...');
//             await tugasReminder(client);
//         } else {
//             // console.log(`[REMINDER] Interval aktif, sekarang jam ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
//         }
//     }, 60 * 1000); // 60 * 1000 milliseconds = 1 minute
// }

// module.exports = {
//     // You can define a command for manual reminder check, if desired
//     prefix: "tugasku", // Example command prefix
//     category: "info",
//     aliases: ["tugas", "deadline"],
//     async execute(message, args, client) {
//         // You could implement a manual trigger for the reminder here
//         // For simplicity, this example primarily focuses on the automatic timer
//         // However, if a user explicitly asks, you could trigger a check
//         message.reply("🔄 Memeriksa tugas terbaru...");
//         await updateTugasCache();
//         await tugasReminder(client); // Trigger immediate check
//     },
//     // This is important: Start the polling when the bot is ready
//     init: (client) => {
//         startTugasReminderPolling(client);
//     },
//     // This could be used if you want to also check on every message
//     // handleMessage: (message, client) => {
//     //     // Optionally start polling here if not using 'init'
//     // },
// };