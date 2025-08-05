const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const config = require('./config.js');


// Pastikan token, clientId, dan guildID sudah benar di config.js 
const token = config.token;
const clientId = config.clientId; 
const guildId = config.guildID;

if (!token || !clientId || !guildId) {
    console.error("Harap isi token, clientId, dan guildID di file config.js Anda!");
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`Memulai proses pembersihan slash command untuk guild: ${guildId}`);
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: [] },
        );

        console.log(`✅ Berhasil menghapus semua slash command dari guild.`);
    } catch (error) {
        console.error("Gagal membersihkan command:", error);
    }
})();