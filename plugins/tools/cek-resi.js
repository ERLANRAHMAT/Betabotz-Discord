const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.js');

module.exports = {
  prefix: "cekresi",
  category: "tools",
  aliases: ["resi"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const text = args.join(" ");

    if (!text || !text.includes('|')) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("📦 Bantuan Lacak Resi")
            .setDescription("Gunakan format: `!cekresi <nomor_resi> | <kode_kurir>`")
            .addFields({ name: "Contoh", value: "`!cekresi JX5675021651 | jnt`" })
            .setFooter({ text: "Gunakan '|' sebagai pemisah antara nomor resi dan kurir." });
        return message.reply({ embeds: [helpEmbed] });
    }

    const [resi, courier] = text.split('|').map(s => s.trim());

    if (!resi || !courier) {
        return message.reply("Format salah. Pastikan Anda mengisi nomor resi dan kode kurir.");
    }

    const processingMsg = await message.reply(`🕵️‍♂️ Melacak resi **${resi}** dengan kurir **${courier.toUpperCase()}**...`);

    try {
        const apiUrl = `${config.api.baseUrl}/search/cekresi?resi=${encodeURIComponent(resi)}&courier=${encodeURIComponent(courier)}&apikey=${config.api.apiKey}`;
        
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data) {
            throw new Error(result.message || 'Gagal melacak resi. Pastikan nomor resi dan kode kurir benar.');
        }

        const data = result.data;
        
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle(`🚚 Hasil Lacak Resi: ${data.resi}`)
            .addFields(
                { name: 'Kurir', value: data.courier, inline: true },
                { name: 'Status', value: `**${data.status}**`, inline: true }
            )
            .setFooter({ text: `Diminta oleh ${message.author.username}` })
            .setTimestamp();

        // Menambahkan riwayat perjalanan jika ada
        if (data.history && data.history.length > 0) {
            // Batasi riwayat agar tidak melebihi batas embed Discord
            const historyText = data.history.slice(0, 10).map(item => {
                return `**📅 ${item.datetime}**\n${item.description}`;
            }).join('\n\n');
            
            embed.addFields({ name: '📜 Riwayat Perjalanan Paket', value: historyText });

            if (data.history.length > 10) {
                embed.setFooter({ text: `Dan ${data.history.length - 10} riwayat lainnya...` });
            }
        }

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error('Error pada fitur cekresi:', error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal melacak resi. Penyebab: \`${errorMessage}\``);
    }
  },
};
