const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const { EmbedBuilder, ChannelType } = require("discord.js");
const yts = require("yt-search");
const axios = require("axios");
const config = require("../../config");
const fs = require("fs");
const tmp = require("tmp");
const { createReadStream } = require("fs");

const queueMap = new Map();
const autoLeaveTimers = new Map();

async function fetchYouTubeInfo(input) {
  if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(input)) {
    let id = null;
    try {
      id = yts.getId(input);
    } catch (e) {}
    if (id) {
      const res = await yts({ videoId: id });
      if (res && res.title) {
        return {
          url: input,
          title: res.title,
          duration: res.duration.timestamp || "-",
          thumbnail: res.thumbnail || "",
        };
      }
    }
    const res = await yts(input);
    const vid = res.videos && res.videos.length > 0 ? res.videos[0] : null;
    if (vid) {
      return {
        url: vid.url,
        title: vid.title,
        duration: vid.duration.timestamp || "-",
        thumbnail: vid.thumbnail || "",
      };
    }
    throw new Error("Video tidak ditemukan (link).");
  } else {
    const res = await yts(input);
    const vid = res.videos && res.videos.length > 0 ? res.videos[0] : null;
    if (vid) {
      return {
        url: vid.url,
        title: vid.title,
        duration: vid.duration.timestamp || "-",
        thumbnail: vid.thumbnail || "",
      };
    }
    throw new Error("Video tidak ditemukan (judul).");
  }
}

async function getAudioUrlFromAPI(youtubeUrl) {
  const endpoint = `https://api.betabotz.eu.org/api/download/yt?url=${encodeURIComponent(
    youtubeUrl
  )}&apikey=${config.apikey_lann}`;
  try {
    const { data } = await axios.get(endpoint, { timeout: 20000 });
    if (data && data.result && data.result.mp3) return data.result.mp3;
    throw new Error(data.message || "API gagal mengambil audio.");
  } catch (e) {
    throw new Error("API error: " + (e.response?.data?.message || e.message));
  }
}

// Perbaikan: Hapus file sementara setelah digunakan
async function streamFromUrl(url) {
  const tmpFile = tmp.fileSync({ postfix: ".mp3" });
  const writer = fs.createWriteStream(tmpFile.name);
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 10 * 60 * 1000,
  });
  await new Promise((resolve, reject) => {
    res.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
  const stream = createReadStream(tmpFile.name);
  // Tambahkan cleanup setelah stream selesai
  stream.on("end", () => {
    try {
      fs.unlinkSync(tmpFile.name); // Hapus file setelah selesai
      console.log(`[MUSIC] Temporary file ${tmpFile.name} deleted`);
    } catch (e) {
      console.error(`[MUSIC] Failed to delete temp file: ${e.message}`);
    }
  });
  return stream;
}

function buildTrackAddedEmbed(
  track,
  queueLen,
  user,
  estimated = null,
  posUpcoming = null
) {
  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle("🎶 Lagu Ditambahkan ke Antrian")
    .addFields(
      {
        name: "Judul Lagu",
        value: `[${track.title}](${track.url})`,
        inline: false,
      },
      { name: "Estimasi Diputar", value: estimated || "-", inline: true },
      { name: "Durasi", value: track.duration || "-", inline: true },
      { name: "Urutan Permintaan", value: posUpcoming || "-", inline: true },
      { name: "Total Antrian", value: String(queueLen), inline: true }
    )
    .setFooter({
      text: `Diminta oleh ${user.username}`,
      iconURL: user.displayAvatarURL?.() || undefined,
    });
  if (track.thumbnail && /^https?:\/\//i.test(track.thumbnail)) {
    embed.setThumbnail(track.thumbnail);
  }
  return embed;
}

function buildNowPlayingEmbed(track, user) {
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle("▶️ Sedang Diputar")
    .setDescription(`[${track.title}](${track.url})`)
    .addFields(
      { name: "Durasi", value: track.duration || "-", inline: true },
      { name: "Diminta oleh", value: `<@${user.id}>`, inline: true }
    )
    .setTimestamp();
  if (track.thumbnail && /^https?:\/\//i.test(track.thumbnail)) {
    embed.setThumbnail(track.thumbnail);
  }
  return embed;
}

function buildAutoLeaveEmbed() {
  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("⏳ Tidak Ada Antrian Musik")
    .setDescription(
      "Tidak ada lagu di antrian.\nBot akan keluar voice channel dalam **3 menit** jika tidak ada lagu yang ditambahkan."
    );
}

async function playNext(guildId, textChannel, clientUser) {
  const data = queueMap.get(guildId);
  if (!data || !data.queue.length) {
    // Set timer auto leave 3 menit
    if (!autoLeaveTimers.has(guildId)) {
      textChannel.send({ embeds: [buildAutoLeaveEmbed()] });
      const timer = setTimeout(() => {
        try {
          if (
            data &&
            data.connection &&
            data.connection.state.status !== VoiceConnectionStatus.Destroyed
          ) {
            data.player?.stop(true);
            data.connection?.destroy();
            textChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle("👋 Bot Keluar Voice Channel")
                  .setDescription(
                    "Bot keluar karena tidak ada lagu di antrian selama 3 menit."
                  ),
              ],
            });
            queueMap.delete(guildId);
            autoLeaveTimers.delete(guildId);
          }
        } catch (e) {
          console.error("[MUSIC] Error auto leave:", e);
        }
      }, 3 * 60 * 1000); // 3 menit
      autoLeaveTimers.set(guildId, timer);
    }
    return;
  } else {
    // Jika ada lagu baru, clear timer auto leave
    if (autoLeaveTimers.has(guildId)) {
      clearTimeout(autoLeaveTimers.get(guildId));
      autoLeaveTimers.delete(guildId);
    }
  }

  if (data.player.state.status === AudioPlayerStatus.Playing) return;

  const track = data.queue[0];
  let audioUrl = track.audioUrl;
  try {
    if (!audioUrl) throw new Error("Audio url kosong");
    const stream = await streamFromUrl(audioUrl);
    const resource = createAudioResource(stream, { inlineVolume: true });

    data.player.play(resource);
    data.textChannel.send({
      embeds: [buildNowPlayingEmbed(track, track.user)],
    });
    console.log(`[MUSIC] Now playing: ${track.title} @${track.url}`);
  } catch (e) {
    data.textChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("❌ Gagal Memutar Lagu")
          .setDescription(
            `Gagal play audio **${track.title}**: ${e.message || e}`
          ),
      ],
    });
    data.queue.shift();
    setImmediate(() => playNext(guildId, data.textChannel, clientUser));
  }
}

