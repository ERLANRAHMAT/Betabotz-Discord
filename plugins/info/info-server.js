const { EmbedBuilder } = require("discord.js");
const os = require("os");
const config = require("../../config");

// Helper untuk uptime (format hh:mm:ss)
function getUptime(ms) {
  let h = Math.floor(ms / 3600);
  let m = Math.floor((ms % 3600) / 60);
  let s = Math.floor(ms % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

module.exports = {
  async handleMessage(message) {
    if (message.author.bot) return;
    const prefix = config.prefix || "!";
    if (message.content.toLowerCase() !== `${prefix}server`) return;

    try {
      // Ganti os.uptime() menjadi process.uptime()
      const uptime = process.uptime();
      const platform = os.platform();
      const cpu = os.cpus()[0].model;
      const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2); // Convert to GB
      const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2); // Convert to GB

      const serverEmbed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle("🖥️ Server Specifications")
        .setDescription(
          `
**Platform:** ${platform}
**CPU:** ${cpu}
**Total Memory:** ${totalMemory} GB
**Free Memory:** ${freeMemory} GB
**Uptime:** ${getUptime(uptime)}
        `
        )
        .setFooter({
          text: "ArteonStudio • Server Info",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      await message.reply({ embeds: [serverEmbed] });
    } catch (error) {
      console.error(
        `Error saat menjalankan ${prefix}server untuk ${message.author.tag}:`,
        error
      );
      await message.reply(
        `❌ Gagal mendapatkan spesifikasi server: ${error.message}`
      );
    }
  },
};
