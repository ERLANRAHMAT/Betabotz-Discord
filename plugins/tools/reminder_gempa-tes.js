const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../../config');

module.exports = {
  prefix: "tesgempa",
  category: "tools",
  
  async execute(message, args, client) {
    const processingMsg = await message.reply("🔍 Mengambil data gempa terakhir untuk tes...");
    try {
        // [DIPERBARUI] Menggunakan endpoint API baru Anda
        const url = `http://localhost:3000/api/gempa?apikey=${config.api.apiKey}`;
        const response = await fetch(url);
        const result = await response.json();
        const quake = result?.data;

        if (!quake || !result.status) throw new Error("Tidak dapat mengambil data gempa dari API Anda saat ini.");

        const shakemapUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${quake.Shakemap}`;

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C).setTitle(`🚨 [TES] Peringatan Gempa Bumi`)
            .setDescription(`**${quake.Wilayah}**`)
            .setImage(shakemapUrl)
            .addFields(
                { name: 'Waktu', value: `${quake.Tanggal} - ${quake.Jam}`, inline: false },
                { name: 'Magnitudo', value: quake.Magnitude, inline: true },
                { name: 'Kedalaman', value: quake.Kedalaman, inline: true },
                { name: 'Potensi', value: quake.Potensi, inline: true },
                { name: 'Dirasakan', value: quake.Dirasakan, inline: false }
            )
            .setFooter({ text: "Ini adalah pesan tes. Sumber: BMKG via API Anda" });
        
        await processingMsg.edit({ content: "✅ Pesan tes berhasil dikirim!", embeds: [embed] });

    } catch (error) {
        await processingMsg.edit(`❌ Gagal mengirim pesan tes: ${error.message}`);
    }
  },
};