async function handlePlay(msg, client, args) {
  const voiceChannel = msg.member?.voice?.channel;
  if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("🔊 Masuk Voice Channel Dulu")
          .setDescription("Kamu harus join voice channel terlebih dahulu!"),
      ],
    });
  }
  if (!args.length)
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("❗ Format Salah")
          .setDescription("Format: `play <judul atau link youtube>`"),
      ],
    });

  let trackInfo;
  try {
    trackInfo = await fetchYouTubeInfo(args.join(" "));
  } catch (e) {
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("❌ Lagu Tidak Ditemukan")
          .setDescription("Lagu tidak ditemukan."),
      ],
    });
  }

  let audioUrl;
  try {
    audioUrl = await getAudioUrlFromAPI(trackInfo.url);
    if (!audioUrl) throw new Error("API tidak mengembalikan link mp3.");
  } catch (e) {
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("❌ Gagal Mengambil Audio")
          .setDescription("Gagal ambil audio dari API: " + e.message),
      ],
    });
  }

  const guildId = msg.guild.id;
  if (!queueMap.has(guildId)) {
    queueMap.set(guildId, {
      queue: [],
      player: null,
      connection: null,
      textChannel: msg.channel,
    });
  }
  const data = queueMap.get(guildId);

  if (
    !data.connection ||
    data.connection.state.status === VoiceConnectionStatus.Destroyed
  ) {
    try {
      if (!msg.guild.voiceAdapterCreator) {
        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ Tidak Bisa Join Voice")
              .setDescription(
                "voiceAdapterCreator tidak ditemukan. Pastikan bot diundang dengan permission yang benar."
              ),
          ],
        });
      }
      data.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: msg.guild.voiceAdapterCreator,
        selfDeaf: true,
      });
      data.player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
      });
      data.connection.subscribe(data.player);
      data.textChannel = msg.channel;

      data.player.on(AudioPlayerStatus.Idle, async () => {
        data.queue.shift();
        await playNext(guildId, data.textChannel, client.user);
      });
      data.player.on("error", async (err) => {
        if (data.player.state.status !== AudioPlayerStatus.Idle) {
          data.player.stop(true);
        }
        data.queue.shift();
        await playNext(guildId, data.textChannel, client.user);
      });
    } catch (e) {
      console.error("Gagal join voice channel:", e);
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❌ Gagal Join Voice Channel")
            .setDescription(
              "Bot gagal join ke voice channel. " + (e.message || e)
            ),
        ],
      });
    }
  }

  const track = {
    ...trackInfo,
    audioUrl,
    user: msg.author,
  };
  data.queue.push(track);

  let est = "00:00";
  if (data.queue.length > 1) {
    let totalSec = 0;
    for (let i = 0; i < data.queue.length - 1; i++) {
      const d = data.queue[i].duration.split(":").reverse();
      let seconds = 0;
      if (d.length === 2) seconds = +d[1] * 60 + +d[0];
      else if (d.length === 3) seconds = +d[2] * 3600 + +d[1] * 60 + +d[0];
      totalSec += seconds;
    }
    const mm = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const ss = (totalSec % 60).toString().padStart(2, "0");
    est = `${mm}:${ss}`;
  }

  let posUpcoming =
    data.queue.length > 1 ? data.queue.length.toString() : "Next";

  msg.channel.send({
    embeds: [
      buildTrackAddedEmbed(
        track,
        data.queue.length,
        msg.author,
        est,
        posUpcoming
      ),
    ],
  });
  console.log(`[MUSIC] Added to queue: ${track.title}`);

  if (data.queue.length === 1) {
    await playNext(guildId, data.textChannel, client.user);
  }
}

