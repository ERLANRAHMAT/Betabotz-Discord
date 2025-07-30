const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Fungsi helper untuk mendapatkan data jodoh (tidak berubah)
async function jodoh() {
  const jodohdia = [
    { ras: "China", warnakulit: "Sawo Cerah", warnarambut:"Hitam", penjelasan:"Kamu akan mendapatkan jodoh dari negeri China, dia memang pintar jadi kamu harus bisa melampaui dirinya agar kamu bisa mendapatkannya." },
    { ras: "Jawa", warnakulit: "Putih", warnarambut:"Hitam", penjelasan:"Kamu akan mendapatkan jodoh orang Jawa yang ulet nan tekun, jangan sia-siakan dia, sulit mendapatkan yang seperti itu." },
    { ras: "China", warnakulit: "Sawo Matang", warnarambut:"Coklat", penjelasan:"Biasanya yang seperti ini campuran ras, pertahankan dan jangan sia-siakan waktumu bersamanya." },
    { ras: "Sunda", warnakulit: "Sawo Matang", warnarambut:"Hitam", penjelasan:"Berhati baik, sopan, dan juga pemaaf, itulah yang akan kamu dapatkan nanti." },
    { ras: "Aceh", warnakulit: "Sawo Matang", warnarambut:"Coklat", penjelasan:"Jodoh yang kamu dapat ini sangat sholehah/sholeh dan juga penurut, ditambah lagi ahli ibadah." },
    { ras: "Bali", warnakulit: "Sawo Cerah", warnarambut:"Hitam", penjelasan:"Kamu akan mendapatkan jodoh yang ulet dan tekun dari daerah wisata Indonesia." },
    { ras: "Jawa", warnakulit: "Sawo Matang", warnarambut:"Coklat", penjelasan:"Pasangan yang kamu dapatkan ini berasal dari keluarga yang pekerja keras dan pantang menyerah." },
    { ras: "Jawa", warnakulit: "Sawo Matang", warnarambut:"Hitam", penjelasan:"Giat dan rajin, jika kamu seperti itu kamu pantas mendapatkan pasangan ini." },                   
  ];                
  const jodohindex = Math.floor(Math.random() * jodohdia.length);
  return jodohdia[jodohindex];
}


module.exports = {
  // [BARU] Properti 'data' untuk mendefinisikan slash command
  data: new SlashCommandBuilder()
    .setName('cekjodoh')
    .setDescription('Mencari tahu ramalan jodohmu (atau temanmu).')
    .addUserOption(option => 
      option.setName('target')
            .setDescription('Pilih pengguna untuk diramal jodohnya (opsional)')
            .setRequired(false)), // Argumen ini tidak wajib diisi
  
  category: 'fun',
  
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    // 1. Ambil target dari opsi, jika tidak ada, gunakan pengguna yang menjalankan perintah
    const targetUser = interaction.options.getUser('target');
    const user = targetUser || interaction.user;

    // 2. Panggil fungsi untuk mendapatkan hasil ramalan
    const result = await jodoh();
    
    // 3. Buat embed yang rapi untuk menampilkan hasil
    const embed = new EmbedBuilder()
      .setColor(0xFF69B4) // Warna Pink
      .setTitle(`💖 Ramalan Jodoh untuk ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'Asal Ras', value: result.ras, inline: true },
        { name: 'Warna Kulit', value: result.warnakulit, inline: true },
        { name: 'Warna Rambut', value: result.warnarambut, inline: true },
        { name: 'Penjelasan', value: result.penjelasan }
      )
      .setFooter({ text: `Semoga cepat bertemu, ya!` })
      .setTimestamp();
      
    // 4. Kirim hasilnya
    await interaction.reply({ embeds: [embed] });
  },
};