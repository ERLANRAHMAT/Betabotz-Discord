const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  entersState
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

// --- Fungsi Pengambilan Data (fetchYouTubeInfo, fetchSpotifyInfo, fetchSoundCloudInfo) ---
async function fetchYouTubeInfo(input) {
  if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(input)) {
    let id = null;
    try { id = yts.getId(input); } catch (e) { /* Lanjutkan */ }
    if (id) {
      const res = await yts({ videoId: id });
      if (res) return { source: 'youtube', url: res.url, title: res.title, duration: res.duration.timestamp || "-", thumbnail: res.thumbnail || "" };
    }
  }
  const res = await yts(input);
  const vid = res.videos?.[0];
  if (vid) return { source: 'youtube', url: vid.url, title: vid.title, duration: vid.duration.timestamp || "-", thumbnail: vid.thumbnail || "" };
  throw new Error("Video YouTube tidak ditemukan.");
}

async function fetchSpotifyInfo(spotifyUrl) {
    const endpoint = `https://api.betabotz.eu.org/api/download/spotify?url=${encodeURIComponent(spotifyUrl)}&apikey=${config.apikey_lann}`;
    try {
        const { data } = await axios.get(endpoint, { timeout: 20000 });
        const trackData = data?.result?.data;
        if (trackData) return { source: 'spotify', url: spotifyUrl, title: trackData.title || 'Unknown', artist: trackData.artist?.name || 'Unknown', duration: trackData.duration || '-', thumbnail: trackData.thumbnail || '', audioUrl: trackData.url };
        throw new Error(data.message || "API Spotify gagal mengambil data.");
    } catch (e) {
        throw new Error("API Spotify error: " + (e.response?.data?.message || e.message || e));
    }
}

async function fetchSoundCloudInfo(soundcloudUrl) {
    const endpoint = `https://api.betabotz.eu.org/api/download/soundcloud?url=${encodeURIComponent(soundcloudUrl)}&apikey=${config.apikey_lann}`;
    try {
        const { data } = await axios.get(endpoint, { timeout: 20000 });
        const trackData = data?.result;
        if (trackData) return { source: 'soundcloud', url: soundcloudUrl, title: trackData.title || 'Unknown', duration: 'N/A', thumbnail: trackData.thumbnail || '', audioUrl: trackData.url };
        throw new Error(data.message || "API SoundCloud gagal mengambil data.");
    } catch (e) {
        throw new Error("API SoundCloud error: " + (e.response?.data?.message || e.message || e));
    }
}

async function getAudioUrlFromAPI(youtubeUrl) {
  const endpoint = `https://api.betabotz.eu.org/api/download/yt?url=${encodeURIComponent(youtubeUrl)}&apikey=${config.apikey_lann}`;
  try {
    const { data } = await axios.get(endpoint, { timeout: 20000 });
    if (data?.result?.mp3) return data.result.mp3;
    throw new Error(data.message || "API gagal mengambil audio.");
  } catch (e) {
    throw new Error("API error: " + (e.response?.data?.message || e.message));
  }
}

// --- Fungsi Utilitas & Player ---
async function streamFromUrl(url) {
  const tmpFile = tmp.fileSync({ postfix: ".mp3" });
  const writer = fs.createWriteStream(tmpFile.name);
  try {
    const res = await axios.get(url, { responseType: "stream", timeout: 10 * 60 * 1000 });
    await new Promise((resolve, reject) => {
      res.data.pipe(writer).on("finish", resolve).on("error", reject);
    });
    const stream = createReadStream(tmpFile.name);
    stream.on("close", () => {
      try { fs.unlinkSync(tmpFile.name); } catch (e) { /* abaikan */ }
    });
    return stream;
  } catch (e) {
    try { fs.unlinkSync(tmpFile.name); } catch (unlinkErr) { /* abaikan */ }
    throw new Error(`Gagal mengunduh audio: ${e.message || e}`);
  }
}

function buildAutoLeaveEmbed() {
  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("⏳ Antrian Kosong")
    .setDescription("Bot akan keluar dari voice channel dalam **3 menit** jika tidak ada lagu baru yang ditambahkan.");
}

/**
 * [DIPERBARUI] Fungsi inti untuk memainkan lagu berikutnya.
 * Sekarang fungsi ini juga bertanggung jawab mengirim notifikasi "Sedang Diputar".
 */
