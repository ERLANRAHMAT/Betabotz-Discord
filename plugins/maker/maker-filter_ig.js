const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.js');

const filtersWithOptions = [
    { name: '--- Filter Dasar ---', value: '', disabled: true },
    { name: 'Grayscale', value: 'grayscale' },
    { name: 'Sepia', value: 'sepia' },
    { name: 'Invert', value: 'invert' },
    { name: '--- Penyesuaian ---', value: '', disabled: true },
    { name: 'Brightness', value: 'brightness', needs: 'nilai', range: '-1 to 1' },
    { name: 'Contrast', value: 'contrast', needs: 'nilai', range: '-1 to 1' },
    { name: 'Saturate', value: 'saturate', needs: 'nilai', range: '0 to 100' },
    { name: 'Blur', value: 'blur', needs: 'nilai', range: '1 to 100' },
    { name: '--- Artistik ---', value: '', disabled: true },
    { name: 'Posterize', value: 'posterize', needs: 'nilai', range: '2 to 256' },
    { name: 'Pixelate', value: 'pixelate', needs: 'nilai', range: '1 to 50' },
    { name: '--- Transformasi ---', value: '', disabled: true },
    { name: 'Rotate', value: 'rotate', needs: 'nilai', range: 'derajat, cth: 90' },
    { name: 'Flip', value: 'flip', needs: 'arah', options: 'horizontal/vertical' },
    { name: 'Circle Crop', value: 'circle' },
    { name: '--- Gaya Populer ---', value: '', disabled: true },
    { name: 'Clarendon', value: 'clarendon' },
    { name: 'Gingham', value: 'gingham' },
    { name: 'Moon', value: 'moon' },
    { name: 'Nashville', value: 'nashville' },
    { name: 'Lark', value: 'lark' },
    { name: 'Reyes', value: 'reyes' },
    { name: 'Juno', value: 'juno' },
];
const validFilters = filtersWithOptions.filter(f => !f.disabled);

module.exports = {
  prefix: "filter",
  category: "maker",
  aliases: ["efek", "imgfilter"],
  
  async execute(message, args, client) {
    const filterName = args[0]?.toLowerCase();
    const filterValue = args[1];

    if (!filterName) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🎨 Daftar Filter Gambar")
            .setDescription("Gunakan `!filter <nama_filter> [nilai]` dengan mengirim atau me-reply gambar.");

        let currentCategory = "";
        let fieldText = "";
        filtersWithOptions.forEach(f => {
            if (f.disabled) {
                if (fieldText) {
                    helpEmbed.addFields({ name: currentCategory, value: fieldText });
                }
                currentCategory = f.name;
                fieldText = "";
            } else {
                fieldText += `• \`${f.value}\``;
                if (f.needs) fieldText += ` \`<${f.needs}>\``;
                fieldText += "\n";
            }
        });
        helpEmbed.addFields({ name: currentCategory, value: fieldText }); // Tambahkan kategori terakhir
        helpEmbed.addFields({ name: "Contoh", value: "Reply gambar lalu ketik:\n`!filter sepia`\n`!filter blur 15`" });
        return message.reply({ embeds: [helpEmbed] });
    }
    let attachment;
    if (message.attachments.size > 0) {
        attachment = message.attachments.first();
    } else if (message.reference && message.reference.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            attachment = repliedMsg.attachments.first();
        } catch (error) {
            return message.reply("Gagal mengambil gambar dari pesan yang di-reply.");
        }
    }

    if (!attachment || !attachment.contentType?.startsWith('image/')) {
        return message.reply(`Harap kirim atau reply sebuah gambar untuk menggunakan filter **${filterName}**.`);
    }
    
    const selectedFilter = validFilters.find(f => f.value === filterName);
    if (!selectedFilter) {
        return message.reply(`❌ Filter "${filterName}" tidak ditemukan. Ketik \`!filter\` untuk melihat daftar.`);
    }
    if (selectedFilter.needs && !filterValue) {
        return message.reply(`Filter **${selectedFilter.name}** membutuhkan \`${selectedFilter.needs}\`.\nContoh: \`!filter ${selectedFilter.value} 10\``);
    }

    const processingMsg = await message.reply(`🎨 Menerapkan filter **${selectedFilter.name}**, mohon tunggu...`);

    try {
        const imageBuffer = await axios.get(attachment.url, { responseType: 'arraybuffer' }).then(res => res.data);
        const form = new FormData();
        form.append('image', imageBuffer, { filename: 'filter_input.png', contentType: attachment.contentType });

        const params = { apikey: config.api.apiKey, filter: selectedFilter.value };
        if (selectedFilter.needs === 'nilai' && filterValue) params.value = filterValue;
        if (selectedFilter.needs === 'arah' && filterValue) params.direction = filterValue;
        
        const queryString = new URLSearchParams(params).toString();
        const apiUrl = `${config.api.baseUrl}/maker/randomfilter?${queryString}`;

        const response = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        const resultAttachment = new AttachmentBuilder(response.data, { name: `filtered_${filterName}.png` });
        await message.reply({ files: [resultAttachment] });
        if (processingMsg.deletable) await processingMsg.delete().catch(() => {});

    } catch (error) {
        console.error(`[FILTER ERROR] ${filterName}:`, error.response ? error.response.data.toString() : error.message);
        const errorMessage = error.response?.data?.toString() || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal menerapkan filter. Penyebab: \`${errorMessage}\``);
    }
  },
};

