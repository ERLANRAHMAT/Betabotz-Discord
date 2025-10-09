const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.js');

module.exports = {
  prefix: "cekgenshin",
  category: "tools",
  aliases: ["cekgi"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const uid = args[0];

    if (!uid) {
        return message.reply("Masukkan UID Genshin Impact yang ingin Anda cari.\nContoh: `!cekgenshin 816373749`");
    }

    if (!/^\d{9}$/.test(uid)) {
        return message.reply(`Format UID tidak valid. UID harus terdiri dari 9 digit angka.`);
    }

    const processingMsg = await message.reply(`- 🔍 Sedang mencari data untuk UID **${uid}**...`);

    try {
        const apiUrl = `${config.api.baseUrl}/search/genshin?uid=${uid}&apikey=${config.api.apiKey}`;
        
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result || !result.status || !result.data || !result.data.playerInfo) {
            throw new Error(result.message || `Data untuk UID "${uid}" tidak ditemukan.`);
        }

        const player = result.data.playerInfo;

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`🎮 Profil Genshin Impact: ${player.nickname}`)
            .setThumbnail('https://i.imgur.com/8d2d6d9.png') // Generic Genshin Logo
            .addFields(
                { name: 'Adventure Rank (AR)', value: `\`${player.level}\``, inline: true },
                { name: 'World Level', value: `\`${player.worldLevel || '-'}\``, inline: true },
                { name: 'Achievements', value: `\`${player.finishAchievementNum || '0'}\``, inline: true },
                { name: 'Signature', value: `*${player.signature || 'Tidak ada signature'}*`, inline: false },
                { name: 'Spiral Abyss', value: `Floor ${player.towerFloorIndex || '0'} - Chamber ${player.towerLevelIndex || '0'}`, inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.username}` })
            .setTimestamp();

        // Menambahkan daftar karakter yang ditampilkan di profil
        if (player.showAvatarInfoList && player.showAvatarInfoList.length > 0) {
            const characterList = player.showAvatarInfoList.map(avatar => {
                // API Anda tidak memberikan nama karakter, jadi kita tampilkan apa adanya
                return `- Level ${avatar.level}`;
            }).join('\n');
            
            embed.addFields({ name: `🌟 Karakter di Showcase (${player.showAvatarInfoList.length})`, value: characterList });
        }

        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error('Error pada fitur Genshin:', error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan tidak diketahui.";
        await processingMsg.edit(`Gagal mengambil data profil. Pastikan UID benar dan publik.\n*Pesan API:* \`${errorMessage}\``);
    }
  },
};
