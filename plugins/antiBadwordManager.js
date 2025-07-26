const fs = require('fs');
const path = require('path');

const configFilePath = path.join(__dirname, 'antikatakasar_config.json');
// Set digunakan untuk pengecekan di memori yang super cepat
const enabledGuilds = new Set();

function loadConfig() {
    try {
        if (fs.existsSync(configFilePath)) {
            const data = fs.readFileSync(configFilePath, 'utf-8');
            const configData = JSON.parse(data);
            for (const guildId in configData) {
                if (configData[guildId] === true) {
                    enabledGuilds.add(guildId);
                }
            }
            console.log(`[Anti-Badword] Berhasil memuat konfigurasi untuk ${enabledGuilds.size} server.`);
        } else {
            fs.writeFileSync(configFilePath, JSON.stringify({}));
            console.log('[Anti-Badword] File konfigurasi dibuat.');
        }
    } catch (error) {
        console.error('[Anti-Badword] Gagal memuat konfigurasi:', error);
    }
}

function saveConfig(configData) {
    fs.writeFileSync(configFilePath, JSON.stringify(configData, null, 2));
}

function enable(guildId) {
    const configData = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    configData[guildId] = true;
    saveConfig(configData);
    enabledGuilds.add(guildId);
}

function disable(guildId) {
    const configData = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    delete configData[guildId];
    saveConfig(configData);
    enabledGuilds.delete(guildId);
}

module.exports = { enabledGuilds, loadConfig, enable, disable };