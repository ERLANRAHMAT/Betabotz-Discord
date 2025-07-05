const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");
const imageUploader = require("../../lib/imageUploader");

module.exports = {
  prefix: "remini",
  category: "tools",
  aliases: [],
  async execute(message, args, client) {
    console.log("[REMINI] Command triggered by:", message.author.tag);

    // Check for image attachment
    const attachment = message.attachments.first();
    console.log("[REMINI] Attachment:", attachment);

    if (
      !attachment ||
      !attachment.contentType?.startsWith("image/") ||
      attachment.contentType === "image/webp"
    ) {
      console.log("[REMINI] Attachment tidak valid");
      return message.reply(
        `Kirim gambar dengan caption \`${
          config.prefix || "!"
        }remini\` atau reply gambar dengan command ini.`
      );
    }

    const waitMsg = await message.reply(
      "⏳ Sedang memproses gambar dengan Remini..."
    );
    try {
      const apiKey = config.apikey_lann;
      console.log("[REMINI] apiKey:", apiKey);

      // Fetch image buffer
      const imgBuffer = await fetch(attachment.url).then((res) => {
        console.log(
          "[REMINI] Fetching image from URL:",
          attachment.url,
          "Status:",
          res.status
        );
        return res.buffer();
      });
      console.log("[REMINI] imgBuffer length:", imgBuffer.length);

      // Upload to api.betabotz.eu.org
      const uploadResult = await imageUploader(imgBuffer, apiKey, "false");
      console.log("[REMINI] uploadResult:", uploadResult);

      if (
        !uploadResult ||
        typeof uploadResult !== "string" ||
        !uploadResult.startsWith("http")
      ) {
        console.error("[UPLOAD ERROR] uploadResult:", uploadResult);
        await waitMsg.edit({
          content:
            "[ ! ] Gagal upload gambar ke server. Silakan cek log untuk detail.",
        });
        return;
      }

      const imgUrl = uploadResult;
      const apiUrl = `https://api.betabotz.eu.org/api/tools/remini-v2?url=${encodeURIComponent(
        imgUrl
      )}&apikey=${apiKey}`;
      console.log("[REMINI API URL]", apiUrl);

      // Request to API
      const response = await fetch(apiUrl);
      console.log("[REMINI] fetch remini status:", response.status);
      const rawText = await response.text();
      console.log("[REMINI RAW RESPONSE]", rawText);

      let result;
      try {
        result = JSON.parse(rawText);
      } catch (error) {
        console.error("[REMINI PARSE ERROR]", error);
        if (rawText.startsWith("<!DOCTYPE") || rawText.startsWith("<html")) {
          await waitMsg.edit({
            content: `[ ! ] Gagal memproses respons API. Kemungkinan server bermasalah atau diblokir oleh Cloudflare (403 Forbidden).`,
          });
        } else {
          const shortText =
            rawText.length > 500
              ? rawText.slice(0, 500) + "\n... (truncated)"
              : rawText;
          await waitMsg.edit({
            content: `[ ! ] Response API tidak valid JSON. Cek log untuk detail.\n\`\`\`\n${shortText}\n\`\`\``,
          });
        }
        return;
      }
      console.log("[REMINI API RESPONSE]", JSON.stringify(result, null, 2));

      // Check for valid result
      if (!result.status || !result.url) {
        console.error("[REMINI] API response tidak lengkap:", result);
        await waitMsg.edit({
          content: `[ ! ] Gagal mendapatkan hasil dari API.\nResponse: \`\`\`json\n${JSON.stringify(
            result,
            null,
            2
          )}\n\`\`\``,
        });
        return;
      }

      // Fetch result image
      const old = Date.now();
      console.log("[REMINI] Fetching result URL:", result.url);
      const resultBuffer = Buffer.from(
        await fetch(result.url).then((res) => {
          console.log("[REMINI] Fetch result status:", res.status);
          return res.arrayBuffer();
        })
      );
      console.log("[REMINI] resultBuffer length:", resultBuffer.length);

      await message.reply({
        files: [new AttachmentBuilder(resultBuffer, { name: "remini.jpg" })],
        embeds: [
          new EmbedBuilder()
            .setColor("#67DFF4")
            .setTitle("Remini Result")
            .setDescription(`🖼️ *Fetching:* ${Date.now() - old} ms`),
        ],
      });

      await waitMsg.delete().catch(() => {});
      console.log("[REMINI] Selesai tanpa error");
    } catch (e) {
      console.error("[REMINI ERROR]", e);
      await waitMsg.edit({
        content: "[ ! ] Terjadi kesalahan saat memproses gambar.",
      });
    }
  },
};
