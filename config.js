require('dotenv').config(); // Tambahkan baris ini di paling atas file config.js

module.exports = {
  // Bot Identity
  botName: "BetaBotz", // Nama bot kamu
  ownerID: "BetaBotz", // Ganti dengan Nama Kamu

  // Discord Settings
  token: process.env.DISCORD_BOT_TOKEN, 
  // buat file dengan nama .env dan isi dengan DISCORD
  // DISCORD_BOT_TOKEN=""
  // API_KEY_LANN=""


  prefix: "!", // Prefix utama untuk bot ini
  guildID: "wajib di isi", // ID server tempat bot ini berada

  // API Keys
  apikey_lann: process.env.API_KEY_LANN,
  // buat file dengan nama .env dan isi dengan DISCORD
  // DISCORD_BOT_TOKEN=""
  // API_KEY_LANN=""

  reminderChannelIds: [
        'wajib di isi',
        'wajib di isi',
        // Add more channel IDs as needed
    ],
  ownerId: 'wajib di isi',
  ilabChannelId: 'wajib di isi',
  // Menu & Feature Settings
  menuPublic: false, // Apakah menu public aktif?

  // Channel IDs
  joinChannelId: "wajib di isi", // ID channel join
  gempaChannelId: "wajib di isi", // ID channel gempa
  growgardenChannelId: "wajib di isi", // ID channel growgarden
  channelIds: {
    rules: "wajib di isi", // ID channel rules
    pricelist: "wajib di isi", // ID channel pricelist
    ticket: "wajib di isi", // ID channel ticket
    queue: "wajib di isi", // ID channel queue
  },
};