const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// --- Konfigurasi Aksi ---
const HEALTH_PER_POTION = 50;
const STAMINA_PER_POTION = 50;
const MAX_HEALTH = 100;
const MAX_STAMINA = 100;

module.exports = {
  prefix: "heal",
  category: "rpg",
  aliases: ["use"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    
    try {
        // 1. GET: Ambil data user terbaru dari API
        const userData = await api.getUser(authorId, authorUsername);

        // [PERBAIKAN] Menggunakan userData.rpg.health
        if ((userData.rpg.health || 0) >= MAX_HEALTH && (userData.stamina || 0) >= MAX_STAMINA) {
            return message.reply("❤️ Stamina dan Health kamu sudah penuh!");
        }

        const currentPotions = userData.potion || 0;
        if (currentPotions <= 0) {
            return message.reply("🧪 Kamu tidak memiliki Potion. Ketik `!shop buy potion <jumlah>` untuk membeli.");
        }

        let count = 1;
        if (args[0] && !isNaN(parseInt(args[0]))) {
            count = parseInt(args[0]);
        }

        if (currentPotions < count) {
            return message.reply(`🧪 Potion tidak cukup! Kamu hanya punya **${currentPotions}** Potion.`);
        }
        
        // Simpan nilai lama untuk ditampilkan
        const oldHealth = userData.rpg.health || 0;
        const oldStamina = userData.stamina || 0;

        // 2. MODIFY: Ubah data di memori
        userData.potion -= count;
        // [PERBAIKAN] Menggunakan userData.rpg.health
        userData.rpg.health = Math.min(MAX_HEALTH, (userData.rpg.health || 0) + (count * HEALTH_PER_POTION));
        userData.stamina = Math.min(MAX_STAMINA, (userData.stamina || 0) + (count * STAMINA_PER_POTION));

        // 3. POST: Kirim kembali seluruh objek user yang sudah diubah ke API
        await api.updateUser(authorId, userData);

        // 4. Kirim Pesan Sukses
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("🧪 Potion Digunakan!")
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(`Berhasil menggunakan **${count}** Potion.`)
            .addFields(
                // [PERBAIKAN] Menggunakan userData.rpg.health
                { name: '❤️ Health', value: `\`${oldHealth}\` ➔ \`${userData.rpg.health}\``, inline: true },
                { name: '⚡ Stamina', value: `\`${oldStamina}\` ➔ \`${userData.stamina}\``, inline: true },
                { name: 'Sisa Potion', value: `\`${userData.potion}\``, inline: true }
            );

        await message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("[HEAL CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};