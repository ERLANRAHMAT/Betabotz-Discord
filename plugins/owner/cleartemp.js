const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

module.exports = {
  prefix: "cleartemp",
  category: "owner",
  aliases: ["clearcache", "cleartmp"],
  
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    // Perintah ini hanya untuk Owner Bot
    if (message.author.id !== config.ownerId) {
        return message.reply("⛔ Perintah ini hanya untuk Owner Bot!");
    }

    const tempDir = path.join(__dirname, '../../temp');

    // Cek apakah folder temp ada
    if (!fs.existsSync(tempDir)) {
        return message.reply("📁 Folder `temp` tidak ditemukan.");
    }

    const files = fs.readdirSync(tempDir);
    if (files.length === 0) {
        return message.reply("✅ Folder `temp` sudah kosong.");
    }

    // Embed Konfirmasi
    const confirmEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("⚠️ Konfirmasi Hapus Cache")
        .setDescription(`Anda yakin ingin menghapus **${files.length}** file dari folder \`temp\`?\n\nTindakan ini tidak bisa dibatalkan.`);
        
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_clear_temp').setLabel('Ya, Hapus Semua').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancel_clear_temp').setLabel('Batal').setStyle(ButtonStyle.Secondary)
    );
    
    const confirmationMsg = await message.reply({ embeds: [confirmEmbed], components: [buttons] });

    // Collector untuk tombol konfirmasi
    const collector = confirmationMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000 // Waktu konfirmasi 30 detik
    });

    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
            return i.reply({ content: 'Tombol ini bukan untukmu!', ephemeral: true });
        }
        
        await i.deferUpdate();
        collector.stop(); // Hentikan collector setelah ada interaksi

        if (i.customId === 'confirm_clear_temp') {
            let deletedCount = 0;
            files.forEach(file => {
                try {
                    fs.unlinkSync(path.join(tempDir, file));
                    deletedCount++;
                } catch (err) {
                    console.error(`[ClearTemp] Gagal menghapus file ${file}:`, err);
                }
            });
            await confirmationMsg.edit({ 
                content: `✅ Berhasil menghapus **${deletedCount}** file dari folder \`temp\`.`,
                embeds: [], 
                components: [] 
            });
        } else { // cancel_clear_temp
            await confirmationMsg.edit({ 
                content: "👍 Pembersihan dibatalkan.", 
                embeds: [], 
                components: [] 
            });
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            // Menonaktifkan tombol jika waktu habis
            const disabledButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_clear_temp').setLabel('Ya, Hapus Semua').setStyle(ButtonStyle.Danger).setDisabled(true),
                new ButtonBuilder().setCustomId('cancel_clear_temp').setLabel('Batal').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            confirmationMsg.edit({ content: "⌛ Konfirmasi waktu habis.", components: [disabledButtons] });
        }
    });
  },
};