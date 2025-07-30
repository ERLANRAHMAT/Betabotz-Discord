const { EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

module.exports = {
  prefix: "speedtest",
  category: "info",
  aliases: ["ookla", "st"],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const initialEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setDescription("🚀 Memulai tes kecepatan internet server... Ini mungkin memerlukan waktu sekitar satu menit.");
    
    const processingMessage = await message.reply({ embeds: [initialEmbed] });

    try {
      // Menjalankan perintah dengan flag --secure untuk memastikan URL menggunakan https jika memungkinkan
      const { stdout, stderr } = await execPromise('speedtest-cli --simple --share --secure');

      if (stderr) {
        console.error(`[SPEEDTEST STDERR] ${stderr}`);
        throw new Error("Terjadi kesalahan internal pada skrip speedtest.");
      }

      let imageUrl = null;
      const regex = /^Share results:\s*(https?:\/\/\S+)/im;
      const match = stdout.match(regex);

      if (match && match[1]) {
          imageUrl = match[1];
      }

      const resultEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle("✅ Hasil Tes Kecepatan Server")
        .setDescription("Berikut adalah hasil tes kecepatan dari server tempat bot ini berjalan.\n```\n" + stdout.trim() + "\n```")
        .setFooter({ text: `Tes dilakukan oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      
      if (imageUrl) {
        resultEmbed.setImage(imageUrl);
      }
      
      await processingMessage.edit({ content: "Tes Selesai!", embeds: [resultEmbed] });

    } catch (error) {
      console.error("[SPEEDTEST EXEC ERROR]", error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription(
            "Gagal menjalankan perintah speedtest.\n" +
            "Pastikan `speedtest-cli` sudah terinstal di server bot (`sudo apt install speedtest-cli`)."
        );
      
      await processingMessage.edit({ content: "Gagal!", embeds: [errorEmbed] });
    }
  },
};