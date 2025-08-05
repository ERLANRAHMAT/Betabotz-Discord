const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");
const imageUploader = require("../../lib/imageUploader");

module.exports = {
  prefix: "jadianime",
  category: "maker",
  aliases: ["toanime"],
  async execute(message, args, client) {
    console.log("[JADIANIME] Command triggered by:", message.author.tag);

    // Cek ada attachment gambar
    const image = message.attachments.first();
    console.log("[JADIANIME] Attachment:", image);

    if (
      !image ||
      !image.contentType?.startsWith("image/") ||
      image.contentType === "image/webp"
    ) {
      console.log("[JADIANIME] Attachment tidak valid");
      return message.reply(
        `Kirim gambar dengan caption \`${
          config.prefix || "!"
        }jadianime\` atau reply gambar dengan command ini.`
      );
    }

    const waitMsg = await message.reply(
      "⏳ Sedang memproses gambar menjadi anime..."
    );
    try {
      const apiKey = config.apikey_lann;
      console.log("[JADIANIME] apiKey:", apiKey);

      // Ambil buffer dari attachment
      const imgBuffer = await fetch(image.url).then((res) => {
        console.log(
          "[JADIANIME] Fetching image from URL:",
          image.url,
          "Status:",
          res.status
        );
        return res.buffer();
      });
      console.log("[JADIANIME] imgBuffer length:", imgBuffer.length);

      // Upload ke api.betabotz.eu.org
      const uploadResult = await imageUploader(imgBuffer, apiKey, "false");
      console.log("[JADIANIME] uploadResult:", uploadResult);

      // uploadResult adalah string URL jika sukses
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
      const apiUrl = `https://api.betabotz.eu.org/api/maker/jadianime?url=${encodeURIComponent(
        imgUrl
      )}&apikey=${config.apikey_lann}`;
      const old = Date.now();
      console.log("[JADIANIME API URL]", apiUrl);

      // Request ke API
      const res = await fetch(apiUrl);
      console.log("[JADIANIME] fetch jadianime status:", res.status);
      const rawText = await res.text();
      console.log("[JADIANIME RAW RESPONSE]", rawText);

      let convert;
      try {
        convert = JSON.parse(rawText);
      } catch (err) {
        console.error("[JADIANIME PARSE ERROR]", err);
        // Deteksi jika response HTML (bukan JSON), tampilkan error singkat
        if (rawText.startsWith("<!DOCTYPE") || rawText.startsWith("<html")) {
          await waitMsg.edit({
            content: `[ ! ] API Jadianime sedang bermasalah atau timeout (bukan JSON, kemungkinan 504/Cloudflare). Silakan coba lagi nanti.`,
          });
        } else {
          // Batasi panjang pesan error ke Discord
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
      console.log("[JADIANIME API RESPONSE]", JSON.stringify(convert, null, 2));

      // Jika response kosong atau bukan objek
      if (!convert || typeof convert !== "object") {
        console.error("[JADIANIME] Response kosong/bukan objek:", convert);
        await waitMsg.edit({
          content: `[ ! ] Gagal mendapatkan hasil dari API.\nResponse: \`\`\`json\n${JSON.stringify(
            convert
          )}\n\`\`\``,
        });
        return;
      }

      // Tampilkan pesan error jika ada
      if (convert.message) {
        console.error("[JADIANIME] API message error:", convert.message);
        await waitMsg.edit({ content: `[ ! ] API Error: ${convert.message}` });
        return;
      }

      // Log dan tampilkan response mentah jika gagal dapat hasil
      if (!convert.result || (!convert.result.img_1 && !convert.result.img_2)) {
        console.error("[JADIANIME] API response tidak lengkap:", convert);
        await waitMsg.edit({
          content: `[ ! ] Gagal mendapatkan hasil dari API.\nResponse: \`\`\`json\n${JSON.stringify(
            convert,
            null,
            2
          )}\n\`\`\``,
        });
        return;
      }

      // Kirim hasil Anime 2D (img_1) jika ada
      if (convert.result.img_1) {
        console.log("[JADIANIME] Fetching img_1:", convert.result.img_1);
        const img1Buffer = Buffer.from(
          await fetch(convert.result.img_1).then((res) => {
            console.log("[JADIANIME] Fetch img_1 status:", res.status);
            return res.arrayBuffer();
          })
        );
        console.log("[JADIANIME] img1Buffer length:", img1Buffer.length);

        await message.reply({
          files: [new AttachmentBuilder(img1Buffer, { name: "anime2d.jpg" })],
          embeds: [
            new EmbedBuilder()
              .setColor("#67DFF4")
              .setTitle("Anime 2D")
              .setDescription(
                `🍟 *Fetching:* ${Date.now() - old} ms\n*Style:* Anime 2D`
              ),
          ],
        });
      }

      // Kirim hasil Anime 3D (img_2) jika ada
      if (convert.result.img_2) {
        console.log("[JADIANIME] Fetching img_2:", convert.result.img_2);
        const img2Buffer = Buffer.from(
          await fetch(convert.result.img_2).then((res) => {
            console.log("[JADIANIME] Fetch img_2 status:", res.status);
            return res.arrayBuffer();
          })
        );
        console.log("[JADIANIME] img2Buffer length:", img2Buffer.length);

        await message.reply({
          files: [new AttachmentBuilder(img2Buffer, { name: "anime3d.jpg" })],
          embeds: [
            new EmbedBuilder()
              .setColor("#67DFF4")
              .setTitle("Anime 3D")
              .setDescription(
                `🍟 *Fetching:* ${Date.now() - old} ms\n*Style:* Anime 3D`
              ),
          ],
        });
      }

      await waitMsg.delete().catch(() => {});
      console.log("[JADIANIME] Selesai tanpa error");
    } catch (e) {
      console.error("[JADIANIME ERROR]", e);
      await waitMsg.edit({
        content: "[ ! ] Terjadi kesalahan saat memproses gambar.",
      });
    }
  },
};
