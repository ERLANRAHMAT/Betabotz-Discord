const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  prefix: "totalfitur",
  category: "info",
  aliases: [],
  async execute(message, args, client) {
    // Ambil semua prefix command dan slash command unik
    const prefixCmds = Array.from(client.prefixCommands.keys());
    const slashCmds = Array.from(client.slashCommands.keys());
    // Gabungkan dan filter unik
    const allCmds = Array.from(new Set([...prefixCmds, ...slashCmds]));
    const total = allCmds.length;

    // Hitung jumlah file di semua folder plugins
    const pluginsRoot = path.join(__dirname, "../../plugins");
    const folders = [
      "store",
      "internet",
      "ai",
      "feature",
      "main",
      "maker",
      "tools",
      "downloader",
      "info",
    ];
    let totalFiles = 0;

    for (const folder of folders) {
      const folderDir = path.join(pluginsRoot, folder);
      try {
        const folderFiles = fs
          .readdirSync(folderDir)
          .filter((f) => f.endsWith(".js"));
        totalFiles += folderFiles.length;
      } catch (e) {
        // Lewati jika folder tidak ada
      }
    }

    const embed = new EmbedBuilder()
      .setColor("#67DFF4")
      .setTitle("📊 Total Fitur Bot")
      .setDescription(
        `Saat ini bot memiliki **${total}** fitur/command unik.\n\n` +
          `• Prefix (!): \`${prefixCmds.length}\`\n` +
          `• Slash (/): \`${slashCmds.length}\`\n` +
          `• Total file di semua folder plugins: \`${totalFiles}\``
      )
      .setFooter({ text: "BetaBotz • ArteonStudio" })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
