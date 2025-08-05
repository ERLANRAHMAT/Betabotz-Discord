const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config");

// Daftar semua kategori yang valid
const categories = [
    'remaja', 'anak', 'budaya', 'misteri', 'romantis', 'cinta', 'gokil', 
    'galau', 'kehidupan', 'inspiratif', 'sastra', 'jepang', 'korea', 
    'keluarga', 'persahabatan', 'kristen', 'ramadhan', 'liburan', 
    'lingkungan', 'mengharukan'
];
// Alias untuk kategori dengan nama perintah berbeda
const categoryAliases = {
    cerjapan: 'jepang',
    cerkorea: 'korea'
};

/**
 * Fungsi untuk memecah teks panjang menjadi beberapa bagian (halaman)
 * @param {string} text - Teks yang akan dipecah.
 * @param {number} maxLength - Batas maksimal karakter per halaman.
 * @returns {string[]}
 */
function splitText(text, maxLength) {
    const pages = [];
    let currentPart = '';
    const words = text.split(' ');

    for (const word of words) {
        if ((currentPart + word).length > maxLength) {
            pages.push(currentPart);
            currentPart = '';
        }
        currentPart += word + ' ';
    }
    pages.push(currentPart);
    return pages;
}

module.exports = {
  prefix: "cerpen",
  category: "fun",
  aliases: ["cerita", ...categories], // Daftarkan semua kategori sebagai alias

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    // Ambil kategori dari argumen atau dari nama perintah jika menggunakan alias
    let category = args[0]?.toLowerCase() || message.content.slice(1).toLowerCase().split(/ +/)[0];

    // Cek jika kategori ada di alias, gunakan nama aslinya
    if (categoryAliases[category]) {
        category = categoryAliases[category];
    }

    // Jika tidak ada kategori, atau kategori tidak valid, tampilkan bantuan
    if (!categories.includes(category)) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("📚 Bantuan Perintah Cerpen")
            .setDescription("Gunakan perintah ini untuk membaca cerita pendek berdasarkan kategori.\n\nContoh: `!cerpen remaja`")
            .addFields({ name: "Kategori Tersedia", value: `\`${categories.join('`, `')}\`` });
        return message.reply({ embeds: [helpEmbed] });
    }

    const processingMessage = await message.reply(`🔍 Mencari cerpen dengan kategori **${category}**...`);

    try {
      const response = await fetch(`https://api.betabotz.eu.org/api/story/cerpen?type=${category}?apikey=${config.apikey_lann}`);
      const data = await response.json();

      if (!data.status || !data.result) {
        throw new Error("Cerpen untuk kategori ini tidak ditemukan atau API sedang bermasalah.");
      }

      const { title, author, kategori, cerita } = data.result;

      // Pecah cerita menjadi beberapa halaman
      const pages = splitText(cerita, 1800);
      let currentPage = 0;

      // Fungsi untuk membuat embed berdasarkan halaman saat ini
      const createEmbed = (pageIndex) => {
        return new EmbedBuilder()
            .setColor(0x1ABC9C)
            .setTitle(title)
            .setAuthor({ name: `Karya: ${author}` })
            .setDescription(pages[pageIndex])
            .setFooter({ text: `Kategori: ${kategori} • Halaman ${pageIndex + 1} dari ${pages.length}` })
            .setTimestamp();
      };

      // Fungsi untuk membuat tombol navigasi
      const createButtons = (pageIndex) => {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('◀️ Sebelumnya')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageIndex === 0),
            new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Selanjutnya ▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageIndex === pages.length - 1)
        );
      };

      // Kirim pesan awal dengan halaman pertama
      const sentMessage = await processingMessage.edit({ 
          content: null, 
          embeds: [createEmbed(currentPage)],
          components: [createButtons(currentPage)]
      });

      // Buat collector untuk tombol
      const collector = sentMessage.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 300000 // Collector aktif selama 5 menit
      });

      collector.on('collect', async interaction => {
          if (interaction.user.id !== message.author.id) {
              return interaction.reply({ content: 'Hanya pengguna asli yang dapat mengganti halaman.', ephemeral: true });
          }

          if (interaction.customId === 'prev_page') {
              currentPage--;
          } else if (interaction.customId === 'next_page') {
              currentPage++;
          }

          await interaction.update({
              embeds: [createEmbed(currentPage)],
              components: [createButtons(currentPage)]
          });
      });

      collector.on('end', () => {
          // Nonaktifkan tombol setelah collector berakhir
          const disabledButtons = createButtons(currentPage);
          disabledButtons.components.forEach(button => button.setDisabled(true));
          sentMessage.edit({ components: [disabledButtons] }).catch(() => {});
      });

    } catch (error) {
      console.error("[CERPEN ERROR]", error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(`Gagal mengambil cerpen.\n\`\`\`${error.message}\`\`\``);
      await processingMessage.edit({ content: "Gagal!", embeds: "Hubungi Owner untuk di lakukan perbaikan" });
    }
  },
};