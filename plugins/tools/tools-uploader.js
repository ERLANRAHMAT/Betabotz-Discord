const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const uploadFile = require("../../lib/uploadFile");
const uploadImage = require("../../lib/uploadImage");

module.exports = {
  prefix: "tourl",
  category: "tools",
  aliases: ["upload"],
  async execute(message, args, client) {
    const attachment = message.attachments.first();
    if (!attachment) {
      return message.reply(
        "❌ Tidak ada media yang ditemukan. Kirim gambar/video/file dengan caption `!tourl` atau reply file dengan command ini."
      );
    }
    const url = attachment.url;
    const name = attachment.name || "file";
    const mime = attachment.contentType || "";
    try {
      // Gunakan node-fetch v2: res.buffer(), node-fetch v3: res.arrayBuffer()
      let fetchBuffer;
      const res = await fetch(url);
      if (typeof res.buffer === "function") {
        fetchBuffer = await res.buffer();
      } else {
        fetchBuffer = Buffer.from(await res.arrayBuffer());
      }
      const buffer = fetchBuffer;
      const isTele = /image\/(png|jpe?g|gif)|video\/mp4/.test(mime);
      const fileSizeLimit = 5 * 1024 * 1024;
      if (buffer.length > fileSizeLimit) {
        return message.reply("Ukuran media tidak boleh melebihi 5MB");
      }
      let link;
      if (isTele) {
        link = await uploadImage(
          buffer,
          "false",
          client.config?.apikey_lann || client.config?.apikey || ""
        );
      } else {
        link = await uploadFile(buffer);
      }
      const embed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle("Hasil Unggah")
        .setDescription(
          `**URL:**\n${link}\n\n**Ukuran:** ${buffer.length} Byte(s)\n${
            isTele
              ? "(Tidak Ada Tanggal Kedaluwarsa)"
              : "(Kedaluwarsa dalam 24 jam)"
          }`
        )
        .setFooter({ text: "BetaBotz Uploader" });
      await message.reply({ embeds: [embed] });
    } catch (e) {
      await message.reply("❌ Gagal mengunggah file: " + e.message);
    }
  },
};
