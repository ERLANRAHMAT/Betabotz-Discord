const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const path = require("path");
const Database = require("better-sqlite3");
const db = new Database(path.join(__dirname, "../../data/plana.sqlite"));
const config = require("../../config"); // Tambahkan ini di atas

const img = [`https://telegra.ph/file/abbff76a98455a64d3a07.jpg`];
function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())];
}

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 menit (ms)
const timeoutMap = new Map(); // Untuk tracking timeout per user

// Inisialisasi tabel jika belum ada
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    userId TEXT PRIMARY KEY,
    pesan TEXT,
    active INTEGER DEFAULT 0
  )
`);

// Fungsi untuk mengambil session
function getSession(userId) {
  const stmt = db.prepare(
    "SELECT pesan, active FROM sessions WHERE userId = ?"
  );
  const row = stmt.get(userId);
  if (row) {
    return {
      userId,
      pesan: row.pesan ? JSON.parse(row.pesan) : [],
      active: !!row.active,
    };
  }
  return null;
}

// Fungsi untuk menyimpan atau memperbarui session
function setSession(userId, data) {
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO sessions (userId, pesan, active) VALUES (?, ?, ?)"
  );
  stmt.run(userId, JSON.stringify(data.pesan), data.active ? 1 : 0);
}

// Fungsi untuk menghapus session
function deleteSession(userId) {
  const stmt = db.prepare("DELETE FROM sessions WHERE userId = ?");
  stmt.run(userId);
}

async function aiBeta(message) {
  try {
    const params = {
      message: message,
      apikey: config.apikey_lann,
    };
    const { data } = await axios.post(
      "https://api.betabotz.eu.org/api/search/openai-custom",
      params
    );
    return data;
  } catch (error) {
    throw error;
  }
}

// Handler utama command prefix: a!plana [on/off]
module.exports = {
  prefix: "plana",
  category: "ai",
  execute: async (msg, args, client) => {
    // a!plana on/off
    const text = args[0] && args[0].toLowerCase();
    const sessionKey = `plana_${msg.author.id}`;
    if (!text) {
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❗ Gunakan: !plana on/off")
            .setDescription("Contoh: `!plana on` untuk mengaktifkan session."),
        ],
      });
    }
    if (text === "on") {
      let session = getSession(sessionKey);
      if (!session) {
        setSession(sessionKey, { pesan: [], active: true });
        setSessionTimeout(msg.author.id, msg.channel, db);
        await msg.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x3498db)
              .setTitle("⬣───「 *PLANA* 」───⬣")
              .setDescription(`Halo sensei! plana siap membantu sensei`)
              .setThumbnail(pickRandom(img)),
          ],
        });
      } else {
        setSession(sessionKey, { ...session, active: true });
        setSessionTimeout(msg.author.id, msg.channel, db);
        await msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x3498db)
              .setTitle("⬣───「 *PLANA* 」───⬣")
              .setDescription(`Session plana diperpanjang!`)
              .setThumbnail(pickRandom(img)),
          ],
        });
      }
    } else if (text === "off") {
      deleteSession(sessionKey);
      clearSessionTimeout(msg.author.id);
      await msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("⬣───「 *PLANA* 」───⬣")
            .setDescription(`Senang sudah membantu sensei!`)
            .setThumbnail(pickRandom(img)),
        ],
      });
    }
  },
  handleMessage: async (msg, client) => {
    // Untuk kompatibilitas, tetap jalankan session via prefix a!plana
    const PREFIX = "a!";
    if (!msg.content.startsWith(PREFIX)) return;
    const [cmd, ...args] = msg.content.slice(PREFIX.length).trim().split(/\s+/);
    if (!["plana"].includes(cmd)) return;
    if (msg.author.bot) return;
    // Panggil ulang execute agar tidak duplikat kode
    await module.exports.execute(msg, args, client);
  },
  handleAuto: async function (message, client) {
    if (message.author.bot) return;
    if (!message.content) return;

    const sessionKey = `plana_${message.author.id}`;
    const session = getSession(sessionKey);
    if (!session || !session.active) return;

    if (
      message.content.startsWith(".") ||
      message.content.startsWith("#") ||
      message.content.startsWith("!") ||
      message.content.startsWith("/") ||
      message.content.startsWith("\\/")
    )
      return;

    // Perpanjang timeout session
    setSessionTimeout(message.author.id, message.channel, db);

    // Ambil history pesan
    let pesanHistory = session.pesan || [];

    // Siapkan message untuk AI
    const messages = [
      {
        role: "system",
        content:
          "kamu adalah plana, Seorang murid dari sensei di Blue archive yang siap membantu sensei kapan pun! 🍄✨",
      },
      {
        role: "assistant",
        content: `Kamu adalah plana, murid dari sensei blue archive, jangan gunakan saya, aku, gua gunakan plana untuk memanggil dirimu, ekspresi kan sikap kamu mirip seroang murid dari blue archive yang ada di Shittim Chest yang bernama plana, jangan gunakan GPT 4 panggil dirimu dengan plana, Kamu berbicara dengan ${
          message.member?.displayName || message.author.username
        } panggil dengan sensei, saat berbicara dengannya gunakan emoji yang lucu, Pembuatmu dana nomer WhatsApp nya ini 6281289694906 `,
      },
      ...pesanHistory.map((msg, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: msg,
      })),
      { role: "user", content: message.content },
    ];

    try {
      const res = await aiBeta(messages);
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle("⬣───「 *PLANA* 」───⬣")
            .setDescription(res.result)
            .setThumbnail(pickRandom(img)),
        ],
      });

      // Simpan pesan ke history
      const pesanBaru = [
        ...(pesanHistory || []),
        message.content,
        res.result,
      ].slice(-10); // Simpan max 10 pesan terakhir agar tidak membebani DB
      setSession(sessionKey, { ...session, pesan: pesanBaru });
    } catch (e) {
      console.error("Kesalahan Dalam mengambil Data", e);
      await message.reply("❌ Error mengambil data AI.");
    }
  },
};

function setSessionTimeout(userId, channel, db) {
  clearSessionTimeout(userId);
  timeoutMap.set(
    userId,
    setTimeout(async () => {
      deleteSession(userId);
      channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle("⬣───「 *PLANA* 」───⬣")
            .setDescription("Session plana telah berakhir (timeout 5 menit)."),
        ],
      });
    }, SESSION_TIMEOUT)
  );
}
function clearSessionTimeout(userId) {
  if (timeoutMap.has(userId)) {
    clearTimeout(timeoutMap.get(userId));
    timeoutMap.delete(userId);
  }
}
