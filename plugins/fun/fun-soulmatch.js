const { EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');

module.exports = {
  prefix: "soulmatch",
  category: "fun",
  aliases: [],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const text = args.join(" ");
    if (!text) {
      return message.reply(
`╭═══❯ *BELAHAN JIWA* ❮═══
│
│ ❌ Masukkan 2 nama untuk dianalisis!
│ 
│ 📝 *Format:*
│ !soulmatch nama1|nama2
│
│ 📌 *Contoh:*
│ !soulmatch Raiden|Mei
│
╰════════════════════`
      );
    }

    try {
      const [nama1, nama2] = text.split("|").map(name => name.trim());
      if (!nama2) {
        return message.reply("❌ Format salah! Gunakan tanda '|' untuk memisahkan nama\nContoh: !soulmatch Raiden|Mei");
      }

      const generateSoulData = (name, previousElement) => {
        const numerologyValue = name.toLowerCase().split('')
          .map(char => char.charCodeAt(0) - 96)
          .reduce((a, b) => a + b, 0) % 9 + 1;

        const elements = ['Api 🔥', 'Air 💧', 'Tanah 🌍', 'Angin 🌪️', 'Petir ⚡', 'Es ❄️', 'Cahaya ✨', 'Bayangan 🌑'];
        let element;
        do {
          element = elements[Math.floor(Math.random() * elements.length)];
        } while (element === previousElement);

        const zodiacSigns = ['♈ Aries', '♉ Taurus', '♊ Gemini', '♋ Cancer', '♌ Leo', '♍ Virgo', 
                             '♎ Libra', '♏ Scorpio', '♐ Sagittarius', '♑ Capricorn', '♒ Aquarius', '♓ Pisces'];
        const zodiac = zodiacSigns[Math.floor(Math.random() * zodiacSigns.length)];
        return { numerologyValue, element, zodiac };
      };

      let previousElement = null;
      const soul1 = generateSoulData(nama1, previousElement);
      previousElement = soul1.element;
      const soul2 = generateSoulData(nama2, previousElement);

      const calculateCompatibility = () => Math.floor(Math.random() * 100) + 1;
      const compatibility = calculateCompatibility();

      const soulTypes = [
        "Pemimpin Yang Berani", "Penyeimbang Bijaksana", "Kreator Ekspresif", "Pembangun Solid", 
        "Petualang Bebas", "Pelindung Setia", "Pemikir Mistis", "Penakluk Kuat", "Humanitarian Murni"
      ];
      const getRandomSoulType = () => soulTypes[Math.floor(Math.random() * soulTypes.length)];

      const getMatchDescription = (score) => {
        if (score >= 90) return "💫 Takdir Sejati";
        if (score >= 80) return "✨ Harmoni Sempurna";
        if (score >= 70) return "🌟 Koneksi Kuat";
        if (score >= 60) return "⭐ Potensi Bagus";
        if (score >= 50) return "🌙 Perlu Perjuangan";
        return "🌑 Tantangan Berat";
      };

      const generateSoulReading = (compatibility) => {
        const readings = [
          compatibility >= 90 ? [
            "✨ Jiwa kalian memiliki koneksi yang sangat istimewa dan langka",
            "🌟 Takdir telah merencanakan pertemuan ini",
            "💫 Resonansi jiwa kalian menciptakan harmoni sempurna"
          ] : compatibility >= 80 ? [
            "🌟 Ada chemistry yang sangat kuat di antara kalian",
            "✨ Jiwa kalian saling melengkapi dengan cara yang unik",
            "💫 Pertemuan kalian membawa energi positif"
          ] : compatibility >= 70 ? [
            "🌙 Potensi hubungan yang dalam dan berarti",
            "✨ Perbedaan kalian justru menciptakan harmoni",
            "💫 Ada pelajaran berharga dalam pertemuan ini"
          ] : compatibility >= 60 ? [
            "🌟 Butuh waktu untuk saling memahami",
            "💫 Setiap tantangan akan memperkuat ikatan",
            "✨ Fokus pada hal positif dari perbedaan kalian"
          ] : compatibility >= 50 ? [
            "🌙 Perlu usaha ekstra untuk harmonisasi",
            "✨ Tantangan akan menguji kesungguhan",
            "💫 Komunikasi jadi kunci utama hubungan"
          ] : [
            "🌑 Perbedaan yang signifikan dalam energi jiwa",
            "✨ Butuh banyak adaptasi dan pengertian",
            "💫 Setiap hubungan punya maksud tersendiri"
          ]
        ];
        return readings[0].join('\n');
      };

      const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle("💞 BELAHAN JIWA")
        .addFields(
          { name: `👤 ${nama1}`, value: `🔮 Soul Type: ${getRandomSoulType()}\n🌟 Element: ${soul1.element}\n🎯 Zodiac: ${soul1.zodiac}`, inline: false },
          { name: `👤 ${nama2}`, value: `🔮 Soul Type: ${getRandomSoulType()}\n🌟 Element: ${soul2.element}\n🎯 Zodiac: ${soul2.zodiac}`, inline: false },
          { name: "💫 COMPATIBILITY", value: `📊 Score: ${compatibility}%\n🎭 Status: ${getMatchDescription(compatibility)}`, inline: false },
          { name: "🔮 Soul Reading", value: generateSoulReading(compatibility), inline: false }
        )
        .setFooter({ text: `📅 Analysis Date: ${moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')}` });

      return message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in soulmatch command:', error);
      return message.reply(
`╭══════════════════════
│ ❌ *Terjadi Kesalahan*
│ Mohon coba beberapa saat lagi
╰═════════════════════`
      );
    }
  }
};
