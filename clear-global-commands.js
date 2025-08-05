const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const config = require('./config.js');

// Pastikan token dan clientId sudah benar di config.js Anda
const token = config.token;
const clientId = config.clientId; 

if (!token || !clientId) {
    console.error("Harap isi `token` dan `clientId` di file config.js Anda!");
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`Memulai proses pembersihan slash command global...`);

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: [] },
        );

        console.log(`✅ Berhasil menghapus semua slash command global.`);
    } catch (error) {
        console.error("Gagal membersihkan command:", error);
    }
})();