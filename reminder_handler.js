const { EmbedBuilder } = require('discord.js');
const api = require('./api_handler.js');
const config = require('./config.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

let clientInstance;
const sentReminders = new Map(); 
let lastKnownQuake = null;
let prayerSchedules = new Map(); 


const quakeCachePath = path.join(__dirname, 'quake_cache.json');


// Baca cache gempa terakhir dari file saat bot pertama kali menyala
try {
    if (fs.existsSync(quakeCachePath)) {
        const data = fs.readFileSync(quakeCachePath, 'utf-8');
        if (data) {
            lastKnownQuake = JSON.parse(data);
            console.log("[Reminder Handler] Berhasil memuat cache gempa terakhir.");
        } else {
            lastKnownQuake = null;
        }
    } else {
        // Jika file tidak ada, buat file baru dengan isi null
        fs.writeFileSync(quakeCachePath, 'null');
        lastKnownQuake = null;
        console.log("[Reminder Handler] File quake_cache.json tidak ditemukan, file baru telah dibuat.");
    }
} catch (e) {
    console.error("[Reminder Handler] Gagal memproses quake_cache.json:", e);
    lastKnownQuake = null;
}




async function fetchCuaca(location) {
    const url = `https://api.betabotz.eu.org/api/tools/cuaca?query=${encodeURIComponent(location)}&apikey=${config.apikey_lann}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data?.result;
    } catch (e) {
        console.error(`[Cuaca API] Gagal fetch:`, e);
        return null;
    }
}

async function checkWeatherReminders() {
    if (!clientInstance) return;

    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

     if (currentTime === "00:00") {
        sentReminders.clear();
         console.log("[Reminder Handler] Pelacak pengingat harian direset.");
     }

    const reminders = await api.getWeatherReminders();
    for (const reminder of reminders) {
        if (reminder.waktu === currentTime && !sentReminders.has(reminder.Ch)) {
            console.log(`[Reminder Handler] Mengirim pengingat cuaca ke channel ${reminder.Ch}...`);
            try {
                const info = await fetchCuaca(reminder.kota);
                if (!info) continue;

                const channel = await clientInstance.channels.fetch(reminder.Ch);
                const embed = new EmbedBuilder()
                    .setColor("#67DFF4").setTitle(`🌤️ INFORMASI CUACA (${info.location})`)
                    .setDescription(`Cuaca saat ini: **${info.weather}** dengan suhu **${info.currentTemp}**.`)
                    .addFields(
                        { name: 'Suhu Min/Maks', value: `${info.minTemp} / ${info.maxTemp}`, inline: true },
                        { name: 'Kelembapan', value: info.humidity, inline: true },
                        { name: 'Angin', value: info.windSpeed, inline: true }
                    );
                
                await channel.send({ embeds: [embed] });
                sentReminders.set(reminder.Ch, true); 

            } catch (e) {
                console.error(`[Reminder Handler] Gagal mengirim ke channel ${reminder.Ch}:`, e);
            }
        }
    }
}

async function checkQuake() {
    if (!clientInstance) return;
    try {
        const url = `https://api.danafxc.my.id/api/proxy/features/gempa?apikey=${config.api.apiKey}`;
        const response = await fetch(url);
        const result = await response.json();
        const newQuake = result?.data;

        if (!newQuake || !result.status) {
            console.log("[Reminder Handler] Data gempa dari API baru tidak valid.");
            return;
        }
        if (!lastKnownQuake || lastKnownQuake.DateTime !== newQuake.DateTime) {
            console.log(`[Reminder Handler] Gempa baru terdeteksi: ${newQuake.Wilayah}`);
            lastKnownQuake = newQuake; 

            fs.writeFileSync(quakeCachePath, JSON.stringify(newQuake, null, 2));

            const subscribedChannels = await api.getQuakeReminders();
            if (subscribedChannels.length === 0) return;
            const shakemapUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${newQuake.Shakemap}`;

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C).setTitle(`🚨 Peringatan Gempa Bumi`)
                .setDescription(`**${newQuake.Wilayah}**`)
                .setImage(shakemapUrl)
                .addFields(
                    { name: 'Waktu', value: `${newQuake.Tanggal} - ${newQuake.Jam}`, inline: false },
                    { name: 'Magnitudo', value: newQuake.Magnitude, inline: true },
                    { name: 'Kedalaman', value: newQuake.Kedalaman, inline: true },
                    { name: 'Potensi', value: newQuake.Potensi, inline: true },
                    { name: 'Dirasakan', value: newQuake.Dirasakan, inline: false }
                )
                .setFooter({ text: "Sumber data: BMKG" });

            for (const sub of subscribedChannels) {
                try {
                    const channel = await clientInstance.channels.fetch(sub.Ch);
                    await channel.send({ embeds: [embed] });
                } catch (e) {
                    console.error(`[Reminder Handler] Gagal mengirim notif gempa ke channel ${sub.Ch}:`, e);
                }
            }
        }
    } catch (e) {
        console.error("[Reminder Handler] Gagal mengambil data gempa:", e);
    }
}

function resetSentStatus(channelId) {
    if (sentReminders.has(channelId)) {
        sentReminders.delete(channelId);
        console.log(`[Reminder Handler] Status pengiriman untuk channel ${channelId} telah direset.`);
    }
}

async function fetchPrayerSchedule(city) {
    const url = `https://api.betabotz.eu.org/api/tools/jadwalshalat?kota=${encodeURIComponent(city)}&apikey=${config.apikey_lann}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status && data.result.code === 200) {
            const today = new Date().toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '-');
            const schedule = data.result.data.find(d => d.date.gregorian.date === today);
            return schedule?.timings;
        }
    } catch (e) { console.error(`[Prayer Handler] Gagal mengambil jadwal untuk ${city}:`, e); }
    return null;
}

