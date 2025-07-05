const fetchWithLog = require("../../utils/fetchWithLog");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { sticker5 } = require("../../lib/sticker");
const config = require("../../config");

const packname = process.env.STICKER_PACKNAME || "Arteon";
const author = process.env.STICKER_AUTHOR || "Arteon Studio";
const errorStickerPath = path.join(__dirname, "../../media/sticker/emror.webp");

async function handleStickerCommand(message, client) {
  if (message.author.bot) return;
  if (!message.content.startsWith(config.prefix)) return;

  const [cmd, ...args] = message.content
    .slice(config.prefix.length)
    .trim()
    .split(/\s+/);
  const text =
    args.join(" ") ||
    (message.reference
      ? (await message.channel.messages.fetch(message.reference.messageId))
          .content
      : "");

  if (!["attp", "ttp", "brat", "bratvideo"].includes(cmd)) return;

  if (!text) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("❗ Contoh Penggunaan")
          .setDescription(
            `!${cmd} <teks>\n\natau reply pesan lalu ketik: !${cmd}`
          ),
      ],
    });
  }

  let resUrl;
  let filename = "sticker.webp";
  let isGif = false;

  try {
    if (cmd === "attp") {
      resUrl = `https://api.betabotz.eu.org/api/maker/attp?text=${encodeURIComponent(
        text.substring(0, 151)
      )}&apikey=${config.apikey_lann}`;
    } else if (cmd === "ttp") {
      resUrl = `https://api.betabotz.eu.org/api/maker/ttp?text=${encodeURIComponent(
        text.substring(0, 151)
      )}&apikey=${config.apikey_lann}`;
    } else if (cmd === "brat") {
      resUrl = `https://api.betabotz.eu.org/api/maker/brat?text=${encodeURIComponent(
        text.substring(0, 151)
      )}&apikey=${config.apikey_lann}`;
    } else if (cmd === "bratvideo") {
      resUrl = `https://api.betabotz.eu.org/api/maker/brat-video?text=${encodeURIComponent(
        text.substring(0, 151)
      )}&apikey=${config.apikey_lann}`;
      filename = "bratvideo.mp4";
      isGif = true;
    }

    // Fetch file dari API
    let fetched = await fetchWithLog(resUrl, {}, cmd.toUpperCase());
    let fileBuffer;

    // Cek apakah response JSON (berisi URL) atau file langsung
    const contentType = fetched.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const json = await fetched.json();
      if (!json.result) throw new Error("API tidak mengembalikan file.");
      // Fetch ulang ke URL file
      fetched = await fetchWithLog(
        json.result,
        {},
        cmd.toUpperCase() + "-FILE"
      );
      if (!fetched.ok) throw new Error("Gagal fetch file dari URL API.");
      fileBuffer = await fetched.buffer();
    } else {
      if (!fetched.ok) throw new Error("Gagal fetch file dari API.");
      fileBuffer = await fetched.buffer();
    }

    let sendBuffer = fileBuffer;
    // Untuk sticker (webp), bisa proses dengan sticker5 jika mau
    if (!isGif && typeof sticker5 === "function") {
      const result = await sticker5(fileBuffer, null, packname, author, ["🎨"]);
      if (result) sendBuffer = result;
    }

    await message.reply({
      files: [new AttachmentBuilder(sendBuffer, { name: filename })],
    });
  } catch (e) {
    console.error("Error:", e);
    // Kirim sticker error jika gagal
    if (fs.existsSync(errorStickerPath)) {
      await message.reply({
        files: [new AttachmentBuilder(errorStickerPath)],
      });
    } else {
      await message.reply("❌ Gagal membuat sticker.");
    }
  }
}

module.exports = {
  prefix: "sticker",
  category: "feature",
  aliases: ["attp", "ttp", "brat", "bratvideo"],
  execute: async (message, args, client) => {
    let cmd = args[0];
    let text = args.slice(1).join(" ");
    if (!cmd) return message.reply("❗ Contoh: !sticker attp teks");

    if (!text && message.reference) {
      const replied = await message.channel.messages.fetch(
        message.reference.messageId
      );
      text = replied.content;
    }

    message.content = `!${cmd} ${text}`;
    await handleStickerCommand(message, client);
  },
  handleMessage: async (message, client) => {
    await handleStickerCommand(message, client);
  },
};
