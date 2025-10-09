const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.js');

module.exports = {
  prefix: "pln",
  category: "tools",
  aliases: ["tagihanpln", "cekbillpln"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const customerNumber = args[0];

    if (!customerNumber) {
        return message.reply("Masukkan Nomor Pelanggan PLN Anda.\nContoh: `!pln 172720204487`");
    }

    const processingMsg = await message.reply(`💡 Memeriksa tagihan PLN untuk nomor **${customerNumber}**, mohon tunggu...`);

    try {
        const apiUrl = `${config.api.baseUrl}/search/tagihanpln?nopel=${customerNumber}&apikey=${config.api.apiKey}`;
        
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data) {
            throw new Error(result.message || `Data tagihan untuk nomor "${customerNumber}" tidak ditemukan.`);
        }

        const bill = result.data;

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle("💡 Tagihan Listrik PLN")
            .setThumbnail('https://i.imgur.com/3483345.png') // [Gambar logo PLN]
            .addFields(
                { name: 'Nomor Pelanggan', value: bill.no_pelanggan, inline: false },
                { name: 'Nama Pelanggan', value: bill.nama_pelanggan, inline: false },
                { name: 'Periode', value: bill.bulan_tahun, inline: true },
                { name: 'Tarif/Daya', value: bill.tarif_daya, inline: true },
                { name: 'Stand Meter', value: bill.stand_meter, inline: false },
                { name: 'Total Tagihan', value: `**${bill.total_tagihan}**`, inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.username}` })
            .setTimestamp();

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error('Error pada fitur cekbillpln:', error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal memeriksa tagihan. Penyebab: \`${errorMessage}\``);
    }
  },
};
