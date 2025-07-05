const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../../config");

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

module.exports = {
  prefix: "youtubedl",
  category: "downloader",
  aliases: ["yt", "ytmp4", "ytmp3", "ytdl", "youtubedl", "dlyt"],
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
            .setTitle("❗ Masukkan URL YouTube")
            .setDescription(
              "Contoh: `!youtubedl https://www.youtube.com/watch?v=dQw4w9WgXcQ`"
            ),
        ],
      });
    }

    const url = args[0].trim();
    if (!url.match(/(youtube\.com|youtu\.be)/gi)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❗ URL Tidak Valid")
            .setDescription("Masukkan link YouTube yang benar."),
        ],
      });
    }

    await message.react("⏳");
    try {
      const apiUrl = `https://api.betabotz.eu.org/api/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${config.apikey_lann}`;
      const response = await axios.get(apiUrl, { timeout: 25000 });
      const res = response.data.result;

      if (!res || !res.mp4 || !res.mp3) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("🚩 Tidak dapat mengambil video")
              .setDescription(
                "API mengembalikan data tidak sesuai atau video tidak ditemukan.\n\n" +
                "Debug: ```json\n" + JSON.stringify(response.data, null, 2) + "\n```"
              ),
          ],
        });
      }

      const { mp4, mp3, id, title, source, duration } = res;
      let capt = `**YT MP4**\n\n`;
      capt += `◦ **id** : ${id}\n`;
      capt += `◦ **title** : ${title}\n`;
      capt += `◦ **source** : ${source}\n`;
      capt += `◦ **duration** : ${duration}\n`;

      // === AUDIO ===
      try {
        // Download audio ke temp
        const tempDir = path.join(__dirname, "../../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempAudio = path.join(tempDir, `yt_${Date.now()}.mp3`);
        const audioWriter = fs.createWriteStream(tempAudio);

        const audioResponse = await axios({
          url: mp3,
          method: "GET",
          responseType: "stream",
          timeout: 30000,
        });
        audioResponse.data.pipe(audioWriter);

        await new Promise((resolve, reject) => {
          audioWriter.on("finish", resolve);
          audioWriter.on("error", reject);
        });

        const audioStats = fs.statSync(tempAudio);
        if (audioStats.size > MAX_FILE_SIZE) {
          fs.unlinkSync(tempAudio);
          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("🚩 Audio Terlalu Besar")
                .setDescription(
                  `Ukuran file audio melebihi 25MB. Download manual: [${title}.mp3](${mp3})`
                ),
            ],
          });
        } else {
          await message.channel.send({
            content: `🎵 **Audio:** ${title}`,
            files: [new AttachmentBuilder(tempAudio, { name: `${title}.mp3` })],
          });
          fs.unlinkSync(tempAudio);
        }
      } catch (err) {
        console.error("Audio download/send error:", err);
      }

      // === VIDEO ===
      try {
        const tempDir = path.join(__dirname, "../../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempFile = path.join(tempDir, `yt_${Date.now()}.mp4`);
        const writer = fs.createWriteStream(tempFile);

        const videoResponse = await axios({
          url: mp4,
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
                  `Ukuran file melebihi 25MB. Silakan unduh secara manual dari: [${mp4}](${mp4})`
                ),
            ],
          });
        } else {
          await message.channel.send({
            content: capt,
            files: [new AttachmentBuilder(tempFile, { name: `${title}.mp4` })],
          });
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.error("Video download/send error:", err);
      }

      await message.reactions.removeAll().catch(() => {});
      await message.react("✅");
    } catch (error) {
      console.error(error);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🚩 Terjadi Kesalahan")
            .setDescription(
              "Gagal download dari YouTube. Coba link lain atau beberapa saat lagi max video hanya 25MB!."
            ),
        ],
      });
      await message.reactions.removeAll().catch(() => {});
      await message.react("❌").catch(() => {});
    }
  },
};
