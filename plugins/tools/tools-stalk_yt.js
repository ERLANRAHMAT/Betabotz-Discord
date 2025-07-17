const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config"); // Sesuaikan path jika direktori config berbeda

module.exports = {
  prefix: "ytstalk",
  category: "tools",
  aliases: ["youtubestalk", "ytchannel"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const username = args.join(' ');

    // Cek jika pengguna tidak memberikan username
    if (!username) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("Bantuan Perintah YouTube Stalk")
            .setDescription("Gunakan perintah ini untuk mencari informasi tentang channel YouTube.")
            .addFields({ name: "Contoh Penggunaan", value: "`!ytstalk deaafrizal`" });
        return message.reply({ embeds: [helpEmbed] });
    }

    // Kirim pesan awal bahwa proses sedang berjalan
    const processingEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setDescription(`🔍 Mencari channel YouTube dengan username: **${username}**...`);
    const processingMessage = await message.reply({ embeds: [processingEmbed] });

    try {
      // Panggil API
      const response = await fetch(`https://api.betabotz.eu.org/api/stalk/yt?username=${encodeURIComponent(username)}&apikey=${config.apikey_lann}`);
      const data = await response.json();

      // Cek jika API mengembalikan status sukses dan ada data
      if (data.status && data.result?.data?.[0]) {
        const channel = data.result.data[0];

        // Format deskripsi agar tidak terlalu panjang di embed
        const shortDescription = channel.description.length > 250 
            ? channel.description.substring(0, 247) + "..." 
            : channel.description;

        // Buat embed dengan hasil yang didapat
        const resultEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Warna merah khas YouTube
            .setTitle(channel.channelName)
            .setURL(channel.url)
            .setThumbnail(channel.avatar)
            .addFields(
                { name: 'Subscriber', value: `${channel.subscriberH} (${parseInt(channel.subscriber).toLocaleString('id-ID')})`, inline: true },
                { name: 'Terverifikasi', value: channel.isVerified ? '✅ Ya' : '❌ Tidak', inline: true },
                { name: 'Channel ID', value: `\`${channel.channelId}\``, inline: false },
                { name: 'Deskripsi', value: shortDescription || 'Tidak ada deskripsi.' }
            )
            .setFooter({ text: `Informasi untuk channel: ${channel.channelName}` })
            .setTimestamp();

        // Edit pesan "mencari..." dengan hasil akhir
        await processingMessage.edit({ content: "✅ Channel ditemukan!", embeds: [resultEmbed] });

      } else {
        // Jika API mengembalikan status false atau tidak ada data
        throw new Error(data.message || "Channel tidak ditemukan atau terjadi kesalahan pada API.");
      }
    } catch (error) {
      // Tangani error jika fetch gagal atau ada masalah lain
      console.error("[YTSTALK ERROR]", error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(`Gagal menemukan channel **${username}**.\n\`\`\`${error.message}\`\`\``);
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};