const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'store_data.json');

/**
 * Reads the store database file. Creates it if it doesn't exist.
 * @returns {object} The parsed database object.
 */
function loadStoreDb() {
    try {
        if (fs.existsSync(dbPath)) {
            const data = fs.readFileSync(dbPath, 'utf8');
            return JSON.parse(data);
        } else {
            // If the file doesn't exist, create it with a default structure
            const defaultData = {};
            fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
    } catch (error) {
        console.error("[Store Handler] Error loading store database:", error);
        return {}; // Return empty object on error
    }
}

/**
 * Writes data to the store database file.
 * @param {object} data The data to save.
 */
function saveStoreDb(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("[Store Handler] Error saving store database:", error);
    }
}

module.exports = { loadStoreDb, saveStoreDb };
