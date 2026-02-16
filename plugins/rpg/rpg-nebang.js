const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

const cooldown = 15 * 60 * 1000; //15 menit

// Fungsi untuk format waktu
function msToTime(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    
    return `${hours} jam ${minutes} menit ${seconds} detik`;
}

module.exports = {
  prefix: "nebang",
  category: "rpg",
  aliases: [],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    
    try {
      const userData = await api.getUser(authorId, authorUsername);


      if ((userData.axe || 0) <= 0) {
        return message.reply(
          "🪓 Kamu tidak punya axe! Buat satu di `!craft axe` untuk bisa menebang pohon.",
        );
      }

      if ((userData.axedurability || 0) <= 0) {
        return message.reply(
          "❗ axe sudah rusak dan tidak bisa digunakan lagi. Buat yang baru di `!craft`.",
        );
      }
    

      const lastNebang = userData.lastnebang || 0;
      const currentTime = Date.now();

      if (currentTime - lastNebang < cooldown) {
        const remainingTime = cooldown - (currentTime - lastNebang);
        return message.reply(
          `🌲 Kamu sudah menebang pohon, axe perlu di istirahatkan.\nSilakan kembali lagi dalam **${msToTime(remainingTime)}**.`,
        );
      }

      const processingMsg = await message.reply(
        "🌲 Pergi ke hutan mencari pohon...",
      );

      setTimeout(async () => {
        try {
          const finalUserData = await api.getUser(authorId, authorUsername);
          const kayuGained = Math.floor(Math.random() * 45) + 5;
          finalUserData.kayu = (finalUserData.kayu || 0) + kayuGained;
          finalUserData.axedurability = (finalUserData.axedurability || 0) - 2;
          finalUserData.lastnebang = Date.now();
          await api.updateUser(authorId, finalUserData);
          const resultEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("🪓 Selesai Menebang!")
            .setAuthor({
              name: message.author.username,
              iconURL: message.author.displayAvatarURL(),
            })
            .setDescription(
              `Kamu berhasil mendapatkan **${kayuGained}** 🪵 Kayu.`,
            )
            .addFields({
              name: "Total Kayu Milikmu",
              value: `🪵 ${finalUserData.kayu.toLocaleString("id-ID")}`,
            })
            .setFooter({
              text: `Durability axe tersisa: ${finalUserData.axedurability}`,
            }); 

          await processingMsg.edit({ content: null, embeds: [resultEmbed] });
        } catch (innerError) {
          console.error("[NEBANG ACTION ERROR]", innerError);
          await processingMsg.edit(
            `❌ Terjadi kesalahan saat menebang: ${innerError.message}`,
          );
        }
      }, 3000); 
    } catch (error) {
        console.error("[NEBANG CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    } finally {
       
    }
  },
};