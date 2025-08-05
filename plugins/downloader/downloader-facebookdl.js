const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../../config");

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

module.exports = {
  prefix: "facebookdl",
  category: "downloader",
  aliases: ["fb", "facebook", "facebookdl", "fbdl", "fbdown", "dlfb"],
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
            .setTitle("❗ Masukkan URL Facebook")
            .setDescription(
              "Contoh: `!facebookdl https://www.facebook.com/100084756252836/videos/3391018171153874/?idorvanity=2765173437119338&mibextid=rS40aB7S9Ucbxw6v`"
            ),
        ],
      });
    }

    const url = args[0].trim();
    if (!url.match(/facebook\.com|fb\.watch/gi)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❗ URL Tidak Valid")
            .setDescription("Masukkan link Facebook yang benar."),
        ],
      });
    }

    await message.react("⏳");
    try {
      const apiUrl = `https://api.betabotz.eu.org/api/download/fbdown?url=${encodeURIComponent(url)}&apikey=${config.apikey_lann}`;
      const response = await axios.get(apiUrl, { timeout: 25000 });
      const data = response.data;

      if (!data.result || !Array.isArray(data.result) || !data.result[0] || !data.result[0]._url) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("🚩 Tidak dapat mengambil video")
              .setDescription(
                "API mengembalikan data tidak sesuai atau video tidak ditemukan.\n\n" +
                "Debug: ```json\n" + JSON.stringify(data, null, 2) + "\n```"
              ),
          ],
        });
      }

      const videoUrl = data.result[0]._url;
      const title = "facebook_video";
      // Download video ke temp
      const tempDir = path.join(__dirname, "../../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
      const tempFile = path.join(tempDir, `fb_${Date.now()}.mp4`);
      const writer = fs.createWriteStream(tempFile);

      const videoResponse = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream",
        timeout: 30000,
      });

      videoResponse.data.pipe(writer);

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
                `Ukuran file melebihi 25MB. Silakan unduh secara manual dari: [link](${videoUrl})`
              ),
          ],
        });
      } else {
        await message.channel.send({
          content: "**乂 F A C E B O O K**\n\n> Link: " + url,
          files: [new AttachmentBuilder(tempFile, { name: `${title}.mp4` })],
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
              "Gagal download dari Facebook. Coba link lain atau beberapa saat lagi."
            ),
        ],
      });
      await message.reactions.removeAll().catch(() => {});
      await message.react("❌").catch(() => {});
    }
  },
};
