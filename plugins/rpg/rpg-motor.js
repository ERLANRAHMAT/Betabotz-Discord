const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

const MOTOR_GRADES = {
  motorGrade1: {
    name: "MotorGrade1",
    price: 2000000,
    maxBensin: 100,
    maxDurability: 100,
  },
  motorGrade2: {
    name: "MotorGrade2",
    price: 3000000,
    maxBensin: 200,
    maxDurability: 250,
  },
  motorGrade3: {
    name: "MotorGrade3",
    price: 4000000,
    maxBensin: 300,
    maxDurability: 350,
  },
};

const BENSIN_PRICE = 500; // per 10 bensin
const REPAIR_PRICE = 1000; // per 10 durability
const SELL_PERCENT = 0.5; // 50% harga beli

module.exports = {
  prefix: "motor",
  category: "rpg",
  aliases: [],
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const sub = args[0]?.toLowerCase();

    const userData = await api.getUser(authorId, authorUsername);
    if (!userData.motor) userData.motor = { Bensin: 0, Durability: 0, Name: "", motorGrade: "", status: false };

    // !motor buy <grade>
    if (sub === "buy") {
      const inputKey = args[1];
      const gradeKey = Object.keys(MOTOR_GRADES).find(
        k => k.toLowerCase() === (inputKey || '').toLowerCase()
      );
      const grade = MOTOR_GRADES[gradeKey];
      if (!grade) return message.reply("Pilih grade motor: motorGrade1, motorGrade2, motorGrade3. Contoh: `!motor buy motorGrade2`");
      if (userData.motor.status) {
        return message.reply("Kamu sudah punya motor aktif! Jual dulu motor lamamu dengan `!motor sell` sebelum membeli yang baru.");
      }
      if ((userData.money || 0) < grade.price) return message.reply(`Uangmu kurang! Harga: ${grade.price.toLocaleString('id-ID')}`);
      userData.money -= grade.price;
      userData.motor = {
        Bensin: grade.maxBensin,
        Durability: grade.maxDurability,
        Name: "",
        motorGrade: gradeKey,
        status: true
      };
      await api.updateUser(authorId, userData);
      return message.reply(
        `✅ Berhasil membeli ${grade.name}!\n` +
        `- Motor ini otomatis aktif.\n` +
        `- Isi nama motor dengan \`!motor name <nama>\`\n` +
        `- Isi bensin dengan \`!motor bensin <jumlah>\`\n` +
        `- Repair durability dengan \`!motor repair <jumlah>\`\n` +
        `- Cek info motor dengan \`!motor info\`\n` +
        `- Jual motor dengan \`!motor sell\``
      );
    }

    // !motor sell
    if (sub === "sell") {
      if (!userData.motor.status) {
        return message.reply("Kamu tidak punya motor yang bisa dijual.");
      }
      const grade = MOTOR_GRADES[userData.motor.motorGrade];
      const sellPrice = Math.floor(grade.price * SELL_PERCENT);
      userData.money += sellPrice;
      userData.motor = { Bensin: 0, Durability: 0, Name: "", motorGrade: "", status: false };
      await api.updateUser(authorId, userData);
      return message.reply(`✅ Motor berhasil dijual seharga **${sellPrice.toLocaleString('id-ID')}** Money. Sekarang kamu bisa beli motor baru!`);
    }

    // !motor name <nama>
    if (sub === "name") {
      const name = args.slice(1).join(" ");
      if (!userData.motor.status) return message.reply("Kamu belum punya motor aktif.");
      if (!name) return message.reply("Masukkan nama motor. Contoh: `!motor name Ninja Merah`");
      userData.motor.Name = name;
      await api.updateUser(authorId, userData);
      return message.reply(`✅ Nama motor diubah menjadi: **${name}**`);
    }

    // !motor bensin <jumlah>
    if (sub === "bensin") {
      const amount = parseInt(args[1]);
      if (!userData.motor.status) return message.reply("Kamu belum punya motor aktif.");
      const grade = MOTOR_GRADES[userData.motor.motorGrade];
      const maxIsi = grade.maxBensin - (userData.motor.Bensin || 0);
      if (isNaN(amount) || amount <= 0) return message.reply("Jumlah bensin harus lebih dari 0.");
      if (amount > maxIsi) return message.reply(`Bensin terlalu banyak! Maksimal isi: ${maxIsi}`);
      const totalCost = Math.ceil(amount / 10) * BENSIN_PRICE;
      if ((userData.money || 0) < totalCost) return message.reply(`Uangmu kurang! Biaya isi bensin: ${totalCost.toLocaleString('id-ID')}`);
      userData.money -= totalCost;
      userData.motor.Bensin += amount;
      await api.updateUser(authorId, userData);
      return message.reply(`✅ Motor diisi ${amount} bensin. Sisa bensin: ${userData.motor.Bensin}/${grade.maxBensin}`);
    }

    // !motor repair <jumlah>
    if (sub === "repair") {
      const amount = parseInt(args[1]);
      if (!userData.motor.status) return message.reply("Kamu belum punya motor aktif.");
      const grade = MOTOR_GRADES[userData.motor.motorGrade];
      const maxRepair = grade.maxDurability - (userData.motor.Durability || 0);
      if (isNaN(amount) || amount <= 0) return message.reply("Jumlah repair harus lebih dari 0.");
      if (amount > maxRepair) return message.reply(`Repair terlalu banyak! Maksimal repair: ${maxRepair}`);
      const totalCost = Math.ceil(amount / 10) * REPAIR_PRICE;
      if ((userData.money || 0) < totalCost) return message.reply(`Uangmu kurang! Biaya repair: ${totalCost.toLocaleString('id-ID')}`);
      userData.money -= totalCost;
      userData.motor.Durability += amount;
      await api.updateUser(authorId, userData);
      return message.reply(`✅ Motor direpair ${amount} durability. Sisa durability: ${userData.motor.Durability}/${grade.maxDurability}`);
    }

    // !motor info
    if (sub === "info") {
      if (!userData.motor.status) {
        return message.reply("Kamu belum punya motor.");
      }
      const grade = MOTOR_GRADES[userData.motor.motorGrade];
      const m = userData.motor;
      const info =
        `**${grade.name}**\n` +
        `Nama: ${m.Name || "-"}\n` +
        `Bensin: ${m.Bensin}/${grade.maxBensin}\n` +
        `Durability: ${m.Durability}/${grade.maxDurability}\n` +
        `Status: ${m.status ? "Aktif" : "Tidak aktif"}\n`;
      const embed = new EmbedBuilder().setColor(0x0099FF).setTitle("🏍️ Motor Kamu").setDescription(info);
      return message.reply({ embeds: [embed] });
    }

    // Help
    return message.reply(
      "Fitur motor:\n" +
      "`!motor buy <grade>`\n" +
      "`!motor name <nama>`\n" +
      "`!motor bensin <jumlah>`\n" +
      "`!motor repair <jumlah>`\n" +
      "`!motor sell`\n" +
      "`!motor info`\n\n" +
      "Kamu hanya boleh punya 1 motor aktif. Jual motor lama sebelum beli baru."
    );
  },
  MOTOR_GRADES
};