async function handleSkip(msg) {
  const guildId = msg.guild.id;
  const data = queueMap.get(guildId);
  if (!data || !data.player)
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("⏭️ Tidak Ada Lagu")
          .setDescription("Tidak ada lagu yang sedang diputar."),
      ],
    });
  data.player.stop(true);
  msg.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("⏭️ Lagu Diskip")
        .setDescription("Lagu saat ini telah diskip."),
    ],
  });
}

async function handleStop(msg) {
  const guildId = msg.guild.id;
  const data = queueMap.get(guildId);
  if (!data)
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("🛑 Tidak Ada Antrian")
          .setDescription("Tidak ada lagu/antrian."),
      ],
    });
  data.queue = [];
  data.player?.stop(true);
  data.connection?.destroy();
  queueMap.delete(guildId);
  if (autoLeaveTimers.has(guildId)) {
    clearTimeout(autoLeaveTimers.get(guildId));
    autoLeaveTimers.delete(guildId);
  }
  msg.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("🛑 Antrian Dihentikan")
        .setDescription("Antrian dibersihkan dan bot keluar voice channel."),
    ],
  });
}

async function handlePause(msg) {
  const guildId = msg.guild.id;
  const data = queueMap.get(guildId);
  if (!data || !data.player)
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("⏸️ Tidak Ada Lagu")
          .setDescription("Tidak ada lagu yang sedang diputar."),
      ],
    });
  data.player.pause();
  msg.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("⏸️ Playback Dijeda")
        .setDescription("Lagu dijeda."),
    ],
  });
}

async function handleResume(msg) {
  const guildId = msg.guild.id;
  const data = queueMap.get(guildId);
  if (!data || !data.player)
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("▶️ Tidak Ada Lagu")
          .setDescription("Tidak ada lagu yang sedang dijeda."),
      ],
    });
  data.player.unpause();
  msg.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("▶️ Playback Dilanjutkan")
        .setDescription("Lagu dilanjutkan."),
    ],
  });
}

async function handleQueue(msg) {
  const guildId = msg.guild.id;
  const data = queueMap.get(guildId);
  if (!data || !data.queue.length)
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("📜 Antrian Kosong")
          .setDescription("Belum ada lagu di antrian."),
      ],
    });
  const queueList = data.queue
    .map(
      (t, i) =>
        `${i === 0 ? "▶️ **Sedang Diputar:**" : `\`${i}\` •`} [${t.title}](${
          t.url
        }) (${t.duration}) - <@${t.user.id}>`
    )
    .join("\n");
  msg.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x00bfff)
        .setTitle("📜 Daftar Antrian Musik")
        .setDescription(queueList),
    ],
  });
}

const availableCommands = {
  play: handlePlay,
  skip: handleSkip,
  stop: handleStop,
  pause: handlePause,
  resume: handleResume,
  queue: handleQueue,
};

module.exports = {
  prefix: "play",
  aliases: ["music", "musik"],
  category: "feature",
  execute: async (msg, args, client) => {
    await handlePlay(msg, client, args);
  },
  handleMessage: async (msg, client) => {
    // Bisa dikosongkan jika tidak perlu
  },
  commands: {
    skip: handleSkip,
    stop: handleStop,
    pause: handlePause,
    resume: handleResume,
    queue: handleQueue,
    quit: handleQuit,
  },
};

async function handleQuit(msg) {
  const guildId = msg.guild.id;
  const data = queueMap.get(guildId);
  if (!data)
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("🛑 Tidak Ada Antrian")
          .setDescription("Bot tidak sedang di voice channel."),
      ],
    });
  data.queue = [];
  data.player?.stop(true);
  data.connection?.destroy();
  queueMap.delete(guildId);
  if (autoLeaveTimers.has(guildId)) {
    clearTimeout(autoLeaveTimers.get(guildId));
    autoLeaveTimers.delete(guildId);
  }
  msg.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("👋 Bot Keluar Voice Channel")
        .setDescription("Bot keluar dari voice channel sesuai perintah."),
    ],
  });
}