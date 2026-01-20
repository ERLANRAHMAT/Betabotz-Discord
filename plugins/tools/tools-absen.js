const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

/**
 * =========================
 * CONFIG API
 * =========================
 */
const API_BASE = "https://api.danafxc.my.id/api/proxy/features/attendance";
const API_KEY = config.api.apiKey;

/**
 * =========================
 * AXIOS INSTANCE
 * =========================
 */
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  params: { apikey: API_KEY },
});

/**
 * =========================
 * UTILS
 * =========================
 */
function isAdmin(member) {
  return member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

async function handleUserAbsen(message) {
  const sessionId = message.channel.id; // session = channel
  const guildId = message.guild.id;
  const userId = message.author.id;

  // 🔥 Ambil alasan dari teks setelah command
  const args = message.content
    .slice(config.prefix.length)
    .trim()
    .split(/ +/)
    .slice(1);

  const reason = args.length > 0 ? args.join(" ") : "-";

  const payload = {
    guild_id: guildId,
    user_id: userId,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    reason,
  };

  try {
    const res = await api.post("/attend", payload);

    return message.reply(
      `✅ **${message.author.username}** Kamu berhasil absen!\n🔥 Streak: **${res.data.streak_total} hari**`
    );
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message;

    if (status === 409) {
      return message.reply(`❗**${message.author.username}** Kamu sudah absen hari ini! absen kembali besok.`);
    }

    if (status === 404) {
      return message.reply("❌ Tidak ada sesi absensi aktif, !absen untuk memulai absen");
    }

    console.error("[ABSEN]", err.response?.data || err.message);
    return message.reply("❌ Terjadi kesalahan pada server saat absen. hubungi admin!");
  }
}



/**
 * =========================
 * STOP SESSION
 * =========================
 */
async function handleStopAbsen(message) {
  if (!isAdmin(message.member)) {
    return message.reply("❌ Perintah ini hanya untuk admin.");
  }

  const sessionId = message.channel.id;

  try {
    await api.post("/session/stop", {
      session_id: sessionId,
    });

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("🚫 Sesi Absensi Ditutup");

    return message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("[STOP SESSION]", err.response?.data || err.message);
    return message.reply("❌ Gagal menutup sesi absensi, hubungi admin!");
  }
}

/**
 * =========================
 * USER ABSEN
 * =========================
 */
async function handleCekAbsen(message) {
  const sessionId = message.channel.id; // SESSION = CHANNEL

  try {
    const res = await api.get(`/sessions/${sessionId}`);
    const data = res.data;

    if (!data?.session_info || !data.session_info.is_active) {
      return message.reply("❌ Tidak ada sesi absensi aktif, !absen untuk memulai absen");
    }

    const { session_info, attendees, total_hadir } = data;

    // 📋 List absensi + streak
    const list =
      attendees.length === 0
        ? "Belum ada yang absen."
        : attendees
            .map((a, i) => {
              const time = new Date(a.timestamp).toLocaleTimeString("id-ID", {
                timeZone: "Asia/Jakarta",
              });

              return (
                `${i + 1}. <@${a.user_id}>` + ` | ${time} | Streak: **${a.current_streak} hari**`
              );
            })
            .join("\n");

    // 📦 Embed
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("📋 Daftar Kehadiran")
      .setDescription(list)
      .addFields(
        { name: "📝 Alasan", value: session_info.reason || "-" },
        { name: "👥 Total Hadir", value: `${total_hadir} orang` }
      )
    return message.reply({ embeds: [embed] });
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message;

    if (status === 409) {
      return message.reply(`❗ ${msg || "Kamu sudah absen hari ini."}`);
    }

    if (status === 404) {
      return message.reply("❌ Tidak ada sesi absensi aktif.");
    }

    console.error("[ABSEN]", err.response?.data || err.message);
    return message.reply("❌ Terjadi kesalahan pada server, hubungi admin!");
  }
}



/**
 * =========================
 * MY STREAK
 * =========================
 */
async function handleMyStreak(message) {
  try {
    const res = await api.get("/streaks", {
      params: {
        guild_id: message.guild.id,
        user_id: message.author.id,
      },
    });

    // 🔴 FIX UTAMA DI SINI
    if (!Array.isArray(res.data) || res.data.length === 0) {
      return message.reply("🔥 Kamu belum memiliki streak absensi.");
    }

    const streak = res.data[0]; // ambil data pertama

    return message.reply(
      `🔥 Streak absensi-mu saat ini **${streak.currentStreak} hari**\n📅 Terakhir: ${streak.lastAttendance}`
    );
  } catch (err) {
    console.error("[MY STREAK]", err.response?.data || err.message);
    return message.reply("❌ Gagal mengambil data streak, hubungi admin!");
  }
}

/**
 * =========================
 * ALL STREAK (LEADERBOARD)
 * =========================
 */
async function handleAllStreak(message, client) {
  const sessionId = message.channel.id; // 🔥 SESSION = CHANNEL

  try {
    const res = await api.get(`/sessions/${sessionId}`);
    const data = res.data;

    if (!data?.session_info || !data.session_info.is_active) {
      return message.reply("❌ Tidak ada sesi absensi aktif.");
    }

    const attendees = Array.isArray(data.attendees) ? data.attendees : [];

    if (attendees.length === 0) {
      return message.reply("❌ Belum ada peserta absensi.");
    }

    // 🔥 Sort berdasarkan streak
    const top = attendees
      .sort((a, b) => b.current_streak - a.current_streak)
      .slice(0, 10);

    const lines = await Promise.all(
      top.map(async (u, i) => {
        try {
          const user = await client.users.fetch(u.user_id);
          return `${i + 1}. **${user.username}** — 🔥 ${u.current_streak} hari`;
        } catch {
          return `${i + 1}. <@${u.user_id}> — 🔥 ${u.current_streak} hari`;
        }
      })
    );

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("🏆 Leaderboard Streak Absensi")
      .setDescription(lines.join("\n"))
      .setFooter({
        text: `Total peserta: ${attendees.length}`,
      });

    return message.reply({ embeds: [embed] });
  } catch (err) {
    const status = err.response?.status;

    // 🔥 BACKEND KIRIM 404 → SESSION TIDAK ADA
    if (status === 404) {
      return message.reply("❌ Tidak ada sesi absensi aktif.");
    }

    console.error("[ALL STREAK]", err.response?.data || err.message);
    return message.reply("❌ Terjadi kesalahan pada server, hubungi admin!");
  }
}


/**
 * =========================
 * COMMAND EXPORT
 * =========================
 */
module.exports = {
  prefix: "absen",
  category: "absen",
  aliases: [
    "mulaiabsen",
    "startabsen",
    "stopabsen",
    "hapusabsen",
    "cekabsen",
    "checkabsen",
    "mystreak",
    "allstreak",
  ],

  async execute(message, args, client) {
    const command = message.content
      .slice(config.prefix.length)
      .trim()
      .split(/ +/)[0]
      .toLowerCase();

    switch (command) {
      case "mulaiabsen":
      case "startabsen":
        return handleUserAbsen(message);

      case "stopabsen":
      case "hapusabsen":
        return handleStopAbsen(message);

      case "cekabsen":
      case "checkabsen":
        return handleCekAbsen(message);

      case "mystreak":
        return handleMyStreak(message);

      case "allstreak":
        return handleAllStreak(message, client);

      case "absen":
      default:
        return handleUserAbsen(message);
    }
  },
};
