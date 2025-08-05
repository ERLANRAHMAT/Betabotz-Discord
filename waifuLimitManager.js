const fs = require('fs');
const path = require('path');

const limitFilePath = path.join(__dirname, 'waifu_limits.json');
let limits = {};
const MAX_USES = 100; // Nilai ini yang akan diekspor

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function loadLimits() {
    try {
        if (fs.existsSync(limitFilePath)) {
            const data = fs.readFileSync(limitFilePath, 'utf-8');
            limits = JSON.parse(data);
        } else {
            fs.writeFileSync(limitFilePath, JSON.stringify({}));
        }
    } catch (error) {
        console.error("[Waifu Limiter] Gagal memuat data limit:", error);
    }
}

function saveLimits() {
    fs.writeFileSync(limitFilePath, JSON.stringify(limits, null, 2));
}

function checkLimit(userId) {
    const today = getTodayDateString();
    
    if (!limits[today]) {
        limits = { [today]: {} };
    }

    const usesToday = limits[today][userId] || 0;
    const remaining = MAX_USES - usesToday;
    
    return {
        remaining: remaining > 0 ? remaining : 0,
        isAllowed: usesToday < MAX_USES
    };
}

function useLimit(userId) {
    const today = getTodayDateString();
    if (!limits[today]) {
        limits = { [today]: {} };
    }
    limits[today][userId] = (limits[today][userId] || 0) + 1;
    saveLimits();
}

loadLimits();

// PERBAIKAN: Tambahkan MAX_USES ke dalam exports
module.exports = { checkLimit, useLimit, MAX_USES };