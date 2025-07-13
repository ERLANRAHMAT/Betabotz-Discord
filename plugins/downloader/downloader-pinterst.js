const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../../config");

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

module.exports = {
  prefix: "pindl",
  category: "downloader",
  aliases: ["pinterest", "pinterestdl", "pin2", "pindl2"],
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
            .setTitle("❗ Masukkan URL Pinterest")
            .setDescription(
              "Contoh: `!pindl https://www.pinterest.com/pin/123456789/`"
            ),
        ],
      });
    }

    const url = args[0].trim();
    if (!url.match(/pinterest\.com/gi)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❗ URL Tidak Valid")
            .setDescription("Masukkan link Pinterest yang benar."),
        ],
      });
    }

    await message.react("⏳");
    try {
      const apiUrl = `https://api.betabotz.eu.org/api/download/pinterestdl?url=${encodeURIComponent(
        url
      )}&apikey=${config.apikey_lann}`;
      const response = await axios.get(apiUrl, { timeout: 25000 });
      const data = response.data;

      if (!data.result || !data.result.url) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("🚩 Tidak dapat mengambil media")
              .setDescription(
                "API mengembalikan data tidak sesuai atau media tidak ditemukan.\n\n" +
                  "Debug: ```json\n" +
                  JSON.stringify(data, null, 2) +
                  "\n```"
              ),
          ],
        });
      }

      const mediaUrl = data.result.url;
      const title = "pinterest_media";
      // Download file ke temp
      const tempDir = path.join(__dirname, "../../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
      const tempFile = path.join(tempDir, `pin_${Date.now()}.jpg`);
      const writer = fs.createWriteStream(tempFile);

      const mediaResponse = await axios({
        url: mediaUrl,
        method: "GET",
        responseType: "stream",
        timeout: 30000,
      });

      mediaResponse.data.pipe(writer);

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
                `Ukuran file melebihi 25MB. Silakan unduh secara manual dari: [link](${mediaUrl})`
              ),
          ],
        });
      } else {
        await message.channel.send({
          content: "**乂 P I N T E R E S T**\n\n> Link: " + url,
          files: [new AttachmentBuilder(tempFile, { name: `${title}.jpg` })],
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
              "Gagal download dari Pinterest. Coba link lain atau beberapa saat lagi."
            ),
        ],
      });
      await message.reactions.removeAll().catch(() => {});
      await message.react("❌").catch(() => {});
    }
  },
};
