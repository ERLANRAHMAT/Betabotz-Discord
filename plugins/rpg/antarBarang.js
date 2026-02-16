const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

const COOLDOWN_ANTAR_BARANG = 15 * 60 * 1000; // 15 menit

module.exports = {
  prefix: "antarbarang",
  category: "rpg",
  aliases: [],
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const targetUser = message.mentions.users.first();
    const barang = args.slice(1).join(' ') || 'Barang tidak disebutkan';
     const userData = await api.getUser(authorId, authorUsername);
     if (userData.job?.toLowerCase().replace(/ /g, "") !== "kurir") {
       return message.reply(
         "Kamu harus bekerja sebagai Kurir untuk menggunakan perintah ini.",
       );
     }
    if (!targetUser) return message.reply('Tag user yang ingin kamu antar barangnya! Contoh: `!antarbarang @user <barang>`');
    if (targetUser.id === authorId) return message.reply('Kamu tidak bisa mengantar barang ke diri sendiri.');

    const motor = userData.motor;
    if (!motor || !motor.status || typeof motor.motorGrade !== "string") {
      return message.reply("Kamu harus punya motor aktif untuk antar barang! Beli di `!motor buy <grade>`.");
    }
    let MOTOR_GRADES;
    try {
      MOTOR_GRADES = require('./rpg-motor.js').MOTOR_GRADES;
    } catch (e) {
      return message.reply("Terjadi error internal pada data motor.");
    }
    const gradeData = MOTOR_GRADES && MOTOR_GRADES[motor.motorGrade];
    if (!gradeData) {
      return message.reply("Data motor tidak valid. Silakan jual motor lama dan beli ulang.");
    }
    if (typeof motor.Bensin !== "number" || motor.Bensin < 10) return message.reply("Bensin motor habis! Isi dulu dengan `!motor bensin <jumlah>`.");
    if (typeof motor.Durability !== "number" || motor.Durability < 5) return message.reply("Durability motor terlalu rendah! Repair dulu dengan `!motor repair <jumlah>`.");

    motor.Bensin -= 10;
    motor.Durability -= 5;
    userData.motor = motor;
    await api.updateUser(authorId, userData);

    const lastAntarBarang = userData.lastAntarBarang || 0;
    if (Date.now() - lastAntarBarang < COOLDOWN_ANTAR_BARANG) {
      const sisa = COOLDOWN_ANTAR_BARANG - (Date.now() - lastAntarBarang);
      const menit = Math.floor(sisa / 60000);
      const detik = Math.floor((sisa % 60000) / 1000);
      return message.reply(`Kamu baru saja mengantar barang. Tunggu **${menit}m ${detik}s** lagi untuk antar berikutnya.`);
    }

    const kejadianList = [
      "📦 Barang sempat jatuh, untung tidak rusak...",
      "🚦 Terjebak macet saat mengantar barang...",
      "🛣️ Jalanan lancar, barang sampai dengan selamat...",
      "⛈️ Hujan deras, barang sedikit basah...",
      "🚧 Ada perbaikan jalan, harus memutar arah...",
      "📱 Penerima susah dihubungi, menunggu lama...",
      "🏠 Barang diterima langsung oleh penerima.",
      "🕒 Barang sampai tepat waktu!"
    ];
    const kejadian = kejadianList[Math.floor(Math.random() * kejadianList.length)];

    const animasiMsg = await message.reply('📦 Sedang mengantar barang...');
    await new Promise(r => setTimeout(r, 1500));
    await animasiMsg.edit('📦 Barang dalam perjalanan...');
    await new Promise(r => setTimeout(r, 1200));
    await animasiMsg.edit(kejadian);
    await new Promise(r => setTimeout(r, 1500));

    const tipChance = Math.random();
    let tip = 0;
    let tipMsg = "Kamu tidak mendapat tip kali ini.";
    if (tipChance > 0.85) {
      tip = Math.floor(Math.random() * 9000) + 2000; 
      tipMsg = `Penerima sangat puas! Kamu mendapat tip besar **Rp${tip.toLocaleString('id-ID')}**!`;
    } else if (tipChance > 0.5) {
      tip = Math.floor(Math.random() * 2000) + 500; 
      tipMsg = `Penerima memberi tip **Rp${tip.toLocaleString('id-ID')}**.`;
    }

    if (tip > 0) {
      userData.money = (userData.money || 0) + tip;
    }
    userData.lastAntarBarang = Date.now();
    await api.updateUser(authorId, userData);

    const embed = new EmbedBuilder()
      .setColor(0x00B894)
      .setTitle("📦 Antar Barang Selesai!")
      .setDescription(
        `Kamu telah mengantar barang ke **${targetUser.username}**: **${barang}**\n\n${kejadian}\n\n💸 ${tipMsg}`
      );
    await animasiMsg.edit({ content: null, embeds: [embed] });
  }
};
