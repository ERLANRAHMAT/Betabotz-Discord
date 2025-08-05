const { EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');

function generateDreamWorld(seed) {
  // ...existing code from generateDreamWorld...
  const dreamLevels = ['Lucid ✨', 'Mystic 🌟', 'Ethereal 💫', 'Divine 🌙', 'Legendary 🎇'];
  const dreamQualities = ['Peaceful Dreams 😌', 'Adventure Dreams 🚀', 'Mystical Vision 🔮', 'Prophecy Dreams 📖', 'Epic Journey 🗺️'];
  const elementsList = [
    '🌊 Lautan Kristal Bercahaya',
    '🌈 Pelangi Mengambang',
    '🌺 Taman Melayang',
    '⭐ Konstelasi Hidup',
    '🌙 Bulan Kembar',
    '🎪 Sirkus Dimensi',
    '🏰 Kastil Awan',
    '🌋 Gunung Prisma',
    '🎭 Theater Bayangan',
    '🎪 Portal Waktu'
  ];
  const eventsList = [
    '🦋 Kupu-kupu membawa pesan rahasia',
    '🎭 Topeng menari sendiri',
    '🌊 Hujan bintang jatuh ke laut',
    '🎪 Parade makhluk ajaib',
    '🌺 Bunga bernyanyi lagu kuno',
    '🎨 Lukisan menjadi hidup',
    '🎵 Musik terlihat sebagai warna',
    '⚡ Petir membentuk tangga ke langit',
    '🌈 Pelangi berubah menjadi jembatan',
    '🕰️ Waktu berputar mundur'
  ];
  const encountersList = [
    '🐉 Naga Pelangi Bijaksana',
    '🧙‍♂️ Penyihir Bintang',
    '🦊 Rubah Spirit Sembilan Ekor',
    '🧝‍♀️ Peri Pembawa Mimpi',
    '🦁 Singa Kristal',
    '🐋 Paus Terbang Mistis',
    '🦅 Burung Phoenix Waktu',
    '🐢 Kura-kura Pembawa Dunia',
    '🦄 Unicorn Dimensi',
    '👻 Spirit Pelindung'
  ];
  const powersList = [
    '✨ Mengendalikan Waktu',
    '🌊 Berbicara dengan Elemen',
    '🎭 Shapeshifting',
    '🌈 Manipulasi Realitas',
    '👁️ Penglihatan Masa Depan',
    '🎪 Teleportasi Dimensi',
    '🌙 Penyembuhan Spiritual',
    '⚡ Energi Kosmik',
    '🎨 Kreasi Instant',
    '💫 Telepati Universal'
  ];
  const messagesList = [
    'Perjalananmu akan membawa perubahan besar',
    'Rahasia kuno akan terungkap dalam waktu dekat',
    'Kekuatan tersembunyi akan segera bangkit',
    'Takdir baru menanti di horizon',
    'Koneksi spiritual akan menguat',
    'Transformasi besar akan terjadi',
    'Pencerahan akan datang dari arah tak terduga',
    'Misi penting akan segera dimulai',
    'Pertanda baik dalam perjalanan hidupmu',
    'Kebijaksanaan baru akan ditemukan'
  ];
  const seedNum = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const randomize = (arr) => arr[Math.floor((seedNum * arr.length) / 1000) % arr.length];
  const randomMultiple = (arr, count) => {
    const shuffled = [...arr].sort(() => (seedNum * 0.5) - 0.5);
    return shuffled.slice(0, count);
  };
  return {
    level: randomize(dreamLevels),
    quality: randomize(dreamQualities),
    core: generateDreamCore(seed),
    elements: randomMultiple(elementsList, 3),
    events: randomMultiple(eventsList, 3),
    encounters: randomMultiple(encountersList, 2),
    powers: randomMultiple(powersList, 2),
    message: randomize(messagesList)
  };
}

function generateDreamCore(seed) {
  // ...existing code from generateDreamCore...
  const cores = [
    '🌌 Dunia Paralel Mistis',
    '🎪 Realm Keajaiban Antara',
    '🌙 Dimensi Cahaya Perak',
    '✨ Negeri Kristal Mengambang',
    '🌈 Alam Pelangi Abadi',
    '🎭 Theater Realitas Mimpi',
    '⚡ Zona Waktu Misteri',
    '🌺 Taman Eden Ajaib',
    '🌊 Samudra Bintang Mistis',
    '🏰 Istana Awan Berkilau'
  ];
  return cores[Math.floor((Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0) * cores.length) / 1000) % cores.length];
}

