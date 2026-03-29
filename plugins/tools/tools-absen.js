const {
  EmbedBuilder,
  AttachmentBuilder,
  PermissionsBitField,
} = require("discord.js");
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
  const sessionId = message.channel.id;
  const guildId = message.guild.id;
  const userId = message.author.id;
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
    const streakTotal = res.data.streak_total;
    let attachment = null;
    try {
      const avatarUrl = message.author.displayAvatarURL({
        extension: "png",
        size: 1024,
      });

      const makerUrl =
        "https://api.danafxc.my.id/api/proxy/maker/attendance-success";
      const makerBody = new URLSearchParams();
      makerBody.append("avatarUrl", avatarUrl);
      makerBody.append("username", message.author.username);
      makerBody.append("newStreak", streakTotal.toString());
      makerBody.append("blurValue", "5");
      makerBody.append("backgroundUrl", avatarUrl);
      const imgRes = await axios.post(makerUrl, makerBody, {
        params: { apikey: API_KEY },
        responseType: "arraybuffer",
      });

      attachment = new AttachmentBuilder(imgRes.data, {
        name: "attendance-card.png",
      });
    } catch (imgErr) {
      console.error(
        "[MAKER ERROR]",
        imgErr.response?.data
          ? imgErr.response.data.toString()
          : imgErr.message,
      );
    }

    const replyOptions = {
      content: `✅ Absen berhasil!`,
    };

    if (attachment) {
      replyOptions.files = [attachment];
    }

    return message.reply(replyOptions);
  } catch (err) {
    const status = err.response?.status;

    if (status === 409) {
      return message.reply(
        `❗**${message.author.username}** Kamu sudah absen hari ini! absen kembali besok.`,
      );
    }

    if (status === 404) {
      return message.reply(
        "❌ Tidak ada sesi absensi aktif, !absen untuk memulai absen",
      );
    }

    console.error("[ABSEN]", err.response?.data || err.message);
    return message.reply(
      "❌ Terjadi kesalahan pada server saat absen. hubungi admin!",
    );
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
async function handleCekAbsen(message, client) {
  const sessionId = message.channel.id;

  const processingMsg = await message.reply("🔍 Mengambil daftar hadir...");

  try {
    const res = await api.get(`/sessions/${sessionId}`);
    const data = res.data;

    if (!data?.session_info || !data.session_info.is_active) {
      await processingMsg.delete().catch(() => {});
      return message.reply(
        "❌ Tidak ada sesi absensi aktif, !absen untuk memulai absen",
      );
    }

    const { session_info, attendees, total_hadir } = data;

    if (!attendees || attendees.length === 0) {
      await processingMsg.delete().catch(() => {});
      return message.reply("❌ Belum ada yang absen.");
    }
    const usersForApi = await Promise.all(
      attendees.map(async (a) => {
        let username = "Unknown";
        try {
          const user = await client.users.fetch(a.user_id);
          username = user.username;
        } catch {
          username = `User-${a.user_id.slice(0, 4)}`;
        }

        const dateObj = new Date(a.timestamp);
        const timeString = dateObj
          .toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "Asia/Jakarta",
          })
          .replace(/:/g, ".");

        return {
          username: username,
          streak: a.current_streak,
          time: timeString,
        };
      }),
    );
    let attachment = null;
    try {
      const makerUrl =
        "https://api.danafxc.my.id/api/proxy/maker/attendance-list";
      const guildIcon = message.guild.iconURL({ extension: "png", size: 1024 });

      const makerBody = new URLSearchParams();
      makerBody.append("users", JSON.stringify(usersForApi)); // Wajib JSON String
      if (guildIcon) makerBody.append("backgroundUrl", guildIcon);
      makerBody.append("blurValue", "10");

      const imgRes = await axios.post(makerUrl, makerBody, {
        params: { apikey: API_KEY },
        responseType: "arraybuffer",
      });

      attachment = new AttachmentBuilder(imgRes.data, {
        name: "attendance-list.png",
      });
    } catch (imgErr) {
      console.error("[MAKER ERROR]", imgErr.message);
    }

    await processingMsg.delete().catch(() => {});

    if (attachment) {
      return message.reply({
        content: `📋 **Daftar Kehadiran**\nTotal: **${total_hadir} orang**\n📝 Alasan: ${session_info.reason || "-"}`,
        files: [attachment],
      });
    }

    const list = usersForApi
      .map(
        (u, i) =>
          `${i + 1}. **${u.username}** | ${u.time} | Streak: **${u.streak} hari**`,
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("📋 Daftar Kehadiran")
      .setDescription(list)
      .addFields(
        { name: "📝 Alasan", value: session_info.reason || "-" },
        { name: "👥 Total Hadir", value: `${total_hadir} orang` },
      );

    return message.reply({ embeds: [embed] });
  } catch (err) {
    await processingMsg.delete().catch(() => {});
    const status = err.response?.status;

    if (status === 409)
      return message.reply(
        `❗ ${err.response?.data?.message || "Error konflik."}`,
      );
    if (status === 404)
      return message.reply("❌ Tidak ada sesi absensi aktif.");

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
    const processingMsg = await message.reply("🔍 Mengambil data streak-mu...");

    const res = await api.get("/streaks", {
      params: {
        guild_id: message.guild.id,
        user_id: message.author.id,
      },
    });

    if (!Array.isArray(res.data) || res.data.length === 0) {
      return processingMsg.edit("🔥 Kamu belum memiliki streak absensi.");
    }

    const streakData = res.data[0];
    const dateObj = new Date(streakData.lastAttendance);
    const dateString = dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    let attachment = null;
    try {
      const avatarUrl = message.author.displayAvatarURL({
        extension: "png",
        size: 1024,
      });

      const makerUrl =
        "https://api.danafxc.my.id/api/proxy/maker/attendance-card";

      const makerBody = new URLSearchParams();
      makerBody.append("avatarUrl", avatarUrl);
      makerBody.append("username", message.author.username);
      makerBody.append("streakCount", streakData.currentStreak.toString());
      makerBody.append("lastAbsenDate", dateString);
      makerBody.append("blurValue", "5");
      makerBody.append("backgroundUrl", avatarUrl);

      const imgRes = await axios.post(makerUrl, makerBody, {
        params: { apikey: API_KEY },
        responseType: "arraybuffer",
      });

      attachment = new AttachmentBuilder(imgRes.data, {
        name: "streak-card.png",
      });
    } catch (imgErr) {
      console.error("[MAKER ERROR]", imgErr.message);
    }
    const replyOptions = {
      content: `🔥 Streak absensi-mu: **${streakData.currentStreak} hari**\n📅 Terakhir absen: ${dateString}`,
      embeds: [],
    };

    if (attachment) {
      replyOptions.files = [attachment];
    }
    await processingMsg.delete().catch(() => {});
    return message.reply(replyOptions);
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

async function handleAllStreak(message, client, args) {
  // Cek argumen pertama: 'all' atau 'ch' (default 'ch')
  const subCommand = args[0]?.toLowerCase();

  if (!subCommand || (subCommand !== "all" && subCommand !== "ch")) {
    return message.reply(
      "**Perintah tidak lengkap!**\n" +
        "Gunakan salah satu:\n" +
        "• `!allstreak all` — Lihat Top Streak se-Server (Global) ikuti angka untuk limit Leader yang di ambil\n" +
        "• `!allstreak ch` — Lihat Top Streak di Channel ini (Sesi Absen)",
    );
  }
 const mode = subCommand;

  const processingMsg = await message.reply(
    `Mengambil data leaderboard **${mode === "all" ? "Server" : "Sesi Channel"}**...`,
  );

  try {
    let usersForApi = [];
    let totalCount = 0;
    let titleText = "";

    // ============================================================
    // MODE 1: GLOBAL SERVER (!allstreak all)
    // ============================================================
    if (mode === "all") {
      // Parsing Limit (Max 20, Default 10)
      let limit = 10;
      if (args[1] && !isNaN(args[1])) {
        limit = parseInt(args[1]);
        if (limit > 15) limit = 15; // Batas Max
        if (limit < 1) limit = 1;
      }

      // Fetch Data API Leaderboard
      const res = await api.get("/leaderboard", {
        params: {
          guild_id: message.guild.id,
          limit: limit,
        },
      });

      const data = res.data;
      const topUsers = data.top_users || [];
      totalCount = data.count || topUsers.length;
      titleText = `🏆 Leaderboard Server (Top ${topUsers.length})`;

      if (topUsers.length === 0) {
        await processingMsg.delete().catch(() => {});
        return message.reply("❌ Belum ada data streak di server ini.");
      }

      // Format Data User
      usersForApi = await Promise.all(
        topUsers.map(async (u) => {
          let username = "Unknown";
          try {
            const user = await client.users.fetch(u.user_id);
            username = user.username;
          } catch {
            username = `User-${u.user_id.slice(0, 4)}`;
          }

          // Format Tanggal: "2026-01-28" -> "28 Jan 2026"
          // Kita pakai tanggal ini untuk mengisi kolom 'time' di gambar
          const dateObj = new Date(u.lastAttendance);
          const dateString = dateObj.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          return {
            username: username,
            streak: u.currentStreak,
            time: dateString, // Di mode 'all', kolom waktu diisi tanggal
          };
        }),
      );
    }
    // ============================================================
    // MODE 2: CHANNEL SESSION (!allstreak ch)
    // ============================================================
    else {
      const sessionId = message.channel.id;
      const res = await api.get(`/sessions/${sessionId}`);
      const data = res.data;

      if (!data?.session_info || !data.session_info.is_active) {
        await processingMsg.delete().catch(() => {});
        return message.reply("❌ Tidak ada sesi absensi aktif di channel ini.");
      }

      const attendees = Array.isArray(data.attendees) ? data.attendees : [];
      if (attendees.length === 0) {
        await processingMsg.delete().catch(() => {});
        return message.reply("❌ Belum ada peserta absensi.");
      }

      totalCount = attendees.length;
      titleText = `🏆 Leaderboard Sesi (Top 10)`;

      // Sortir Top 10
      const top = attendees
        .sort((a, b) => b.current_streak - a.current_streak)
        .slice(0, 10);

      // Format Data User
      usersForApi = await Promise.all(
        top.map(async (u) => {
          let username = "Unknown";
          try {
            const user = await client.users.fetch(u.user_id);
            username = user.username;
          } catch {
            username = `User-${u.user_id.slice(0, 4)}`;
          }

          // Format Waktu: 09.26.06
          const dateObj = new Date(u.timestamp);
          const timeString = dateObj
            .toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
              timeZone: "Asia/Jakarta",
            })
            .replace(/:/g, ".");

          return {
            username: username,
            streak: u.current_streak,
            time: timeString,
          };
        }),
      );
    }

    // ============================================================
    // GENERATE IMAGE (Sama untuk kedua mode)
    // ============================================================
    let attachment = null;
    try {
      const makerUrl =
        "https://api.danafxc.my.id/api/proxy/maker/attendance-leaderboard";
      const guildIcon = message.guild.iconURL({ extension: "png", size: 1024 });

      const makerBody = new URLSearchParams();
      makerBody.append("users", JSON.stringify(usersForApi));
      makerBody.append("totalAttendees", totalCount.toString()); // Total asli server/sesi
      if (guildIcon) makerBody.append("backgroundUrl", guildIcon);
      makerBody.append("blurValue", "10");

      const imgRes = await axios.post(makerUrl, makerBody, {
        params: { apikey: API_KEY },
        responseType: "arraybuffer",
      });

      attachment = new AttachmentBuilder(imgRes.data, {
        name: "leaderboard.png",
      });
    } catch (imgErr) {
      console.error("[MAKER ERROR]", imgErr.message);
    }

    await processingMsg.delete().catch(() => {});

    // Kirim Hasil
    if (attachment) {
      return message.reply({
        content: `**${titleText}**\nTotal Data: **${totalCount}** user.`,
        files: [attachment],
      });
    }

    // Fallback Embed
    const lines = usersForApi.map(
      (u, i) =>
        `${i + 1}. **${u.username}** — 🕒 ${u.time} | 🔥 ${u.streak} hari`,
    );

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(titleText)
      .setDescription(lines.join("\n"))
      .setFooter({ text: `Total: ${totalCount}` });

    return message.reply({ embeds: [embed] });
  } catch (err) {
    await processingMsg.delete().catch(() => {});
    const status = err.response?.status;

    if (status === 404) {
      return message.reply(
        mode === "all"
          ? "❌ Belum ada data leaderboard server."
          : "❌ Tidak ada sesi absensi aktif.",
      );
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
        return handleCekAbsen(message, client);

      case "mystreak":
        return handleMyStreak(message);

      case "allstreak":
        return handleAllStreak(message, client, args);

      case "absen":
      default:
        return handleUserAbsen(message);
    }
  },
};