async function playNext(guildId, textChannel) {
    const data = queueMap.get(guildId);
    if (autoLeaveTimers.has(guildId)) {
        clearTimeout(autoLeaveTimers.get(guildId));
        autoLeaveTimers.delete(guildId);
    }
    if (!data || !data.queue.length) {
        textChannel.send({ embeds: [buildAutoLeaveEmbed()] });
        const timer = setTimeout(() => {
            const currentData = queueMap.get(guildId);
            if (currentData?.connection?.state.status !== 'destroyed') {
                currentData.connection.destroy();
                queueMap.delete(guildId);
            }
        }, 3 * 60 * 1000);
        autoLeaveTimers.set(guildId, timer);
        return;
    }

    const track = data.queue[0];
    try {
        const stream = await streamFromUrl(track.audioUrl);
        const resource = createAudioResource(stream, { inlineVolume: true });
        data.player.play(resource);

        // ==================== PERUBAHAN DI SINI ====================
        // Mengirim notifikasi "Sedang Diputar" setiap kali lagu baru dimulai.
        const nowPlayingEmbed = new EmbedBuilder()
            .setColor(0x7289DA)
            .setTitle("▶️ Sedang Diputar")
            .setDescription(`[${track.title}](${track.url})`)
            .setThumbnail(track.thumbnail)
            .setFooter({ text: `Diminta oleh: ${track.user.username}`, iconURL: track.user.displayAvatarURL() })
            .setTimestamp();

        await textChannel.send({ embeds: [nowPlayingEmbed] });
        // ==================== AKHIR PERUBAHAN ====================

    } catch (e) {
        textChannel.send({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Memutar").setDescription(`Gagal memutar **${track.title}**: ${e.message}.`)] });
        data.queue.shift();
        setImmediate(() => playNext(guildId, data.textChannel));
    }
}

// --- Handler untuk Perintah ---

/**
 * [DIPERBARUI] Handler untuk !play.
 * Logika notifikasi "Now Playing" untuk lagu pertama dipindahkan ke playNext.
 */
async function handlePlay(msg, client, args) {
  const voiceChannel = msg.member?.voice?.channel;
  if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
    return msg.reply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("🔊 Masuk Voice Channel Dulu").setDescription("Kamu harus bergabung dengan voice channel terlebih dahulu!")] });
  }

  if (!args.length) {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x7289DA)
      .setTitle("🎵 Panduan Perintah Musik")
      .setDescription("Berikut adalah perintah yang tersedia untuk fitur musik:\n\n" + "**▶️ Memutar Lagu**\n`!play <judul lagu / link>`\nBot mendukung link dari YouTube, Spotify, dan SoundCloud.\n\n" + "**⏯️ Kontrol Pemutaran**\n• `!skip` - Melewatkan lagu yang sedang diputar.\n• `!stop` - Menghentikan musik dan membersihkan antrian.\n• `!pause` - Menjeda lagu.\n• `!resume` - Melanjutkan lagi yang dijeda.\n\n" + "**📜 Informasi Antrian**\n• `!queue` - Menampilkan daftar lagu di antrian.\n*(Alias: `!q`, `!list`, `!playlist`, `!np`)*")
      .setFooter({ text: "Gunakan perintah di atas sesuai kebutuhan Anda." });
    return msg.reply({ embeds: [helpEmbed] });
  }

  const input = args.join(" ");
  const loadingMsg = await msg.channel.send({ embeds: [new EmbedBuilder().setColor(0x3498db).setDescription("🔍 Mencari lagu, mohon tunggu...")] });

  let trackInfo, audioUrl;
  try {
    if (/spotify\.com/i.test(input)) { trackInfo = await fetchSpotifyInfo(input); audioUrl = trackInfo.audioUrl; } 
    else if (/soundcloud\.com/i.test(input)) { trackInfo = await fetchSoundCloudInfo(input); audioUrl = trackInfo.audioUrl; } 
    else { trackInfo = await fetchYouTubeInfo(input); audioUrl = await getAudioUrlFromAPI(trackInfo.url); }
    if (!audioUrl) throw new Error("Tidak dapat menemukan URL audio yang bisa diputar.");
  } catch (e) {
    return loadingMsg.edit({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Memproses Lagu").setDescription(`${e.message || e}`)] });
  } finally {
      if (loadingMsg.editable) await loadingMsg.delete().catch(() => {});
  }

  const guildId = msg.guild.id;
  if (!queueMap.has(guildId)) {
    try {
        const connection = joinVoiceChannel({ channelId: voiceChannel.id, guildId, adapterCreator: msg.guild.voiceAdapterCreator, selfDeaf: true });
        const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
        connection.subscribe(player);
        const data = { queue: [], player, connection, textChannel: msg.channel };
        queueMap.set(guildId, data);
        player.on(AudioPlayerStatus.Idle, () => { data.queue.shift(); playNext(guildId, data.textChannel); });
        player.on("error", (err) => { console.error(`[MUSIC] Player Error:`, err); data.textChannel.send({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("⚠️ Kesalahan Playback").setDescription(err.message)] }); });
        connection.on(VoiceConnectionStatus.Disconnected, async () => { try { await Promise.race([ entersState(connection, VoiceConnectionStatus.Signalling, 5_000), entersState(connection, VoiceConnectionStatus.Connecting, 5_000) ]); } catch (error) { if (connection.state.status !== 'destroyed') connection.destroy(); queueMap.delete(guildId); } });
    } catch (e) {
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Bergabung").setDescription("Pastikan bot memiliki izin `Connect` dan `Speak`.")] });
    }
  }

  const data = queueMap.get(guildId);
  const track = { ...trackInfo, audioUrl, user: msg.author };
  const wasQueueEmpty = data.queue.length === 0;
  data.queue.push(track);
  
  if (wasQueueEmpty) {
      await playNext(guildId, data.textChannel);
  } else {
      await msg.channel.send({ embeds: [new EmbedBuilder().setColor(0x1abc9c).setTitle("🎶 Lagu Ditambahkan").setDescription(`[${track.title}](${track.url})`).addFields({ name: "Posisi di antrian", value: `${data.queue.length - 1}` }).setThumbnail(track.thumbnail)] });
  }
}

