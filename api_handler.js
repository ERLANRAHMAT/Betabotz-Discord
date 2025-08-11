const axios = require('axios');
const config = require('./config');

const API_BASE = config.api.baseUrl;
const API_KEY = config.api.apiKey;

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
    params: {
        apikey: API_KEY 
    }
});

/**
 * Mengambil data user dari API.
 * @param {string} userId - ID pengguna Discord.
 * @param {string} username - Username pengguna.
 * @returns {Promise<Object>} - Data pengguna dari database.
 */
async function getUser(userId, username) {
    try {
        const response = await api.get(`/rpg/user/${userId}`, {
            params: { username } 
        });
        return response.data.data; 
    } catch (error) {
        console.error(`[API Handler] Gagal GET user ${userId}:`, error.response?.data || error.message);
        throw new Error("Gagal terhubung ke server database.");
    }
}

async function getAllUsers() {
    try {
        const response = await api.get(`/rpg/users`);
        if (response.data && response.data.status) {
            return response.data.data.users; 
        }
        throw new Error("API tidak mengembalikan data pengguna yang valid.");
    } catch (error) {
        console.error(`[API Handler] Gagal GET all users:`, error.response?.data || error.message);
        throw new Error("Gagal mengambil daftar pengguna dari server database.");
    }
}

// Reminder cuaca

async function getWeatherReminders() {
    try {
        const response = await api.get('/reminders/weather');
        return response.data.data || [];
    } catch (error) {
        console.error(`[API Handler] Gagal GET weather reminders:`, error.response?.data || error.message);
        return []; 
    }
}

async function addWeatherReminder(channelId, time, city) {
    const url = `/reminders/weather?Ch=${channelId}&waktu=${time}&kota=${encodeURIComponent(city)}`;
    const response = await api.post(url);
    return response.data;
}

async function updateWeatherReminder(channelId, time, city) {
    const url = `/reminders/weather/${channelId}?waktu=${time}&kota=${encodeURIComponent(city)}`;
    const response = await api.put(url);
    return response.data;
}

async function deleteWeatherReminder(channelId) {
    const response = await api.delete(`/reminders/weather/${channelId}`);
    return response.data;
}


//gempa

async function getQuakeReminders() {
    try {
        const response = await api.get('/reminders/quake');
        return response.data.data || [];
    } catch (error) {
        console.error(`[API Handler] Gagal GET quake reminders:`, error.response?.data || error.message);
        return [];
    }
}


async function addQuakeReminder(channelId) {
    const response = await api.post(`/reminders/quake?Ch=${channelId}`);
    return response.data;
}

async function deleteQuakeReminder(channelId) {
    const response = await api.delete(`/reminders/quake/${channelId}`);
    return response.data;
}

async function getPrayerReminders() {
    try {
        const response = await api.get('/reminders/sholat');
        return response.data.data || [];
    } catch (error) {
        console.error(`[API Handler] Gagal GET sholat reminders:`, error.response?.data?.message);
        return [];
    }
}

async function setPrayerReminder(channelId, city) {
    // Menggunakan POST untuk menambah, PUT untuk update
    const reminders = await getPrayerReminders();
    const existing = reminders.find(r => r.Ch === channelId);
    if (existing) { // Jika sudah ada, update
        const response = await api.put(`/reminders/sholat/${channelId}?kota=${encodeURIComponent(city)}`);
        return response.data;
    } else { // Jika belum ada, buat baru
        const response = await api.post(`/reminders/sholat?Ch=${channelId}&kota=${encodeURIComponent(city)}`);
        return response.data;
    }
}

async function deletePrayerReminder(channelId) {
    const response = await api.delete(`/reminders/sholat/${channelId}`);
    return response.data;
}

/**
 * Memperbarui data user di API.
 * @param {string} userId - ID pengguna Discord.
 * @param {Object} userData - Objek data pengguna yang sudah diperbarui.
 * @returns {Promise<Object>} - Respons dari API.
 */
async function updateUser(userId, userData) {
    try {
        // apikey juga otomatis ditambahkan di sini
        const response = await api.post(`/rpg/user/${userId}`, userData);
        return response.data;
    } catch (error) {
        console.error(`[API Handler] Gagal POST user ${userId}:`, error.response?.data || error.message);
        throw new Error("Gagal menyimpan data ke server database.");
    }
}

module.exports = { getUser, updateUser, getAllUsers, getWeatherReminders, addWeatherReminder, updateWeatherReminder, deleteWeatherReminder, getQuakeReminders, addQuakeReminder, deleteQuakeReminder, getPrayerReminders, setPrayerReminder, deletePrayerReminder };