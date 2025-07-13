const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

/**
 * Fungsi untuk mengambil data gempa terbaru dari API.
 * Fungsi ini akan dipanggil setiap kali perintah !gempa digunakan.
 */
async function fetchGempa() {
  // URL API tetap sama
  const url = `https://api.betabotz.eu.org/api/search/gempa?apikey=${config.apikey_lann}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Memberikan pesan error jika status HTTP tidak 200 OK
      console.error(`[GEMPA API] HTTP Error: ${res.status}`);
      return null;
    }
    const data = await res.json();
    // Mengambil data dari object 'result' di dalam 'result'
    const result = data?.result?.result;
    if (!result) {
      console.error("[GEMPA API] Struktur data dari API tidak valid:", data);
      return null;
    }
    return result;
  } catch (err) {
    console.error("[GEMPA API] Gagal melakukan fetch:", err);
    return null;
  }
}

module.exports = {
  prefix: "gempa",
  category: "info",
  aliases: ["infogempa", "gempaterkini"],

  /**
   * Fungsi utama yang akan dieksekusi saat perintah !gempa dipanggil.
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    // Memberi tahu pengguna bahwa bot sedang memproses permintaan
    const loadingMessage = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setDescription("⏳ Sedang mengambil data gempa terbaru, mohon tunggu..."),
      ],
    });

    // Memanggil fungsi fetchGempa secara langsung
    const data = await fetchGempa();

    // Jika data tidak berhasil didapatkan (null), kirim pesan error
    if (!data) {
      return loadingMessage.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❌ Gagal Mengambil Data")
            .setDescription(
              "Terjadi kesalahan saat menghubungi API gempa. Silakan coba lagi beberapa saat lagi."
            ),
        ],
      });
    }

    // Jika data berhasil didapat, buat dan kirim embed berisi informasi gempa
    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("🌋 Info Gempa Terkini")
      .setDescription(
        `Informasi gempa terbaru yang berhasil didapatkan dari server BMKG.`
      )
      .addFields(
        { name: "📅 Tanggal", value: data.tanggal || "-", inline: true },
        { name: "🕒 Jam", value: data.jam || "-", inline: true },
        { name: "📏 Magnitudo", value: data.Magnitudo || "-", inline: true },
        { name: "🌊 Kedalaman", value: data.Kedalaman || "-", inline: true },
        { name: "📡 Potensi", value: data.Potensi || "Tidak berpotensi tsunami", inline: true },
        { name: "📍 Wilayah", value: data.Wilayah || "Tidak ada data." }
      )
      .setImage(data.image || null) // Menampilkan peta guncangan jika tersedia
      .setFooter({ text: "BetaBotz • Sumber: BMKG", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    // Edit pesan "loading" tadi dengan hasil akhirnya
    await loadingMessage.edit({
      content: "✅ Data berhasil didapatkan!",
      embeds: [embed],
    });
  },
  // Hapus 'handleMessage' karena tidak ada lagi polling otomatis
};