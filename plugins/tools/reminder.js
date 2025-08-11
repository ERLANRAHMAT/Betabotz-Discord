const { EmbedBuilder, SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const api = require('../../api_handler.js');
const reminderHandler = require('../../reminder_handler.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Mengatur pengingat otomatis untuk channel ini.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addSubcommandGroup(group => 
        group.setName('cuaca')
             .setDescription('Mengatur pengingat cuaca.')
             .addSubcommand(sub => 
                 sub.setName('set')
                    .setDescription('Mengatur atau memperbarui pengingat cuaca.')
                    .addStringOption(opt => opt.setName('waktu').setDescription('Waktu pengiriman (format HH:MM)').setRequired(true))
                    .addStringOption(opt => opt.setName('kota').setDescription('Nama kota').setRequired(true))
             )
             .addSubcommand(sub => sub.setName('delete').setDescription('Menghapus pengingat cuaca.'))
             .addSubcommand(sub => sub.setName('status').setDescription('Melihat status pengingat cuaca.'))
    )
    .addSubcommandGroup(group => 
        group.setName('gempa')
             .setDescription('Mengatur notifikasi gempa.')
             .addSubcommand(sub => sub.setName('set').setDescription('Mengaktifkan notifikasi gempa.'))
             .addSubcommand(sub => sub.setName('delete').setDescription('Menonaktifkan notifikasi gempa.'))
    )
    .addSubcommandGroup(group => 
        group.setName('sholat')
             .setDescription('Mengatur pengingat waktu sholat.')
             .addSubcommand(sub => 
                 sub.setName('set')
                    .setDescription('Mengatur atau memperbarui kota untuk pengingat sholat.')
                    .addStringOption(opt => opt.setName('kota').setDescription('Nama kota').setRequired(true))
             )
             .addSubcommand(sub => sub.setName('delete').setDescription('Menghapus pengingat sholat.'))
             .addSubcommand(sub => sub.setName('status').setDescription('Melihat status pengingat sholat.'))
    ),
  
  category: "tools",
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: "❌ Anda perlu izin 'Manage Channels' untuk perintah ini.", ephemeral: true });
    }

    const group = interaction.options.getSubcommandGroup();
    const action = interaction.options.getSubcommand();
    const channelId = interaction.channel.id;

    await interaction.deferReply({ ephemeral: true });

    try {
        if (group === 'cuaca') {
            if (action === 'set') {
                const time = interaction.options.getString('waktu');
                const city = interaction.options.getString('kota');
                if (!/^\d{2}:\d{2}$/.test(time)) return interaction.editReply("Format waktu salah. Gunakan HH:MM.");
                
                await api.addWeatherReminder(channelId, time, city); // API handler Anda sudah bisa set/update
                reminderHandler.resetSentStatus(channelId);
                return interaction.editReply(`✅ Berhasil! Pengingat cuaca untuk **${city}** akan dikirim setiap pukul **${time}**.`);
            }
            if (action === 'delete') {
                await api.deleteWeatherReminder(channelId);
                return interaction.editReply("✅ Pengingat cuaca berhasil dihapus.");
            }
            if (action === 'status') {
                const reminders = await api.getWeatherReminders();
                const current = reminders.find(r => r.Ch === channelId);
                if (current) return interaction.editReply(`🔎 Status: Pengingat cuaca aktif untuk **${current.kota}** pukul **${current.waktu}**.`);
                else return interaction.editReply("Tidak ada pengingat cuaca aktif di channel ini.");
            }
        }
        else if (group === 'gempa') {
            if (action === 'set') {
                await api.addQuakeReminder(channelId);
                return interaction.editReply("✅ Berhasil! Channel ini akan menerima notifikasi gempa bumi.");
            }
            if (action === 'delete') {
                await api.deleteQuakeReminder(channelId);
                return interaction.editReply("✅ Notifikasi gempa berhasil dihapus.");
            }
        }
        else if (group === 'sholat') {
            if (action === 'set') {
                const city = interaction.options.getString('kota');
                await api.setPrayerReminder(channelId, city);
                reminderHandler.updateAllPrayerSchedules(); // Panggil update setelah set
                return interaction.editReply(`✅ Berhasil! Pengingat sholat untuk **${city}** telah diatur.`);
            }
            if (action === 'delete') {
                await api.deletePrayerReminder(channelId);
                return interaction.editReply("✅ Pengingat sholat berhasil dihapus.");
            }
            if (action === 'status') {
                const reminders = await api.getPrayerReminders();
                const current = reminders.find(r => r.Ch === channelId);
                if (current) return interaction.editReply(`🔎 Status: Pengingat sholat aktif untuk kota **${current.kota}**.`);
                else return interaction.editReply("Tidak ada pengingat sholat aktif di channel ini.");
            }
        }
    } catch (error) {
        console.error("[REMINDER CMD ERROR]", error);
        await interaction.editReply(`❌ Gagal: ${error.response?.data?.message || error.message}`);
    }
  },
};