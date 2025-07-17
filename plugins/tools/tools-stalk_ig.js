const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config"); // Sesuaikan path jika direktori config berbeda

module.exports = {
  prefix: "igstalk",
  category: "tools",
  aliases: ["instagramstalk"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const username = args[0];

    // Cek jika pengguna tidak memberikan username
    if (!username) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0xE4405F) // Warna gradien Instagram
            .setTitle("Bantuan Perintah Instagram Stalk")
            .setDescription("Gunakan perintah ini untuk mencari informasi tentang profil Instagram.")
            .addFields({ name: "Contoh Penggunaan", value: "`!igstalk erlanrahmat_14`" });
        return message.reply({ embeds: [helpEmbed] });
    }

    // Kirim pesan awal bahwa proses sedang berjalan
    const processingEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setDescription(`📸 Mencari profil Instagram dengan username: **${username}**...`);
    const processingMessage = await message.reply({ embeds: [processingEmbed] });

    try {
      // Panggil API
      const response = await fetch(`https://api.betabotz.eu.org/api/stalk/ig?username=${encodeURIComponent(username)}&apikey=${config.apikey_lann}`);
      const data = await response.json();

      // Cek jika API mengembalikan status sukses dan ada data
      if (data.status && data.result) {
        const profile = data.result;

        // Buat embed dengan hasil yang didapat
        const resultEmbed = new EmbedBuilder()
            .setColor(0xE4405F)
            .setAuthor({
                name: `${profile.fullName} (@${profile.username})`,
                iconURL: profile.photoUrl,
                url: `http://googleusercontent.com/instagram.com/0${profile.username}`
            })
            .setDescription(profile.bio || "Tidak ada bio.")
            .setThumbnail(profile.photoUrl)
            .addFields(
                { name: 'Post', value: parseInt(profile.postsCount).toLocaleString('id-ID'), inline: true },
                { name: 'Followers', value: parseInt(profile.followers).toLocaleString('id-ID'), inline: true },
                { name: 'Following', value: parseInt(profile.following).toLocaleString('id-ID'), inline: true }
            )
            .setFooter({ text: `Informasi untuk @${profile.username}` })
            .setTimestamp();

        // Edit pesan "mencari..." dengan hasil akhir
        await processingMessage.edit({ content: "✅ Profil ditemukan!", embeds: [resultEmbed] });

      } else {
        // Jika API mengembalikan status false atau tidak ada data
        throw new Error(data.message || "Profil tidak ditemukan, bersifat pribadi, atau username tidak valid.");
      }
    } catch (error) {
      // Tangani error jika fetch gagal atau ada masalah lain
      console.error("[IGSTALK ERROR]", error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(`Gagal menemukan profil **${username}**.\n\`\`\`${error.message}\`\`\``);
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};