async function updateAllPrayerSchedules() {
    console.log("[Prayer Handler] Memperbarui semua jadwal sholat...");
    const reminders = await api.getPrayerReminders();
    if (!reminders) return;
    const uniqueCities = [...new Set(reminders.map(r => r.kota.toLowerCase()))];
    for (const city of uniqueCities) {
        const schedule = await fetchPrayerSchedule(city);
        if (schedule) {
            prayerSchedules.set(city, schedule);
            console.log(`[Prayer Handler] Jadwal untuk ${city} berhasil diperbarui.`);
        }
    }
}

async function checkPrayerReminders() {
    if (!clientInstance) return;
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const reminders = await api.getPrayerReminders();
    if (!reminders) return;

    for (const reminder of reminders) {
        const schedule = prayerSchedules.get(reminder.kota.toLowerCase());
        if (!schedule) continue;

        for (const [prayerName, prayerTime] of Object.entries(schedule)) {
            if (prayerTime.startsWith(currentTime) && ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(prayerName)) {
                 try {
                    const channel = await clientInstance.channels.fetch(reminder.Ch);
                    const embed = new EmbedBuilder()
                        .setColor(0x2ECC71).setTitle(`🕌 Waktunya Sholat ${prayerName}!` )
                        .setDescription(`Untuk wilayah **${reminder.kota}** dan sekitarnya.\n\n*"Maka laksanakanlah shalat itu (sebagaimana biasa). Sungguh, shalat itu adalah kewajiban yang ditentukan waktunya atas orang-orang yang beriman."*`);
                    await channel.send({ embeds: [embed] });
                 } catch(e) { console.error(`[Prayer Handler] Gagal mengirim notif sholat ke ${reminder.Ch}:`, e); }
            }
        }
    }
}

async function runAllChecks() {
    if (!clientInstance) return;
    // console.log("[Reminder Handler] Menjalankan semua pengecekan terjadwal... ini buat debug");
    await checkWeatherReminders();
    await checkPrayerReminders();
    await checkQuake();
}

module.exports = {
    init: (client) => {
        clientInstance = client;
        console.log("[Reminder Handler] Diinisialisasi.");
        
        updateAllPrayerSchedules(); 
        setInterval(updateAllPrayerSchedules, 12 * 60 * 60 * 1000); 

        runAllChecks();
        setInterval(runAllChecks, 60000);
    },
    resetSentStatus: (channelId) => {
        if (sentWeatherReminders.has(channelId)) {
            sentWeatherReminders.delete(channelId);
            console.log(`[Reminder Handler] Status pengiriman cuaca untuk channel ${channelId} direset.`);
        }
    },
    updateAllPrayerSchedules: updateAllPrayerSchedules, 
    resetSentStatus: resetSentStatus 
};