// Handler untuk !skip, !stop, dll. tetap sama...
async function handleSkip(msg) {
    const data = queueMap.get(msg.guild.id);
    if (!data || data.queue.length === 0) {
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("⏭️ Tidak Ada Lagu").setDescription("Tidak ada lagu di antrian untuk dilewati.")] });
    }
    const isLastSong = data.queue.length === 1;
    let replyMessage = "Lagu saat ini telah diskip.";
    if (isLastSong) {
        replyMessage = "Lagu terakhir telah diskip. Antrian sekarang kosong.";
    }
    data.player.stop(true);
    msg.channel.send({ embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle("⏭️ Lagu Diskip").setDescription(replyMessage)] });
}

async function handleQueue(msg) {
    const data = queueMap.get(msg.guild.id);
    if (!data || data.queue.length === 0) {
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("📜 Antrian Kosong").setDescription("Tidak ada musik yang sedang diputar atau diantrekan.")] });
    }
    const currentTrack = data.queue[0];
    const upcomingTracks = data.queue.slice(1);
    const embed = new EmbedBuilder().setColor(0x00bfff).setTitle(`📜 Daftar Antrian Musik (${data.queue.length} Lagu)`).setThumbnail(currentTrack.thumbnail).addFields({ name: "▶️ Sedang Diputar", value: `[${currentTrack.title}](${currentTrack.url})\n**Durasi:** \`${currentTrack.duration}\` | **Diminta oleh:** <@${currentTrack.user.id}>` });
    if (upcomingTracks.length > 0) {
        const queueString = upcomingTracks.slice(0, 10).map((t, i) => `\`${i + 1}.\` [${t.title}](${t.url}) | \`${t.duration}\``).join('\n');
        const footerString = upcomingTracks.length > 10 ? `\n...dan ${upcomingTracks.length - 10} lagu lainnya.` : '';
        embed.addFields({ name: "⬇️ Berikutnya di Antrian", value: queueString + footerString });
    } else {
        embed.addFields({ name: "⬇️ Berikutnya di Antrian", value: "Tidak ada lagu lain di antrian." });
    }
    msg.channel.send({ embeds: [embed] });
}

async function handleStop(msg) {
    const guildId = msg.guild.id;
    const data = queueMap.get(guildId);
    if (!data) return;
    data.queue = [];
    data.player?.stop(true);
    if (data.connection?.state.status !== 'destroyed') data.connection?.destroy();
    queueMap.delete(guildId);
if (autoLeaveTimers.has(guildId)) { clearTimeout(autoLeaveTimers.get(guildId)); autoLeaveTimers.delete(guildId); }
    msg.channel.send({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("🛑 Antrian Dihentikan").setDescription("Antrian dibersihkan dan bot keluar dari voice channel.")] });
}

async function handlePause(msg) {
    const data = queueMap.get(msg.guild.id);
    if (!data || data.player.state.status !== AudioPlayerStatus.Playing) return msg.reply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("⏸️ Tidak Ada Lagu").setDescription("Tidak ada lagu yang sedang diputar.")] });
    data.player.pause();
    msg.channel.send({ embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle("⏸️ Playback Dijeda")] });
}

async function handleResume(msg) {
    const data = queueMap.get(msg.guild.id);
    if (!data || data.player.state.status !== AudioPlayerStatus.Paused) return msg.reply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("▶️ Tidak Ada Lagu").setDescription("Tidak ada lagu yang sedang dijeda.")] });
    data.player.unpause();
    msg.channel.send({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("▶️ Playback Dilanjutkan")] });
}

module.exports = {
  prefix: "play",
  aliases: ["music", "musik"],
  category: "feature",
  execute: async (msg, args, client) => {
    await handlePlay(msg, client, args);
  },
  subCommands: {
    skip: { handler: handleSkip, aliases: [] },
    stop: { handler: handleStop, aliases: ["end", "quit", "leave"] },
    pause: { handler: handlePause, aliases: [] },
    resume: { handler: handleResume, aliases: ["continue"] },
    queue: { handler: handleQueue, aliases: ["q", "list", "playlist", "np", "nowplaying"] },
  },
};