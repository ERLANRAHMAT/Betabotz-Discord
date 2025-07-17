const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config"); // Sesuaikan path jika direktori config berbeda

module.exports = {
  prefix: "ttstalk",
  category: "tools",
  aliases: ["tiktokstalk"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const username = args[0];

    // Cek jika pengguna tidak memberikan username
    if (!username) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x000000) // Warna hitam khas TikTok
            .setTitle("Bantuan Perintah TikTok Stalk")
            .setDescription("Gunakan perintah ini untuk mencari informasi tentang profil TikTok.")
            .addFields({ name: "Contoh Penggunaan", value: "`!ttstalk khabylame`" });
        return message.reply({ embeds: [helpEmbed] });
    }

    // Kirim pesan awal bahwa proses sedang berjalan
    const processingEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setDescription(`🎵 Mencari profil TikTok dengan username: **@${username}**...`);
    const processingMessage = await message.reply({ embeds: [processingEmbed] });

    try {
      // Panggil API
      const response = await fetch(`https://api.betabotz.eu.org/api/stalk/tt?username=${encodeURIComponent(username)}&apikey=${config.apikey_lann}`);
      const data = await response.json();

      // Cek jika API mengembalikan status sukses dan ada data
      if (data.status && data.result) {
        const profile = data.result;

        // Buat embed dengan hasil yang didapat
        const resultEmbed = new EmbedBuilder()
            .setColor(0x000000)
            .setAuthor({
                name: `@${profile.username}`,
                iconURL: profile.profile, // Menggunakan foto profil dari API
                url: `http://googleusercontent.com/tiktok.com/0${profile.username}`
            })
            .setDescription(profile.description || "Tidak ada bio.")
            .setThumbnail(profile.profile)
            .addFields(
                { name: 'Followers', value: parseInt(profile.followers).toLocaleString('id-ID'), inline: true },
                { name: 'Following', value: parseInt(profile.following).toLocaleString('id-ID'), inline: true },
                { name: 'Likes', value: parseInt(profile.likes).toLocaleString('id-ID'), inline: true },
                { name: 'Total Video', value: parseInt(profile.totalPosts).toLocaleString('id-ID'), inline: true }
            )
            .setFooter({ text: `Informasi untuk @${profile.username}` })
            .setTimestamp();

        // Edit pesan "mencari..." dengan hasil akhir
        await processingMessage.edit({ content: "✅ Profil ditemukan!", embeds: [resultEmbed] });

      } else {
        // Jika API mengembalikan status false atau tidak ada data
        throw new Error(data.message || "Profil tidak ditemukan atau username tidak valid.");
      }
    } catch (error) {
      // Tangani error jika fetch gagal atau ada masalah lain
      console.error("[TTSTALK ERROR]", error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(`Gagal menemukan profil **@${username}**.\n\`\`\`${error.message}\`\`\``);
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};