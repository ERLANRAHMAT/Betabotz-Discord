# BETABOTZ BOT DC - BETA TEST

Bot Discord multifungsi berbasis Node.js yang modern dan kaya fitur. Dibuat untuk menyediakan hiburan, utilitas, moderasi, dan sistem permainan yang canggih untuk komunitas Discord.

---
## ✨ Link Tutorial Setup

| Ikon | Link                               | Deskripsi Singkat                                                                                                |
| :--: | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|  ▶️  | **https://youtu.be/Eog1H1CiAHw** | **Video tutorial setup** |
 

## ✨ Fitur Unggulan

| Ikon | Fitur                               | Deskripsi Singkat                                                                                                |
| :--: | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|  ⚔️  | **RPG** | **Fiftur RPG di Bot Discord Dengan sistem DB terpusat** |
|  💖  | **Waifu Gacha & Collection** | **(Fitur Utama)** Sistem gacha waifu dari API danafxc! Termasuk galeri gambar, klaim, nikah (permanen), peringkat, dan limit harian. |
|  🎵  | **Sistem Musik Hybrid** | Memutar musik dari YouTube, dan secara cerdas menggunakan API cadangan untuk link Spotify & SoundCloud yang bermasalah. |
|  🃏  | **Game Multiplayer Interaktif** | Mainkan game seperti **Qiu Qiu** dengan sistem taruhan, **Tic Tac Toe**, **Hompimpa**, dan **Coinflip** antar pemain.    |
|  ⬇️  | **Auto-Downloader Media** | Secara otomatis mengunduh video & gambar dari link TikTok, Instagram, Facebook, Twitter, dll. di channel tertentu. |
|  👑  | **Fitur Khusus Owner** | Akses aman ke terminal server (`$ exec`) dan eksekusi kode JavaScript (`!eval`) langsung dari Discord.        |
|  🛡️  | **Moderasi & Database Terpusat** | Sistem ban permanen, filter kata kasar per-server, dan sistem ekonomi (`money` & `limit`) yang tersimpan di Database. |

---

## 📚 Daftar Perintah Lengkap

### 🎮 Game
- `!waifu <sub-command>`: Sistem Gacha Waifu.
- `!qiu <start/join/deal/end>`: Game kartu Qiu Qiu (2-10 pemain) dengan taruhan.
- `!tictactoe @user`: Main Tic Tac Toe dengan teman.
- `!hompimpa <start/join/play>`: Game Hompimpa untuk menentukan pemenang/pecundang.
- `!coinflip @user <taruhan?>`: Game lempar koin (taruhan opsional).
- `!math <level>`: Kuis matematika dengan berbagai tingkat kesulitan dan hadiah.
- `!tebak...`: Berbagai game tebak-tebakan (`tebakemoji`, `tebakkpop`, `tebaklirik`, `tebakmakanan`, dll.).
- `!suit @user`: Bermain Gunting Batu Kertas melawan teman.

### Fun
- `!pasangan <tembak/putus/cek>`: Fitur untuk menjalin hubungan di server.
- `/alay <teks>`: Mengubah teks menjadi format aL4y.
- `/cekjodoh <@user?>`: Ramalan jodoh.
- `!cecan <kategori>`: Mengirim gambar acak berdasarkan kategori.
- `!quotes`, `!motivasi`, dll.: Mengirim kutipan acak.

### 🛠️ Tools & Info
- `/menu`: Menu bantuan interaktif dengan dropdown.
- `/ping`: Mengecek latensi bot.
- `!get <url>`: Mengambil konten mentah dari sebuah URL.
- `!device <@user?>`: Mengecek status perangkat (Desktop/Mobile) pengguna.
- `!whois <domain>` & `!whois2 <domain>`: Informasi domain.
- `!ip <ip_address>`: Informasi alamat IP.
- `!speedtest`: Tes kecepatan internet server bot.
- `!subdomain <check/create>`: Mengelola subdomain melalui API Anda.
- `!igstalk`, `!ttstalk`, `!twstalk`, `!ytstalk`: Stalking profil media sosial.

### 👑 Owner
- `!eval <code>`: Menjalankan kode JavaScript.
- `$ <command>`: Menjalankan perintah terminal/shell.
- `!ban <add/remove/list>`: Mengelola daftar ban pengguna bot.
- `!eco <add/set><money/limit>`: Mengelola ekonomi pengguna.

---

### Isi dari .env

  ```bash
DISCORD_BOT_TOKEN=" Token bot kmau"
API_KEY_LANN=" apikey betabotz "
API_KEY_DANA=" apikey danafxc api "
  ```
---

## ⚠️ Catatan

- Pastikan bot punya permission yang cukup di semua channel yang digunakan.
- Untuk fitur AI, game dan yang lain, pastikan apikey sudah benar di `.env` (gunakan apikey dari [betabotz](https://api.betabotz.eu.org/) dan [Dana](https://api.danafxc.my.id/)).
- Jika ingin menambah plugin, letakkan file JS di folder `pluginFolders.config.js`.

---

## 👥 Kontributor

- [@Danaputra](https://github.com/DanaPutra133)
- [@udinxxyz](https://github.com/udinxxyz)
- [@BetaBotz](https://github.com/ERLANRAHMAT)
- [@ArteonStudio](https://arteonstudio.site)
- Dan semua yang berkontribusi!

---

## 📄 Lisensi

MIT License
