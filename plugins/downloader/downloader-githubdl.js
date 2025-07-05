const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../../config");

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

module.exports = {
  prefix: "githubdl",
  category: "downloader",
  aliases: ["ghdl", "github", "githubdl", "dlgithub"],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    if (message.author.bot) return;
    if (!args.length) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❗ Masukkan URL GitHub file/raw")
            .setDescription(
              "Contoh: `!githubdl https://raw.githubusercontent.com/user/repo/branch/file.txt`"
            ),
        ],
      });
    }

    const url = args[0].trim();
    if (!url.match(/githubusercontent\.com/gi)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❗ URL Tidak Valid")
            .setDescription("Masukkan link raw file GitHub yang benar."),
        ],
      });
    }

    await message.react("⏳");
    try {
      // Download file ke temp
      const tempDir = path.join(__dirname, "../../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
      const fileName = path.basename(url.split("?")[0]);
      const tempFile = path.join(tempDir, `gh_${Date.now()}_${fileName}`);
      const writer = fs.createWriteStream(tempFile);

      const fileResponse = await axios({
        url: url,
        method: "GET",
        responseType: "stream",
        timeout: 30000,
      });

      fileResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const stats = fs.statSync(tempFile);
      const fileSize = stats.size;

      if (fileSize > MAX_FILE_SIZE) {
        fs.unlinkSync(tempFile);
        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("🚩 File Terlalu Besar")
              .setDescription(
                `Ukuran file melebihi 25MB. Silakan unduh secara manual dari: [link](${url})`
              ),
          ],
        });
      } else {
        await message.channel.send({
          content: "**乂 G I T H U B**\n\n> Link: " + url,
          files: [new AttachmentBuilder(tempFile, { name: fileName })],
        });
        fs.unlinkSync(tempFile);
      }

      await message.reactions.removeAll().catch(() => {});
      await message.react("✅");
    } catch (e) {
      console.error(e);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🚩 Terjadi Kesalahan")
            .setDescription(
              "Gagal download dari GitHub. Coba link lain atau beberapa saat lagi."
            ),
        ],
      });
      await message.reactions.removeAll().catch(() => {});
      await message.react("❌").catch(() => {});
    }
  },
};
