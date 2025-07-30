const api = require('./api_handler.js');

/**
 * Formula untuk menentukan berapa banyak EXP yang dibutuhkan untuk level berikutnya.
 */
const expForNextLevel = level => 5 * (level ** 2) + 50 * level + 100;

const RPG_ROLES = [
    { level: 0, name: "Newbie ㋡" },
    { level: 5, name: "Warrior I" },
    { level: 10, name: "Warrior II" },
    { level: 20, name: "Elite I" },
    { level: 30, name: "Elite II" },
    { level: 50, name: "Master" },
    { level: 75, name: "Grandmaster" },
    { level: 100, name: "Legend" },
    { level: 250, name: "Mythic" },
    { level: 500, name: "Demi-God" },
    { level: 1000, name: "Lord 👑" }
];

function getRoleForLevel(level) {
    let currentRole = RPG_ROLES[0].name;
    for (const role of RPG_ROLES) {
        if (level >= role.level) {
            currentRole = role.name;
        } else {
            break; // Karena daftar sudah urut, kita bisa berhenti
        }
    }
    return currentRole;
}
/**
 * Mencoba menaikkan level pengguna jika EXP mencukupi.
 * Bisa menangani kenaikan beberapa level sekaligus.
 * @param {string} userId - ID pengguna.
 * @param {string} username - Username pengguna.
 * @returns {Promise<Object>}
 */
async function attemptLevelUp(userId, username) {
    try {
        const userData = await api.getUser(userId, username);
        const initialLevel = userData.rpg.level;
        let currentLevel = userData.rpg.level;
        let currentExp = userData.rpg.exp;
        
        let requiredExp = expForNextLevel(currentLevel);

        while (currentExp >= requiredExp) {
            currentLevel++;
            currentExp -= requiredExp;
            requiredExp = expForNextLevel(currentLevel);
        }

        if (currentLevel > initialLevel) {
            const oldRole = getRoleForLevel(initialLevel);
            const newRole = getRoleForLevel(currentLevel);
            
            userData.rpg.level = currentLevel;
            userData.rpg.exp = currentExp;
            
            // Perbarui peran di database jika berubah
            if (newRole !== oldRole) {
                userData.role = newRole;
            }

            await api.updateUser(userId, userData);
            
            return { 
                leveledUp: true, 
                oldLevel: initialLevel, 
                newLevel: currentLevel,
                roleChanged: newRole !== oldRole,
                newRole: newRole
            };
        } else {
            return { 
                leveledUp: false, 
                expNeeded: requiredExp - currentExp,
                currentExp: currentExp,
                requiredExp: requiredExp
            };
        }
    } catch (error) {
        console.error(`[Level Up] Gagal memproses level up untuk user ${userId}:`, error);
        throw error;
    }
}

module.exports = { attemptLevelUp, expForNextLevel };