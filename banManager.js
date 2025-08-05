const fs = require('fs');
const path = require('path');

const banFilePath = path.join(__dirname, 'banned_users.json');
// Set digunakan untuk pengecekan yang sangat cepat di memori
const bannedUsers = new Set();

/**
 * Memuat daftar ban dari file JSON ke memori saat bot pertama kali menyala.
 */
function loadBans() {
    try {
        if (fs.existsSync(banFilePath)) {
            const data = fs.readFileSync(banFilePath, 'utf-8');
            const bannedData = JSON.parse(data);
            for (const userId in bannedData) {
                bannedUsers.add(userId);
            }
            console.log(`[Ban Manager] Berhasil memuat ${bannedUsers.size} pengguna yang diban.`);
        } else {
            // Jika file tidak ada, buat file kosong
            fs.writeFileSync(banFilePath, JSON.stringify({}));
            console.log('[Ban Manager] File banned_users.json dibuat.');
        }
    } catch (error) {
        console.error('[Ban Manager] Gagal memuat daftar ban:', error);
    }
}

/**
 * Menyimpan seluruh data ban ke file JSON.
 */
function saveBans(bannedData) {
    fs.writeFileSync(banFilePath, JSON.stringify(bannedData, null, 2));
}

/**
 * Menambahkan pengguna ke daftar ban.
 * @param {import('discord.js').User} user - Objek pengguna yang akan diban.
 * @param {string} reason - Alasan ban.
 * @returns {boolean} - True jika berhasil, false jika sudah ada.
 */
function addBan(user, reason) {
    if (bannedUsers.has(user.id)) return false; // Sudah diban

    const data = JSON.parse(fs.readFileSync(banFilePath, 'utf-8'));
    data[user.id] = {
        username: user.username,
        reason: reason,
        bannedAt: new Date().toISOString()
    };
    
    saveBans(data);
    bannedUsers.add(user.id);
    return true;
}

/**
 * Menghapus pengguna dari daftar ban.
 * @param {import('discord.js').User} user - Objek pengguna yang akan di-unban.
 * @returns {boolean} - True jika berhasil, false jika tidak ditemukan.
 */
function removeBan(user) {
    if (!bannedUsers.has(user.id)) return false; // Tidak ada di daftar ban

    const data = JSON.parse(fs.readFileSync(banFilePath, 'utf-8'));
    delete data[user.id];
    
    saveBans(data);
    bannedUsers.delete(user.id);
    return true;
}

/**
 * Mendapatkan semua data pengguna yang diban dari file.
 * @returns {Object}
 */
function getBannedList() {
    return JSON.parse(fs.readFileSync(banFilePath, 'utf-8'));
}

module.exports = {
    bannedUsers,
    loadBans,
    addBan,
    removeBan,
    getBannedList
};