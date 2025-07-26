const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');

const defaultUser = {
    username: '',
    money: 1000000,
    limit: 25,
    banned: { status: false, reason: null },
    pasangan: null,
    proposalFrom: null,
    rpg: { level: 1, exp: 0, health: 100, mana: 50, inventory: {} }
};

const defaultGuild = {
    name: '',
    antiBadword: { enabled: false }
};

const defaultData = {
    users: {},
    guilds: {},
    global: { badwords: ["anjing", "babi", "kontol", "memek", "asu"] }
};

let db = {};

try {
    const data = fs.readFileSync(dbPath, 'utf8');
    db = JSON.parse(data);
} catch (error) {
    console.log("[Database] File database.json tidak ditemukan, membuat file baru.");
    db = defaultData;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function save() {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    } catch (error) {
        console.error("[Database] Gagal menyimpan database:", error);
    }
}

setInterval(() => {
    save();
    // console.log("[Database] Autosave berhasil."); // Uncomment untuk debugging
}, 30000);

// ==================== PERBAIKAN DI SINI ====================
// Fungsi ini sekarang lebih pintar:
// 1. Membuat user baru jika tidak ada.
// 2. Memperbaiki data user lama jika ada properti yang hilang atau null.
function ensureUser(userId, username) {
    if (!db.users[userId]) {
        db.users[userId] = JSON.parse(JSON.stringify(defaultUser));
    } else {
        // Untuk pengguna lama, periksa & perbaiki properti penting yang mungkin hilang/null
        if (typeof db.users[userId].money !== 'number') {
            db.users[userId].money = defaultUser.money;
        }
        if (typeof db.users[userId].limit !== 'number') {
            db.users[userId].limit = defaultUser.limit;
        }
        // Pastikan substruktur lain juga ada
        db.users[userId].banned = db.users[userId].banned || defaultUser.banned;
        db.users[userId].rpg = db.users[userId].rpg || defaultUser.rpg;
    }
    db.users[userId].username = username; // Selalu update username terbaru
}
// ==================== AKHIR PERBAIKAN ====================

function ensureGuild(guildId, guildName) {
    if (!db.guilds[guildId]) {
        db.guilds[guildId] = JSON.parse(JSON.stringify(defaultGuild));
    }
    db.guilds[guildId].name = guildName;
}

module.exports = { db, save, ensureUser, ensureGuild };