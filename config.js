require('dotenv').config(); // Tambahkan baris ini di paling atas file config.js

module.exports = {
  // Bot Identity
  botName: "AQUABOT", // Nama bot kamu
  ownerID: "Dana putra", // Ganti dengan Nama Kamu

  //API DATABASE RPG
  api: {
        baseUrl: "https://api.danafxc.my.id/api/proxy",   // kamu bisa dapat apikey ini dengan beli di https://api.danafxc.my.id/Price-api
        apiKey: process.env.API_KEY_DANA, 
    },

  // Discord Settings
  token: process.env.DISCORD_BOT_TOKEN, // Mengambil token dari .env
  prefix: "!", // Prefix utama untuk bot ini

  clientId:  "", //client ID bot kamu
  
  //ini pakai kalau misal nya slash / command mau di 1 server aja, optional
  guildID: "", // ID server tempat bot ini berada

  //fitur braodcast yang bakal di kirim ke beberapa ch yang di input
  broadcastChannels: [
        ""
    ],

    //auto DL
  autoDownload: {
        // Daftarkan semua ID SERVER tempat fitur ini boleh aktif
        enabledServers: [
            "", // Ganti dengan ID SERVER (GUILD ID) Anda
            ""
        ],
        // (Opsional) Daftarkan ID CHANNEL yang ingin dikecualikan di server tersebut
        excludedChannels: [
            "", 
            ""
        ]
    },

  // API Keys
  apikey_lann: process.env.API_KEY_LANN, // Mengambil API key dari .env
// kamu bisa dapat apikey ini dengan beli di https://api.betabotz.eu.org

  apikey_dana: process.env.API_KEY_DANA, // Mengambil API key dari .env
// kamu bisa dapat apikey ini dengan beli di https://api.danafxc.my.id/Price-api


  ownerId: '686498842560168043',

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

//isi dari .env


//#DISCORD_BOT_TOKEN=""
//API_KEY_LANN=""
//API_KEY_DANA=""
