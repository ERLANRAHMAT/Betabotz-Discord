const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.js');

module.exports = {
  prefix: "pddikti",
  category: "tools",
  aliases: ["caripddikti"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const query = args.join(" ");

    if (!query) {
        return message.reply("Masukkan Nama atau NIM Mahasiswa yang ingin dicari.\nContoh: `!pddikti jondoy`");
    }

    const processingMsg = await message.reply(`🔍 Mencari data untuk **${query}** di database PDDIKTI...`);

    try {
        const apiUrl = `${config.api.baseUrl}/features/pddikti-browser/${encodeURIComponent(query)}?apikey=${config.api.apiKey}`;

        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || result.data.length === 0) {
            throw new Error(result.message || `Data untuk "${query}" tidak ditemukan.`);
        }

        const mahasiswaList = result.data;
        const slicedList = mahasiswaList.slice(0, 5);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`🎓 Hasil Pencarian PDDIKTI untuk "${query}"`)
            .setDescription(`Ditemukan ${mahasiswaList.length} hasil. Menampilkan ${slicedList.length} hasil pertama:`)
            .setTimestamp()
            .setFooter({ text: `Diminta oleh ${message.author.username}` });

        // Tambahkan data setiap mahasiswa sebagai field terpisah
        slicedList.forEach((mahasiswa, index) => {
            embed.addFields({
                name: `${index + 1}. ${mahasiswa.nama} (${mahasiswa.nim})`,
                value: `**Perguruan Tinggi:** ${mahasiswa.perguruan_tinggi}\n` +
                       `**Program Studi:** ${mahasiswa.program_studi}\n` +
                       `[Lihat Detail](${mahasiswa.link_detail})`
            });
        });

        if (mahasiswaList.length > 5) {
            embed.setFooter({ text: `Dan ${mahasiswaList.length - 5} hasil lainnya...` });
        }

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error('Error pada fitur pddikti:', error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal mencari data. Penyebab: \`${errorMessage}\``);
    }
  },
};
