const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, 'temp');
const CACHE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

function getCacheKey(identifier) {
    // Membuat nama file yang aman dari URL atau ID
    return require('crypto').createHash('md5').update(identifier).digest('hex') + '.opus';
}

function findInCache(identifier) {
    const filePath = path.join(tempDir, getCacheKey(identifier));
    if (fs.existsSync(filePath)) {
        fs.utimesSync(filePath, new Date(), new Date()); // Update waktu akses
        console.log(`[Cache] File ditemukan untuk: ${identifier}`);
        return filePath;
    }
    return null;
}

function cleanOldCache() {
    console.log('[Cache Handler] Memulai pembersihan cache lama...');
    const files = fs.readdirSync(tempDir);
    let deletedCount = 0;
    files.forEach(file => {
        const filePath = path.join(tempDir, file);
        try {
            const stats = fs.statSync(filePath);
            if (Date.now() - stats.atimeMs > CACHE_LIFETIME_MS) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        } catch(e) {
            console.error(`[Cache Handler] Gagal memproses file ${file}:`, e);
        }
    });
    if (deletedCount > 0) {
        console.log(`[Cache Handler] Berhasil menghapus ${deletedCount} file cache usang.`);
    }
}

// Jalankan pembersihan setiap 24 jam
setInterval(cleanOldCache, 24 * 60 * 60 * 1000);
cleanOldCache(); // Jalankan sekali saat bot menyala

module.exports = { tempDir, getCacheKey, findInCache };