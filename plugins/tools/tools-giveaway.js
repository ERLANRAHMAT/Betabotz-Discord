const { EmbedBuilder } = require('discord.js');

const giveawayState = new Map(); // key: channelId, value: { participants: Set, info: string, startedAt: Date }

function formatDate(date) {
  return date.toLocaleDateString('id', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

module.exports = {
  prefix: "giveaway",
  category: "tools",
  aliases: ["mulaigiveaway", "startgiveaway", "ikutgiveaway", "cekgiveaway", "rollgiveaway", "hapusgiveaway", "deletegiveaway"],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    // !giveaway start <info>
    const subcmd = args[0]?.toLowerCase();
    const channelId = message.channel.id;

    // Start giveaway
    if (["start", "mulai", "mulaigiveaway", "startgiveaway"].includes(subcmd)) {
      const info = args.slice(1).join(" ");
      if (!info) return message.reply("Contoh: `!giveaway start Hadiah pulsa 10k`");
      if (giveawayState.has(channelId)) return message.reply("Masih ada giveaway yang berjalan di channel ini!");
      giveawayState.set(channelId, {
        participants: new Set(),
        info,
        startedAt: new Date()
      });
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("🎁 GIVEAWAY DIMULAI!")
        .setDescription(`Klik \`!giveaway ikut\` untuk ikut giveaway!\n\n${info}`)
        .setFooter({ text: `Tanggal: ${formatDate(new Date())}` });
      await message.reply({ embeds: [embed] });
      return;
    }

    // Ikut giveaway
    if (["ikut", "ikutgiveaway"].includes(subcmd)) {
      if (!giveawayState.has(channelId)) return message.reply("Tidak ada giveaway yang sedang berlangsung di channel ini.\nGunakan `!giveaway start <info>` untuk memulai.");
      const state = giveawayState.get(channelId);
      if (state.participants.has(message.author.id)) return message.reply("Kamu sudah ikut!");
      state.participants.add(message.author.id);
      await message.reply(`✅ Kamu berhasil ikut giveaway!\nTotal peserta: **${state.participants.size}**`);
      return;
    }

    // Cek peserta
    if (["cek", "cekgiveaway"].includes(subcmd)) {
      if (!giveawayState.has(channelId)) return message.reply("Tidak ada giveaway yang sedang berlangsung di channel ini.");
      const state = giveawayState.get(channelId);
      const list = Array.from(state.participants).map((id, i) => `${i + 1}. <@${id}>`).join('\n') || "-";
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Daftar Peserta Giveaway")
        .setDescription(`Tanggal: ${formatDate(state.startedAt)}\n\n${state.info}`)
        .addFields({ name: "Peserta", value: list });
      await message.reply({ embeds: [embed] });
      return;
    }

    // Roll pemenang
    if (["roll", "rollgiveaway", "rolling", "rollinggiveaway"].includes(subcmd)) {
      if (!giveawayState.has(channelId)) return message.reply("Tidak ada giveaway yang sedang berlangsung di channel ini.");
      const state = giveawayState.get(channelId);
      if (!state.participants.size) return message.reply("Belum ada peserta yang ikut giveaway.");
      const peserta = Array.from(state.participants);
      const winnerId = peserta[Math.floor(Math.random() * peserta.length)];
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("🎊 CONGRATULATIONS 🎉")
        .setDescription(`<@${winnerId}> adalah pemenang giveaway!\n\n${state.info}`)
        .setFooter({ text: `Tanggal: ${formatDate(state.startedAt)}` });
      await message.reply({ embeds: [embed], allowedMentions: { users: [winnerId] } });
      return;
    }

    // Hapus giveaway
    if (["hapus", "delete", "hapusgiveaway", "deletegiveaway"].includes(subcmd)) {
      if (!giveawayState.has(channelId)) return message.reply("Tidak ada giveaway yang sedang berlangsung di channel ini.");
      giveawayState.delete(channelId);
      await message.reply("Giveaway telah dihapus.");
      return;
    }

    // Help
    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle("Panduan Giveaway")
      .setDescription(
        "**Perintah:**\n" +
        "`!giveaway start <info>` — Mulai giveaway\n" +
        "`!giveaway ikut` — Ikut giveaway\n" +
        "`!giveaway cek` — Lihat peserta\n" +
        "`!giveaway roll` — Pilih pemenang\n" +
        "`!giveaway hapus` — Hapus giveaway"
      );
    await message.reply({ embeds: [embed] });
  }
};
