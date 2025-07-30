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

module.exports = { getUser, updateUser };