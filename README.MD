# Discord Project Bot - BETA TEST

Bot Discord multifungsi berbasis Node.js dengan fitur sticker, AI, join message, ping, dan lainnya.  
Cocok untuk server komunitas, support, dan hiburan.

---

## ✨ Fitur Utama

- **Sticker Generator:**  
  Buat sticker dari teks dengan perintah  
  `!sticker attp/ttp/brat/bratvideo <teks>`  
  (hasil bisa webp/gif/mp4 sesuai tipe).

- **AI Chat (Plana):**  
  Chat dengan AI menggunakan perintah  
  `!ai <prompt>` atau di channel khusus.

- **Join Message:**  
  Sambutan otomatis ke member baru, lengkap dengan DM dan tombol.

- **Ping:**  
  Tes kecepatan respons bot dengan `!ping`.

- **Slash Command:**  
  `/testjoin` untuk simulasi pesan sambutan ke user tertentu (khusus admin).

---

## 🚀 Cara Instalasi & Menjalankan

1. **Clone repo & install dependencies**

   ```bash
   git clone <repo-anda>
   cd Discord Project Bot
   npm install
   ```

2. **Edit config.js**

   - Isi token bot, prefix, apikey, dan ID channel/server sesuai kebutuhan.
   - Contoh:

     ```js
     module.exports = {
       token: "TOKEN_BOT_DISCORD",
       prefix: "!",
       ownerID: "YOUR_ID",
       guildID: "GUILD_ID",
       apikey_lann: "APIKEY_LANN", // Gunakan apikey dari [betabotz](https://api.betabotz.eu.org/)
       joinChannelId: "ID_CHANNEL_WELCOME",
       channelIds: {
         rules: "ID_CHANNEL_RULES",
         pricelist: "ID_CHANNEL_PRICELIST",
         ticket: "ID_CHANNEL_TICKET",
         queue: "ID_CHANNEL_QUEUE",
       },
     };
     ```

   - **Dapatkan apikey betabotz di sini:**  
     👉 [https://api.betabotz.eu.org/](https://api.betabotz.eu.org/)

3. **Jalankan bot**
   ```bash
   npm start
   ```
   **Atau via Docker:**
   ```bash
   docker compose up -d
   ```
---

## 🛠️ Cara Membuat Bot Discord dari Awal

### 1. Login ke Discord Developer Portal

- Buka [https://discord.com/developers/applications](https://discord.com/developers/applications)
- Login dengan akun Discord kamu.

### 2. Buat Aplikasi Baru

- Klik tombol **"New Application"**.
- Isi nama aplikasi (bebas, misal: `BetaBotz`) lalu klik **"Create"**.

### 3. Buat Bot

- Di sidebar kiri, klik menu **"Bot"**.
- Klik tombol **"Add Bot"** lalu **"Yes, do it!"**.
- (Opsional) Ganti nama dan avatar bot sesuai keinginan.

### 4. Ambil Token Bot

- Di halaman Bot, klik **"Reset Token"** lalu **"Yes, do it!"**.
- Klik **"Copy"** untuk menyalin token bot.
- **Jangan bagikan token ke siapapun!**
- Masukkan token ini ke file `config.js` pada bagian `token`.

### 5. Atur Permissions Bot

- Masih di halaman Bot, scroll ke bagian **Privileged Gateway Intents**.
- Aktifkan **MESSAGE CONTENT INTENT** (dan intents lain jika dibutuhkan).
- Klik **Save Changes**.

### 6. Invite Bot ke Server

- Di sidebar kiri, klik menu **"OAuth2"** > **"URL Generator"**.
- Centang **"bot"** di bagian scopes.
- Di bagian **Bot Permissions**, centang permission yang dibutuhkan, misal:
  - `Send Messages`
  - `Read Messages/View Channels`
  - `Attach Files`
  - `Embed Links`
  - `Manage Messages` (opsional)
- Copy URL yang muncul di bawah, lalu buka di browser.
- Pilih server yang kamu kelola, klik **"Authorize"**.

### 7. Jalankan Bot

- Pastikan sudah mengisi `config.js` dengan benar (token, prefix, apikey, dsb).
- Jalankan bot dengan:
  ```bash
  node index.js
  ```
- Atau dengan Docker:
  ```bash
  docker compose up -d
  ```
- Jika berhasil, bot akan online di server Discord kamu.

---

## 💡 Cara Menggunakan

### Sticker

- Kirim:  
  `!sticker attp <teks>`  
  `!sticker ttp <teks>`  
  `!sticker brat <teks>`  
  `!sticker bratvideo <teks>`
- Bisa juga reply pesan lalu ketik:  
  `!sticker attp`

### AI Chat (Plana)

- Kirim:  
  `!ai <prompt>`
- **Contoh prompt:**
  - `!ai Buatkan puisi tentang persahabatan`
  - `!ai Translate ke Inggris: Aku suka belajar coding`
  - `!ai Ceritakan fakta unik tentang kucing`

### Join Message

- Otomatis saat member baru join.
- Admin bisa tes manual dengan:  
  `/testjoin` lalu pilih user.

### Ping

- Kirim:  
  `!ping`

### Dan masih banyak lagi...
---

## ⚠️ Catatan

- Pastikan bot punya permission yang cukup di semua channel yang digunakan.
- Untuk fitur AI dan sticker, pastikan apikey sudah benar di `config.js` (gunakan apikey dari [betabotz](https://api.betabotz.eu.org/)).
- Jika ingin menambah plugin, letakkan file JS di folder `plugins` dan ikuti struktur yang ada.

---

## 👥 Kontributor

- [@udinxxyz](https://github.com/udinxxyz)
- [@BetaBotz](https://github.com/ERLANRAHMAT)
- [@Danaputra](https://github.com/DanaPutra133)
- [@ArteonStudio](https://arteonstudio.site)
- Dan semua yang berkontribusi!

---

## 📄 Lisensi

MIT License
