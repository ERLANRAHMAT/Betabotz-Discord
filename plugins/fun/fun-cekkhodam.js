module.exports = {
  prefix: "cekkhodam",
  category: "fun",
  aliases: ["cekhodam", "cekodam"],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const { EmbedBuilder } = require("discord.js");
    const nama = args.join(" ");
    if (!nama) {
      return message.reply("Masukkan namamu!\nContoh: `!cekkhodam John Doe`");
    }
    const result = await khodamnya();
    const teks = `*Nama pasien ${nama}*\n│\nKhodam : *${result.name}*\n┌─⊷\n▢ \`penjelasan : *${result.meaning}*\`\n└──────────────`;

    const embed = new EmbedBuilder()
      .setColor("#67DFF4")
      .setTitle("🔮 Hasil Cek Khodam")
      .setDescription(teks)
      .setFooter({ text: "BetaBotz • ArteonStudio" })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};

async function khodamnya() {
  const khodams = [
    { name: "Harimau Putih", meaning: "Kamu kuat dan berani seperti harimau, karena pendahulumu mewariskan kekuatan besar padamu." },
    { name: "Lampu Tertidur", meaning: "Terlihat ngantuk tapi selalu memberikan cahaya yang hangat" },
    { name: "Panda Ompong", meaning: "Kamu menggemaskan dan selalu berhasil membuat orang tersenyum dengan keanehanmu." },
    { name: "Bebek Karet", meaning: "Kamu selalu tenang dan ceria, mampu menghadapi gelombang masalah dengan senyum." },
    { name: "Ninja Turtle", meaning: "Kamu lincah dan tangguh, siap melindungi yang lemah dengan kekuatan tempurmu." },
    { name: "Kucing Kulkas", meaning: "Kamu misterius dan selalu ada di tempat-tempat yang tak terduga." },
    { name: "Sabun Wangi", meaning: "Kamu selalu membawa keharuman dan kesegaran di mana pun kamu berada." },
    { name: "Semut Kecil", meaning: "Kamu pekerja keras dan selalu bisa diandalkan dalam situasi apa pun." },
    { name: "Moge Suzuki", meaning: "Kamu cepat dan penuh gaya, selalu menjadi pusat perhatian di jalanan." },
    { name: "Cupcake Pelangi", meaning: "Kamu manis dan penuh warna, selalu membawa kebahagiaan dan keceriaan." },
    { name: "Robot Mini", meaning: "Kamu canggih dan selalu siap membantu dengan kecerdasan teknologi tinggi." },
    { name: "Ikan Terbang", meaning: "Kamu unik dan penuh kejutan, selalu melampaui batasan yang ada." },
    { name: "Ayam Goreng", meaning: "Kamu selalu disukai dan dinanti oleh banyak orang, penuh kelezatan dalam setiap langkahmu." },
    { name: "Kecoa Terbang", meaning: "Kamu selalu mengagetkan dan bikin heboh seisi ruangan." },
    { name: "Kambing Ngebor", meaning: "Kamu unik dan selalu bikin orang tertawa dengan tingkah lakumu yang aneh." },
    { name: "Kerupuk Renyah", meaning: "Kamu selalu bikin suasana jadi lebih seru dan nikmat." },
    { name: "Celengan Babi", meaning: "Kamu selalu menyimpan kejutan di dalam dirimu." },
    { name: "Lemari Tua", meaning: "Kamu penuh dengan cerita dan kenangan masa lalu." },
    { name: "Kopi Susu", meaning: "Kamu manis dan selalu bikin semangat orang-orang di sekitarmu." },
    { name: "Sapu Lidi", meaning: "Kamu kuat dan selalu bisa diandalkan untuk membersihkan masalah." },
    // ... (tambahkan data khodam lain sesuai kebutuhan, atau copy dari kode sumber Anda)
    { name: "Anjing Pelacak", meaning: "Kamu setia dan penuh dedikasi, selalu menemukan jalan menuju tujuanmu." },
  ];
  const khodamIndex = Math.floor(Math.random() * khodams.length);
  const khodam = khodams[khodamIndex];
  return {
    name: khodam.name,
    meaning: khodam.meaning,
  };
}
