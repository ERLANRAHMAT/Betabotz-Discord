const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require("../../config"); // Sesuaikan path jika direktori config berbeda

module.exports = {
  prefix: "twstalk",
  category: "stalker",
  aliases: ["twitterstalk", "xstalk"], // Menambahkan alias 'xstalk'
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const username = args[0];

    // Cek jika pengguna tidak memberikan username
    if (!username) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x1DA1F2) // Warna biru Twitter/X
            .setTitle("Bantuan Perintah Twitter Stalk")
            .setDescription("Gunakan perintah ini untuk mencari informasi tentang profil Twitter/X.")
            .addFields({ name: "Contoh Penggunaan", value: "`!twstalk jokowi`" });
        return message.reply({ embeds: [helpEmbed] });
    }

    // Kirim pesan awal bahwa proses sedang berjalan
    const processingEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setDescription(`🐦 Mencari profil Twitter/X dengan username: **@${username}**...`);
    const processingMessage = await message.reply({ embeds: [processingEmbed] });

    try {
      // Panggil API
      const response = await fetch(`https://api.betabotz.eu.org/api/stalk/twitter?username=${encodeURIComponent(username)}&apikey=${config.apikey_lann}`);
      const data = await response.json();

      // Cek jika API mengembalikan status sukses dan ada data
      if (data.status && data.result) {
        const profile = data.result;

        // Buat embed dengan hasil yang didapat
        const resultEmbed = new EmbedBuilder()
            .setColor(0x1DA1F2)
            .setAuthor({
                name: `${profile.fullName} (@${profile.username})`,
                iconURL: profile.profileImage,
                url: `http://googleusercontent.com/twitter.com/0${profile.username}`
            })
            .setDescription(profile.bio || "Tidak ada bio.")
            .setThumbnail(profile.profileImage)
            .addFields(
                { name: 'Followers', value: parseInt(profile.follower).toLocaleString('id-ID'), inline: true },
                { name: 'Following', value: parseInt(profile.following).toLocaleString('id-ID'), inline: true },
                { name: 'Total Post', value: parseInt(profile.totalPosts).toLocaleString('id-ID'), inline: true }
            )
            .setFooter({ text: `Akun dibuat pada: ${profile.createdAt} • Lokasi: ${profile.location || 'Tidak diketahui'}` })
            .setTimestamp();

        // Edit pesan "mencari..." dengan hasil akhir
        await processingMessage.edit({ content: "✅ Profil ditemukan!", embeds: [resultEmbed] });

      } else {
        // Jika API mengembalikan status false atau tidak ada data
        throw new Error(data.message || "Profil tidak ditemukan atau API bermasalah.");
      }
    } catch (error) {
      // Tangani error jika fetch gagal atau ada masalah lain
      console.error("[TWSTALK ERROR]", error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(`Gagal menemukan profil **@${username}**.\n\`\`\`${error.message}\`\`\``);
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};