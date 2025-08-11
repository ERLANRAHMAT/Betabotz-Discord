const { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '../../birthday_data.json');

const readJson = (filePath, defaultValue) => {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return data ? JSON.parse(data) : defaultValue;
        }
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
        return defaultValue;
    } catch (error) { return defaultValue; }
};
const writeJson = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ultah')
    .setDescription('Mengelola sistem pengingat ulang tahun untuk server ini.')
    .addSubcommand(sub => sub.setName('list').setDescription('Melihat daftar ulang tahun di server ini.'))
    .addSubcommand(sub => sub.setName('add').setDescription('Menambah data ulang tahun (Admin).')
        .addUserOption(opt => opt.setName('user').setDescription('Pengguna').setRequired(true))
        .addStringOption(opt => opt.setName('tanggal').setDescription('Format: DD/MM/YYYY').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Menghapus data ulang tahun (Admin).')
        .addUserOption(opt => opt.setName('user').setDescription('Pengguna').setRequired(true)))
    .addSubcommand(sub => sub.setName('config').setDescription('Mengatur channel notifikasi (Admin).')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel notifikasi').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addStringOption(opt => opt.setName('tipe').setDescription('Jenis notifikasi').setRequired(true).addChoices({ name: 'Ucapan Selamat (Hari H)', value: 'main' }, { name: 'Pengingat Staf', value: 'staff' }))
        .addStringOption(opt => opt.setName('waktu').setDescription('Waktu pengiriman (Format: HH:MM)').setRequired(true))
        .addRoleOption(opt => opt.setName('role1').setDescription('Role pertama yang di-mention').setRequired(true))
        .addRoleOption(opt => opt.setName('role2').setDescription('Role kedua (opsional)').setRequired(false))
        .addIntegerOption(opt => opt.setName('hari_sebelumnya').setDescription('Untuk pengingat staf: H- berapa (cth: 3)').setRequired(false))),
  category: "tools",
  
  async execute(interaction) {
    const subCommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const allServerData = readJson(dataFilePath, {});
    const serverData = allServerData[guildId] || { birthdays: [], configs: {} };

    // --- Perintah Publik ---
    if (subCommand === 'list') {
        const birthdays = serverData.birthdays;
        if (!birthdays || birthdays.length === 0) return interaction.reply({ content: "Belum ada data ulang tahun di server ini.", ephemeral: true });
        const listText = birthdays.map(b => `• **${b.name}**: ${b.day}/${b.month}/${b.year}`).join('\n');
        const embed = new EmbedBuilder().setTitle(`🎂 Daftar Ulang Tahun di ${interaction.guild.name}`).setDescription(listText);
        return interaction.reply({ embeds: [embed] });
    }

    // --- Perintah Admin ---
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: "❌ Anda perlu izin 'Manage Server' untuk perintah ini.", ephemeral: true });
    }

    if (subCommand === 'add') {
        const targetUser = interaction.options.getUser('user');
        const dateArg = interaction.options.getString('tanggal');
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateArg)) return interaction.reply({ content: "Format tanggal salah. Gunakan DD/MM/YYYY.", ephemeral: true });
        
        const [day, month, year] = dateArg.split('/').map(Number);
        if (serverData.birthdays.some(b => b.userId === targetUser.id)) return interaction.reply({ content: "Pengguna tersebut sudah ada di daftar.", ephemeral: true });

        serverData.birthdays.push({ userId: targetUser.id, name: targetUser.username, avatar: targetUser.displayAvatarURL(), day, month, year });
        allServerData[guildId] = serverData;
        writeJson(dataFilePath, allServerData);
        return interaction.reply({ content: `✅ Ulang tahun untuk **${targetUser.username}** berhasil ditambahkan.`, ephemeral: true });
    }

    if (subCommand === 'remove') {
        const targetUser = interaction.options.getUser('user');
        const initialLength = serverData.birthdays.length;
        serverData.birthdays = serverData.birthdays.filter(b => b.userId !== targetUser.id);
        if (serverData.birthdays.length === initialLength) return interaction.reply({ content: "Pengguna tidak ditemukan di daftar.", ephemeral: true });
        
        allServerData[guildId] = serverData;
        writeJson(dataFilePath, allServerData);
        return interaction.reply({ content: `✅ Ulang tahun untuk **${targetUser.username}** berhasil dihapus.`, ephemeral: true });
    }
    
    if (subCommand === 'config') {
        const channel = interaction.options.getChannel('channel');
        const type = interaction.options.getString('tipe');
        const time = interaction.options.getString('waktu');
        const role1 = interaction.options.getRole('role1');
        const role2 = interaction.options.getRole('role2');
        const daysInAdvance = interaction.options.getInteger('hari_sebelumnya');

        if (!/^\d{2}:\d{2}$/.test(time)) return interaction.reply({ content: "Format waktu salah. Gunakan HH:MM.", ephemeral: true });
        
        serverData.configs[channel.id] = {
            time: time,
            mentionRoleIds: [role1.id, role2?.id].filter(Boolean),
            isStaffReminder: type === 'staff',
            daysInAdvance: type === 'staff' ? (daysInAdvance || 3) : 0
        };
        
        allServerData[guildId] = serverData;
        writeJson(dataFilePath, allServerData);
        return interaction.reply({ content: `✅ Konfigurasi reminder berhasil disimpan untuk channel ${channel}!`, ephemeral: true });
    }
  },
};