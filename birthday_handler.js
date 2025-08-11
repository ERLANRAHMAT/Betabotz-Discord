const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

let clientInstance;
const dataFilePath = path.join(__dirname, 'birthday_data.json');
const birthdaysFilePath = path.join(__dirname, 'birthdays.json');
const configsFilePath = path.join(__dirname, 'birthday_configs.json');

const readJson = (filePath, defaultValue) => {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return data ? JSON.parse(data) : defaultValue;
        }
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
        console.log(`[Birthday Handler] File ${path.basename(filePath)} tidak ditemukan, file baru telah dibuat.`);
        return defaultValue;
    } catch (error) {
        console.error(`Gagal memproses ${path.basename(filePath)}:`, error);
        return defaultValue;
    }
};

function loadData(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return data ? JSON.parse(data) : defaultValue;
        } else {
            fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
            return defaultValue;
        }
    } catch (error) {
        console.error(`Gagal memuat atau mem-parse ${path.basename(filePath)}:`, error);
        return defaultValue;
    }
}

async function checkBirthdays() {
    if (!clientInstance) return;

    const allServerData = readJson(dataFilePath, {});
    if (Object.keys(allServerData).length === 0) return;

    const now = new Date();

    // Loop melalui setiap server yang memiliki data
    for (const guildId in allServerData) {
        const serverData = allServerData[guildId];
        const birthdays = serverData.birthdays || [];
        const configs = serverData.configs || {};

        if (birthdays.length === 0 || Object.keys(configs).length === 0) continue;

        // Loop melalui setiap ulang tahun di server tersebut
        for (const person of birthdays) {
            // Loop melalui setiap konfigurasi channel di server tersebut
            for (const channelId in configs) {
                const config = configs[channelId];
                
                const targetDate = new Date();
                targetDate.setDate(now.getDate() + (config.daysInAdvance || 0));
                
                if (person.month === (targetDate.getMonth() + 1) && person.day === targetDate.getDate()) {
                    const [hour, minute] = config.time.split(':').map(Number);

                    if (now.getHours() === hour && now.getMinutes() === minute) {
                        try {
                            const channel = await clientInstance.channels.fetch(channelId);
                            if (!channel) continue;

                            const mentionString = (config.mentionRoleIds || []).map(id => `<@&${id}>`).join(' ');
                            
                            let embed;
                            if (config.isStaffReminder) {
                                embed = new EmbedBuilder()
                                    .setColor(0x3498DB).setTitle("🔔 Pengingat Ulang Tahun Staf")
                                    .setDescription(`Dalam **${config.daysInAdvance} hari** lagi, **${person.name}** (<@${person.userId}>) akan berulang tahun!`);
                            } else {
                                embed = new EmbedBuilder()
                                    .setColor(0xFFD700).setTitle("🎉 Selamat Ulang Tahun!")
                                    .setDescription(`Selamat ulang tahun untuk <@${person.userId}>! Semoga panjang umur dan sehat selalu! 🥳`)
                                    .setThumbnail(person.avatar || null);
                            }
                            await channel.send({ content: mentionString, embeds: [embed] });
                        } catch (e) { console.error(`[Birthday] Gagal mengirim notifikasi ke channel ${channelId}:`, e); }
                    }
                }
            }
        }
    }
}
module.exports = {
    init: (client) => {
        clientInstance = client;
        console.log("[Birthday Handler] Diinisialisasi dengan struktur multi-server.");
        setInterval(checkBirthdays, 60000);
    }
};