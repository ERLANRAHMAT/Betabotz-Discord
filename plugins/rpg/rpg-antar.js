const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

const COOLDOWN_ANTAR = 15 * 60 * 1000; // 15 menit

module.exports = {
  prefix: "antar",
  category: "rpg",
  aliases: [],
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const targetUser = message.mentions.users.first();
    const tujuan = args.slice(1).join(' ') || 'Tujuan tidak disebutkan';

    if (!targetUser) return message.reply('Tag user yang ingin kamu antar! Contoh: `!antar @user <tujuan>`');
    if (targetUser.id === authorId) return message.reply('Kamu tidak bisa mengantar diri sendiri.');

    const userData = await api.getUser(authorId, authorUsername);
    if (userData.job?.toLowerCase().replace(/ /g,'') !== 'gojek') {
      return message.reply('Kamu harus bekerja sebagai Gojek untuk menggunakan perintah ini.');
    }

    const motor = userData.motor;
    if (!motor || !motor.status || typeof motor.motorGrade !== "string") {
      return message.reply("Kamu harus punya motor aktif untuk antar! Beli di `!motor buy <grade>`.");
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

    const lastAntar = userData.lastAntar || 0;
    if (Date.now() - lastAntar < COOLDOWN_ANTAR) {
      const sisa = COOLDOWN_ANTAR - (Date.now() - lastAntar);
      const menit = Math.floor(sisa / 60000);
      const detik = Math.floor((sisa % 60000) / 1000);
      return message.reply(`Kamu baru saja mengantar penumpang. Tunggu **${menit}m ${detik}s** lagi untuk antar berikutnya.`);
    }

    const kejadianList = [
      "🚦 Kamu terjebak macet di lampu merah...",
      "🌧️ Hujan deras, kamu harus berhenti sebentar...",
      "🛣️ Jalanan lancar, perjalanan mulus...",
      "🐕 Ada anjing menyeberang, kamu harus pelan-pelan...",
      "⛽ Kamu hampir kehabisan bensin, untung ada pom dekat sini...",
      "🚧 Ada perbaikan jalan, kamu harus memutar arah...",
      "🍔 Penumpang minta berhenti beli makanan sebentar...",
      "📱 Penumpang sibuk main HP selama perjalanan...",
      "🎶 Penumpang request lagu dangdut sepanjang jalan...",
      "😴 Penumpang ketiduran di boncenganmu..."
    ];
    const kejadian = kejadianList[Math.floor(Math.random() * kejadianList.length)];

    const animasiMsg = await message.reply('🛵 Sedang mengantar penumpang...');
    await new Promise(r => setTimeout(r, 1500));
    await animasiMsg.edit('🛵 Melaju di jalan...');
    await new Promise(r => setTimeout(r, 1200));
    await animasiMsg.edit(kejadian);
    await new Promise(r => setTimeout(r, 1500));

    const tipChance = Math.random();
    let tip = 0;
    let tipMsg = "Kamu tidak mendapat tip kali ini.";
    if (tipChance > 0.85) {
      tip = Math.floor(Math.random() * 9000) + 2000; 
      tipMsg = `Penumpang sangat puas! Kamu mendapat tip besar **Rp${tip.toLocaleString('id-ID')}**!`;
    } else if (tipChance > 0.5) {
      tip = Math.floor(Math.random() * 2000) + 500; 
      tipMsg = `Penumpang memberi tip **Rp${tip.toLocaleString('id-ID')}**.`;
    }

    if (tip > 0) {
      userData.money = (userData.money || 0) + tip;
    }
    userData.lastAntar = Date.now();
    await api.updateUser(authorId, userData);

    const embed = new EmbedBuilder()
      .setColor(0x00B894)
      .setTitle("🛵 Antar Order Selesai!")
      .setDescription(
        `Kamu telah mengantar **${targetUser.username}** ke tujuan: **${tujuan}**\n\n${kejadian}\n\n💸 ${tipMsg}`
      );
    await animasiMsg.edit({ content: null, embeds: [embed] });
  }
};
