const { EmbedBuilder } = require("discord.js");
const { promisify } = require("util");
const cp = require("child_process");
const exec = promisify(cp.exec).bind(cp);

module.exports = {
  prefix: "speedtest",
  category: "info",
  aliases: ["ookla"],
  async execute(message, args, client) {
    const waitMsg = await message.reply("⏳ Please wait, running speedtest...");
    try {
      let o;
      try {
        o = await exec("python3 speed.py --share --secure");
      } catch (e) {
        o = e;
      }
      const { stdout, stderr } = o;
      let result = stdout && stdout.trim() ? stdout.trim() : null;
      let error = stderr && stderr.trim() ? stderr.trim() : null;

      if (result) {
        // Kirim hasil sebagai embed
        const embed = new EmbedBuilder()
          .setColor("#67DFF4")
          .setTitle("Speedtest Result")
          .setDescription("```" + result.slice(0, 4000) + "```")
          .setThumbnail("https://telegra.ph/file/ec8cf04e3a2890d3dce9c.jpg")
          .setFooter({ text: "BetaBotz Speedtest" });
        await message.reply({ embeds: [embed] });
      }
      if (error) {
        await message.reply("❌ Error:\n" + error);
      }
      await waitMsg.delete().catch(() => {});
    } catch (e) {
      await waitMsg.edit({ content: "❌ Gagal menjalankan speedtest." });
    }
  },
};
