const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// Map untuk menyimpan sesi absensi yang aktif, kuncinya adalah channelId
const attendanceSessions = new Map();

/**
 * Fungsi untuk memeriksa apakah pengguna adalah admin
 * @param {import('discord.js').Message} message
 * @returns {boolean}
 */
function isAdmin(member) {
    return member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

// --- Handler untuk setiap Sub-Perintah ---

/**
 * Handler untuk memulai sesi absensi (!mulaiabsen)
 * @param {import('discord.js').Message} message
 * @param {string[]} args
 */
async function handleStartAbsen(message, args, client) {
    if (!isAdmin(message.member)) {
        return message.reply("❌ Perintah ini hanya untuk admin.");
    }

    const channelId = message.channel.id;
    if (attendanceSessions.has(channelId)) {
        return message.reply("❗ Sesi absensi sudah berjalan di channel ini. Gunakan `!hapusabsen` untuk menghentikannya terlebih dahulu.");
    }

    const reason = args.join(" ") || "Absensi Umum";
    
    // Memulai sesi baru
    attendanceSessions.set(channelId, {
        reason: reason,
        // Menggunakan Map untuk menyimpan peserta agar tidak ada duplikasi
        attendees: new Map(),
        startTime: new Date()
    });

    const startEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("✅ Sesi Absensi Dimulai!")
        .setDescription(`**Alasan:** ${reason}`)
        .addFields({ name: "Cara Absen", value: "Ketik `!absen` di channel ini untuk mencatatkan kehadiranmu." })
        .setFooter({ text: `Dimulai oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

    await message.channel.send({ embeds: [startEmbed] });
}

/**
 * Handler untuk mengecek daftar absensi (!cekabsen)
 * @param {import('discord.js').Message} message
 */
async function handleCekAbsen(message, args, client) {
    const channelId = message.channel.id;
    const session = attendanceSessions.get(channelId);

    if (!session) {
        return message.reply("❌ Tidak ada sesi absensi yang sedang berjalan di channel ini. Gunakan `!startabsen` untuk memulai sesi baru.");
    }

    const { reason, attendees, startTime } = session;

    let attendeeList = "Belum ada yang absen.";
    if (attendees.size > 0) {
        attendeeList = Array.from(attendees.values())
            .map((att, index) => `${index + 1}. **${att.username}** - (Absen pada: ${att.timestamp.toLocaleTimeString('id-ID')})`)
            .join('\n');
    }

    const checkEmbed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(` Daftar Kehadiran: ${reason}`)
        .setDescription(attendeeList)
        .addFields({ name: "Total Hadir", value: `${attendees.size} orang` })
        .setFooter({ text: `Sesi dimulai pada` })
        .setTimestamp(startTime);

    await message.reply({ embeds: [checkEmbed] });
}

/**
 * Handler untuk menghapus/menghentikan sesi absensi (!hapusabsen)
 * @param {import('discord.js').Message} message
 */
async function handleHapusAbsen(message, args, client) {
    if (!isAdmin(message.member)) {
        return message.reply("❌ Perintah ini hanya untuk admin.");
    }

    const channelId = message.channel.id;
    const session = attendanceSessions.get(channelId);

    if (!session) {
        return message.reply("❌ Tidak ada sesi absensi yang bisa dihapus.");
    }

    // Hapus sesi
    attendanceSessions.delete(channelId);

    const stopEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("🚫 Sesi Absensi Dihentikan")
        .setDescription("Sesi absensi di channel ini telah ditutup oleh admin.")
        .setFooter({ text: `Dihentikan oleh: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
        
    await message.reply({ embeds: [stopEmbed] });
}


// --- Export Modul ---

module.exports = {
  // Perintah utama untuk PENGGUNA melakukan absen
  prefix: "absen",
  category: "tools",
  
  /**
   * Fungsi ini akan dieksekusi saat pengguna mengetik `!absen`
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const channelId = message.channel.id;
    const session = attendanceSessions.get(channelId);

    if (!session) {
        return message.reply("❌  Tidak ada sesi absensi yang sedang berjalan di channel ini. Gunakan `!startabsen` untuk memulai sesi baru.");
    }

    const userId = message.author.id;
    if (session.attendees.has(userId)) {
        return message.reply("❗ Anda sudah tercatat dalam absensi ini.").then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
    }

    // Catat kehadiran pengguna
    session.attendees.set(userId, {
        username: message.author.username,
        timestamp: new Date()
    });

    await message.reply(`✅ Kehadiran **${message.author.username}** berhasil dicatat!`).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 7000); // Hapus pesan konfirmasi setelah 7 detik
    });
    // Hapus juga pesan !absen dari pengguna
    if (message.deletable) {
        message.delete().catch(() => {});
    }
  },

  // Sub-perintah untuk ADMIN mengelola absensi
  subCommands: {
    mulaiabsen: {
      handler: handleStartAbsen,
      aliases: ["startabsen"],
    },
    cekabsen: {
      handler: handleCekAbsen,
      aliases: ["checkabsen", "listabsen"],
    },
    hapusabsen: {
      handler: handleHapusAbsen,
      aliases: ["stopabsen", "endabsen"],
    },
  },
};