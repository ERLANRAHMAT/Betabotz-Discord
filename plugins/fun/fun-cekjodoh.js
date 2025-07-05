module.exports = {
  prefix: "cekjodoh",
  category: "fun",
  aliases: ["jodohsaya", "jodoh"],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    // Ambil mention user jika ada, jika tidak pakai author
    let mention = message.mentions.users.first();
    let username = mention
      ? mention.username
      : message.author.username;

    const result = await jodoh();
    let teks = `- Jodoh **@${username}** : ${result.ras}\n\n*Warnakulit* : ${result.warnakulit}\n*Warnarambut* : ${result.warnarambut}\n*Penjelasan* : ${result.penjelasan}`;

    await message.reply(teks);
  },
};

async function jodoh() {
  const jodohdia = [
    { ras: "china", warnakulit: "sawo cerah", warnarambut:"hitam", penjelasan:"kamu akan mendapatkan jodoh dari negeri china, dia memang pintar jadi kamu harus bisa melampaui diri nya agar kamu bisa mendapatkan nya" },
    { ras: "jawa", warnakulit: "putih", warnarambut:"hitam", penjelasan:"kamu akan mendapatkan jodoh orang jawa yang ulet nan tekun jangan sia siakan dia sulit mendapatkan yang seperti itu" },
    { ras: "china", warnakulit: "sawo matang", warnarambut:"coklat", penjelasan:"biasa nya yang seperti ini campuran ras, pertahankan dan jangan sia saiakan waktu mu bersama dia" },
    { ras: "sunda", warnakulit: "sawo matanng", warnarambut:"hitam", penjelasan:"berhati baik, sopan dan juga pemaaf itu lah yang akan kamu dapat kan nanti" },
    { ras: "Aceh", warnakulit: "sawo matang", warnarambut:"coklat", penjelasan:"jodoh yang kamu dapat ini sangat sholeh dan juga penurut di tambah lagi ahli ibadah" },
    { ras: "Bali", warnakulit: "sawo cerah", warnarambut:"hitam", penjelasan:"kamu akan mendapatkan jodoh yang ulet dan tuken dari daerah wisata indonesia" },
    { ras: "Jawa", warnakulit: "sawo matang", warnarambut:"coklat", penjelasan:"pasangan yang kamu dapatkan ini berasal keluarga yang pekerja keras dan pantang menyerah " },
    { ras: "Jawa", warnakulit: "sawo matang", warnarambut:"hitam", penjelasan:"giat dan rajin jika kamu seperti itu kamu pantas mendapaatkan pasangan ini" },                   
  ];                
  const jodohindex = Math.floor(Math.random() * jodohdia.length);
  const jodohnya = jodohdia[jodohindex];

  return {
    ras: jodohnya.ras,
    warnakulit: jodohnya.warnakulit,
    warnarambut: jodohnya.warnarambut,
    penjelasan: jodohnya.penjelasan,
  };
}
