const { EmbedBuilder } = require('discord.js');

module.exports = {
  prefix: "choose",
  category: "fun",
  aliases: ["pilih", "pick"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    try {
        const messages = await message.channel.messages.fetch({ limit: 5 });
        
        let targetMessage = null;
        // Cari pesan terakhir dari pengguna yang bukan perintah atau dari bot
        for (const msg of messages.values()) {
            if (msg.author.id === message.author.id && msg.id !== message.id && !msg.content.startsWith('!')) {
                targetMessage = msg;
                break;
            }
        }

        if (!targetMessage) {
            return message.reply("❌ Tidak ditemukan daftar pilihan di pesan-pesan terakhirmu. Buat daftarnya terlebih dahulu!");
        }

        // 2. Proses pesan untuk menemukan daftar bernomor
        const lines = targetMessage.content.split('\n');
        const options = [];
        lines.forEach(line => {
            // Regex untuk menemukan baris yang diawali angka, titik, lalu spasi
            const match = line.match(/^(\d+)\.?\s+(.*)/);
            if (match) {
                options.push({ number: parseInt(match[1]), text: match[2].trim() });
            }
        });

        if (options.length < 2) {
            return message.reply("❌ Daftar tidak valid. Pastikan ada setidaknya 2 pilihan bernomor di pesan terakhirmu.");
        }

        const maxRoll = options.length;
        
        // 3. Lakukan pengacakan
        const rollResult = Math.floor(Math.random() * maxRoll);
        const chosenOption = options[rollResult];

        // 4. Buat embed untuk menampilkan hasil
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("🎲 Pilihan Telah Ditentukan!")
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(`Dari daftar yang kamu berikan, pilihan yang terpilih adalah...`)
            .addFields(
                { name: 'Hasil Roll', value: `**${chosenOption.number}** (dari 1-${maxRoll})`, inline: true },
                { name: 'Pilihanmu Adalah', value: `> **${chosenOption.text}**`, inline: false }
            )
            .setFooter({ text: "Semoga beruntung dengan pilihanmu!" })
            .setTimestamp();

        await message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("Error di perintah !choose:", error);
        message.reply("❌ Terjadi kesalahan saat mencoba memilih dari daftarmu.");
    }
  },
};