function interpretDream(dreamData) {
  // ...existing code from interpretDream...
  const interpretations = [
    'Mimpi ini menunjukkan potensi kreatif yang luar biasa dalam dirimu',
    'Perjalanan spiritual yang berarti akan segera dimulai',
    'Kekuatan tersembunyi dalam dirimu akan terungkap',
    'Waktu transformasi besar sedang mendekat',
    'Hubungan spesial akan terbentuk dalam waktu dekat',
    'Petualangan baru yang menakjubkan menanti',
    'Kebijaksanaan kuno akan membuka jalan barumu',
    'Takdir istimewa sedang menuju ke arahmu',
    'Misi kehidupan yang penting akan segera terungkap',
    'Pencerahan spiritual akan datang dalam bentuk tak terduga'
  ];
  const seedValue = dreamData.level + dreamData.core;
  return interpretations[Math.floor((Array.from(seedValue).reduce((acc, char) => acc + char.charCodeAt(0), 0) * interpretations.length) / 1000) % interpretations.length];
}

module.exports = {
  prefix: "dreamworld",
  category: "fun",
  aliases: ["dream", "mimpi", "dreamexp"],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    try {
      const text = args.join(" ");
      if (!text) {
        return message.reply(
`╭═══❯ *DREAM EXPLORER* ❮═══
│
│ 🌙 Jelajahi Dunia Mimpimu!
│ 
│ 📝 *Format:*
│ !dreamworld [nama/kata kunci]
│
│ 📌 *Contoh:*
│ !dreamworld Raiden
│ !dreamworld Laut
│
╰═════════════════════`
        );
      }

      await message.reply("🌙 *Memasuki alam mimpi...*");
      await new Promise(resolve => setTimeout(resolve, 1500));
      await message.reply("✨ *Mengumpulkan esensi mimpi...*");
      await new Promise(resolve => setTimeout(resolve, 1500));

      const dreamData = generateDreamWorld(text);
      const dreamInterpretation = interpretDream(dreamData);

      // Bungkus ke EmbedBuilder
      const embed = new EmbedBuilder()
        .setColor(0x8e44ad)
        .setTitle("🌙 DREAM WORLD")
        .setDescription(`👤 **Explorer:** ${text}`)
        .addFields(
          { name: "Dream Level", value: dreamData.level, inline: true },
          { name: "Dream Quality", value: dreamData.quality, inline: true },
          { name: "Dream Core", value: dreamData.core, inline: false },
          { name: "Dream Elements", value: dreamData.elements.join('\n'), inline: false },
          { name: "Dream Events", value: dreamData.events.join('\n'), inline: false },
          { name: "Special Encounters", value: dreamData.encounters.join('\n'), inline: false },
          { name: "Dream Powers", value: dreamData.powers.join('\n'), inline: false },
          { name: "Dream Message", value: dreamData.message, inline: false },
          { name: "Dream Interpretation", value: dreamInterpretation, inline: false },
        )
        .setFooter({ text: `Dream Time: ${moment().tz('Asia/Jakarta').format('HH:mm:ss')}` });

      return message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in dreamworld command:', error);
      return message.reply(`╭══════════════════════
│ ❌ *Terjadi Kesalahan*
│ Mohon coba beberapa saat lagi
╰══════════════════════`);
    }
  }
};
