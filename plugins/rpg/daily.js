const { EmbedBuilder } = require("discord.js");
const api = require("../../api_handler.js");

// --- Konfigurasi Hadiah (DISAMAKAN DENGAN BACKEND BARY UPDATE! ) ---
const dailyReward = 10000;
const dailyExp = 200;
const dailyDiamond = 1;
const cooldown = 86400000;
// ---

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  let timeString = "";
  if (hours > 0) timeString += `${hours} Jam `;
  if (minutes > 0) timeString += `${minutes} Menit `;
  if (seconds > 0) timeString += `${seconds} Detik`;

  return timeString.trim();
}

module.exports = {
  prefix: "daily",
  category: "rpg",
  aliases: ["claim"],

  async execute(message, args, client) {
    const userId = message.author.id;
    const username = message.author.username;

    try {
      // 1. Ambil data user terbaru dari Backend Go
      const userData = await api.getUser(userId, username);

      // Pastikan properti lastDaily ada (handle jika user baru)
      const lastClaim = userData.lastDaily || 0;
      const currentTime = Date.now();

      // 2. Cek Cooldown (Frontend Check)
      if (currentTime - lastClaim < cooldown) {
        const remainingTime = cooldown - (currentTime - lastClaim);
        return message.reply(
          `🎁 Anda sudah mengambil hadiah harian.\nSilakan kembali lagi dalam **${msToTime(remainingTime)}**.`,
        );
      }

      // 3. Update Data (PERBAIKAN DISINI)

      // Update Money
      userData.money = (userData.money || 0) + dailyReward;

      // Update Diamond (PINDAHKAN KE ROOT, BUKAN RPG)
      userData.diamond = (userData.diamond || 0) + dailyDiamond;

      // Update Exp (Exp biasanya ada di dalam RPG, ini sudah benar jika struct kamu begitu)
      if (!userData.rpg) userData.rpg = {};
      userData.rpg.exp = (userData.rpg.exp || 0) + dailyExp;

      // Update Waktu
      userData.lastDaily = currentTime;

      // 4. Kirim data yang sudah dihitung Frontend ke Backend
      // (Catatan: Ini akan menimpa logic di Go, tapi setidaknya angkanya sekarang benar)
      await api.updateUser(userId, userData);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("🎉 Hadiah Harian Berhasil Diklaim!")
        .setAuthor({
          name: message.author.username,
          iconURL: message.author.displayAvatarURL(),
        })
        .addFields({
          name: "Hadiah Diterima",
          value: `💰 **+${dailyReward.toLocaleString("id-ID")}** Money\n✨ **+${dailyExp.toLocaleString("id-ID")}** Exp \n💎 **+${dailyDiamond.toLocaleString("id-ID")}** Diamond`,
        })
        .setFooter({ text: "Kembali lagi besok!" })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("[DAILY CMD ERROR]", error);
      message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};
