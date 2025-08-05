const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config");
const fs = require("fs");
const path = require("path");

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB dalam byte

module.exports = {
  prefix: "tiktok",
  category: "downloader",
  aliases: [
    "tt",
    "ttdl",
    "ttnowm",
    "tiktokdl",
    "tiktoknowm",
    "douyin",
    "douyindl",
  ],

  async execute(message, args, client, cmd = "tiktok") {
    if (message.author.bot) return;
    if (!args.length) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❗ Masukkan URL TikTok/Douyin")
            .setDescription(
              "Contoh: `!tiktok https://vt.tiktok.com/ZSY8XguF2/`"
            ),
        ],
      });
    }

    const url = args[0].trim();
    if (!url.match(/tiktok|douyin/gi)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❗ URL Tidak Valid")
            .setDescription("Masukkan link TikTok atau Douyin yang benar."),
        ],
      });
    }

    let apiUrl, judulCmd;
    if (
      ["tiktok", "tt", "ttdl", "ttnowm", "tiktokdl", "tiktoknowm"].includes(cmd)
    ) {
      apiUrl = `https://api.betabotz.eu.org/api/download/tiktok?url=${encodeURIComponent(
        url
      )}&apikey=${config.apikey_lann}`;
      judulCmd = "乂 T I K T O K";
    } else {
      apiUrl = `https://api.betabotz.eu.org/api/download/douyin?url=${encodeURIComponent(
        url
      )}&apikey=${config.apikey_lann}`;
      judulCmd = "乂 D O U Y I N";
    }

    await message.react("⏳");
    try {
      const response = await axios.get(apiUrl, { timeout: 25000 });
      const res = response.data.result;
      if (!res || (!res.video && !res.audio))
        throw new Error("Video atau audio tidak ditemukan.");

      let caption = `**${judulCmd}**\n\n`;
      caption += `> Judul: **${res.title || "-"}**\n`;
      caption += `> Judul Audio: **${res.title_audio || "-"}**\n`;

      // [1] Unduh file ke temporary
      const tempDir = path.join(__dirname, "../../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const tempFile = path.join(tempDir, `tt_${Date.now()}.mp4`);
      const writer = fs.createWriteStream(tempFile);

      const videoResponse = await axios({
        url: res.video[0], // Ambil video pertama
        method: "GET",
        responseType: "stream",
        timeout: 30000,
      });

      videoResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // [2] Periksa ukuran file
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
                `Ukuran file melebihi 25MB. Silakan unduh secara manual dari: [${res.video[0]}](${res.video[0]})`
              ),
          ],
        });
        await message.reactions.removeAll().catch(() => {});
        await message.react("❌").catch(() => {});
        return;
      }

      await message.reply({
        content: caption,
        files: [new AttachmentBuilder(tempFile, { name: "tiktok_video.mp4" })],
      });

      // [4] Kirim audio jika ada
      if (res.audio && res.audio[0]) {
        await message.reply({
          files: [
            new AttachmentBuilder(res.audio[0], { name: "tiktok_audio.mp3" }),
          ],
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle("🎶 Audio TikTok")
              .setDescription(`[Download Audio](${res.audio[0]})`),
          ],
        });
      }

      await message.reactions.removeAll().catch(() => {});
      await message.react("✅");
      fs.unlinkSync(tempFile); // Bersihkan file setelah dikirim
    } catch (e) {
      console.error("[TIKTOK DL] Error:", e);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🚩 Terjadi Kesalahan")
            .setDescription(
              "Gagal download dari TikTok/Douyin. Coba link lain atau beberapa saat lagi."
            ),
        ],
      });
      await message.reactions.removeAll().catch(() => {});
      await message.react("❌").catch(() => {});
    }
  },
};
