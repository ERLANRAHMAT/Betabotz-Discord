const api = require('./api_handler.js');


const expForNextLevel = level => 5 * (level ** 2) + 50 * level + 100;

const RPG_ROLES = [
    { level: 0,    name: 'Newbie ㋡' },
    { level: 2,    name: 'Beginner Grade 1 ⚊¹' },
    { level: 4,    name: 'Beginner Grade 2 ⚊²' },
    { level: 6,    name: 'Beginner Grade 3 ⚊³' },
    { level: 8,    name: 'Beginner Grade 4 ⚊⁴' },
    { level: 10,   name: 'Private Grade 1 ⚌¹' },
    { level: 20,   name: 'Private Grade 2 ⚌²' },
    { level: 30,   name: 'Private Grade 3 ⚌³' },
    { level: 40,   name: 'Private Grade 4 ⚌⁴' },
    { level: 50,   name: 'Private Grade 5 ⚌⁵' },
    { level: 60,   name: 'Corporal Grade 1 ☰¹' },
    { level: 70,   name: 'Corporal Grade 2 ☰²' },
    { level: 80,   name: 'Corporal Grade 3 ☰³' },
    { level: 90,   name: 'Corporal Grade 4 ☰⁴' },
    { level: 100,  name: 'Corporal Grade 5 ☰⁵' },
    { level: 110,  name: 'Sergeant Grade 1 ≣¹' },
    { level: 120,  name: 'Sergeant Grade 2 ≣²' },
    { level: 130,  name: 'Sergeant Grade 3 ≣³' },
    { level: 140,  name: 'Sergeant Grade 4 ≣⁴' },
    { level: 150,  name: 'Sergeant Grade 5 ≣⁵' },
    { level: 160,  name: 'Staff Grade 1 ﹀¹' },
    { level: 170,  name: 'Staff Grade 2 ﹀²' },
    { level: 180,  name: 'Staff Grade 3 ﹀³' },
    { level: 190,  name: 'Staff Grade 4 ﹀⁴' },
    { level: 200,  name: 'Staff Grade 5 ﹀⁵' },
    { level: 210,  name: 'Sergeant Grade 1 ︾¹' },
    { level: 220,  name: 'Sergeant Grade 2 ︾²' },
    { level: 230,  name: 'Sergeant Grade 3 ︾³' },
    { level: 240,  name: 'Sergeant Grade 4 ︾⁴' },
    { level: 250,  name: 'Sergeant Grade 5 ︾⁵' },
    { level: 260,  name: '2nd Lt. Grade 1 ♢¹' },
    { level: 270,  name: '2nd Lt. Grade 2 ♢²' },
    { level: 280,  name: '2nd Lt. Grade 3 ♢³' },
    { level: 290,  name: '2nd Lt. Grade 4 ♢⁴' },
    { level: 300,  name: '2nd Lt. Grade 5 ♢⁵' },
    { level: 310,  name: '1st Lt. Grade 1 ♢♢¹' },
    { level: 320,  name: '1st Lt. Grade 2 ♢♢²' },
    { level: 330,  name: '1st Lt. Grade 3 ♢♢³' },
    { level: 340,  name: '1st Lt. Grade 4 ♢♢⁴' },
    { level: 350,  name: '1st Lt. Grade 5 ♢♢⁵' },
    { level: 360,  name: 'Major Grade 1 ✷¹' },
    { level: 370,  name: 'Major Grade 2 ✷²' },
    { level: 380,  name: 'Major Grade 3 ✷³' },
    { level: 390,  name: 'Major Grade 4 ✷⁴' },
    { level: 400,  name: 'Major Grade 5 ✷⁵' },
    { level: 410,  name: 'Colonel Grade 1 ✷✷¹' },
    { level: 420,  name: 'Colonel Grade 2 ✷✷²' },
    { level: 430,  name: 'Colonel Grade 3 ✷✷³' },
    { level: 440,  name: 'Colonel Grade 4 ✷✷⁴' },
    { level: 450,  name: 'Colonel Grade 5 ✷✷⁵' },
    { level: 460,  name: 'Brigadier Early ✰' },
    { level: 470,  name: 'Brigadier Silver ✩' },
    { level: 480,  name: 'Brigadier gold ✯' },
    { level: 490,  name: 'Brigadier Platinum ✬' },
    { level: 500,  name: 'Brigadier Diamond ✪' },
    { level: 600,  name: 'Legendary 忍' },
    { level: 700,  name: 'Legendary 忍忍' },
    { level: 800,  name: 'Legendary 忍忍忍' },
    { level: 900,  name: 'Legendary忍忍忍忍' },
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