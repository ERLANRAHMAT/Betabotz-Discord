const { EmbedBuilder, SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const config = require('../../config.js');

// [DIHAPUS] Fungsi getOrCreateWebhook tidak lagi diperlukan

// Membuat instance Axios yang benar, mengabaikan /proxy dari config
const correctBaseUrl = config.api.baseUrl.replace('/api/proxy', '');

const internalApi = axios.create({
    baseURL: correctBaseUrl,
    params: { apikey: config.api.apiKey },
});

const publicApi = axios.create({
    baseURL: correctBaseUrl,
    params: { apikey: config.api.apiKey }
});


module.exports = {
  data: new SlashCommandBuilder()
    .setName('ultah')
    .setDescription('Mengelola sistem pengingat ulang tahun via webhook.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand(sub => sub.setName('add').setDescription('Menambah data ulang tahun baru ke webhook.')
        .addStringOption(opt => opt.setName('webhook_url').setDescription('URL webhook dari channel target').setRequired(true)) // Opsi baru
        .addUserOption(opt => opt.setName('user').setDescription('Pengguna yang berulang tahun').setRequired(true))
        .addStringOption(opt => opt.setName('tanggal').setDescription('Tanggal lahir (Format: DD-MM-YYYY)').setRequired(true))
        .addRoleOption(opt => opt.setName('tag1').setDescription('Role/User pertama yang akan di-tag (opsional)'))
        .addRoleOption(opt => opt.setName('tag2').setDescription('Role/User kedua (opsional)'))
        .addRoleOption(opt => opt.setName('tag3').setDescription('Role/User ketiga (opsional)')))
    .addSubcommand(sub => sub.setName('remove').setDescription('Menghapus data ulang tahun pengguna dari webhook.')
        .addStringOption(opt => opt.setName('webhook_url').setDescription('URL webhook dari channel target').setRequired(true)) // Opsi baru
        .addUserOption(opt => opt.setName('user').setDescription('Pengguna yang data ulang tahunnya akan dihapus').setRequired(true)))
    // .addSubcommand(sub => sub.setName('update').setDescription('Mengubah tanggal ultah atau nama/avatar webhook.')
    //     .addStringOption(opt => opt.setName('webhook_url').setDescription('URL webhook dari channel target').setRequired(true)) // Opsi baru
    //     .addUserOption(opt => opt.setName('user').setDescription('Pengguna yang datanya akan diubah (opsional)'))
    //     .addStringOption(opt => opt.setName('tanggal').setDescription('Tanggal lahir baru (Format: DD-MM-YYYY, opsional)'))
    //     .addStringOption(opt => opt.setName('nama_bot').setDescription('Nama baru untuk bot pengingat (opsional)'))
    //     .addStringOption(opt => opt.setName('avatar_url').setDescription('URL avatar baru untuk bot (opsional)')))
    .addSubcommand(sub => sub.setName('terdekat').setDescription('Melihat 5 ulang tahun terdekat dari sebuah webhook.')
        .addStringOption(opt => opt.setName('webhook_url').setDescription('URL webhook dari channel target').setRequired(true))), // Opsi baru
  
  category: "tools",
  
  async execute(interaction) {
    const subCommand = interaction.options.getSubcommand();
    const isPublicCommand = subCommand === 'terdekat';

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !isPublicCommand) {
        return interaction.reply({ content: "❌ Anda perlu izin 'Manage Server' untuk perintah ini.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: !isPublicCommand });

    try {
        const webhookUrl = interaction.options.getString('webhook_url');
        // Validasi URL webhook
        if (!webhookUrl || !/^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/.test(webhookUrl)) {
            return interaction.editReply("❌ URL webhook yang Anda masukkan tidak valid.");
        }

        const endpoint = '/api/proxy/features/birthday';

        switch (subCommand) {
            case 'add': {
                const user = interaction.options.getUser('user');
                const date = interaction.options.getString('tanggal');
                if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) return interaction.editReply("Format tanggal salah. Gunakan DD-MM-YYYY.");
                
                const tags = [
                    interaction.options.getRole('tag1')?.id,
                    interaction.options.getRole('tag2')?.id,
                    interaction.options.getRole('tag3')?.id
                ].filter(Boolean).map(id => `<@&${id}>`);
                tags.unshift(`<@${user.id}>`);

                const payload = {
                    webhookUrl: webhookUrl,
                    channelId: interaction.channel.id,
                    birthdayData: {
                        userId: user.id,
                        name: user.username,
                        date: date,
                        tags: [...new Set(tags)]
                    }
                };
                const response = await internalApi.post(endpoint, payload);
                return interaction.editReply(`✅ ${response.data.message}`);
            }
            case 'remove': {
                const user = interaction.options.getUser('user');
                const payload = { webhookUrl: webhookUrl, userId: user.id };
                const response = await internalApi.delete(endpoint, { data: payload });
                return interaction.editReply(`✅ ${response.data.message}`);
            }
            // case 'update': {
            //     const payload = { webhookUrl: webhookUrl };
            //     const user = interaction.options.getUser('user');
            //     const date = interaction.options.getString('tanggal');
            //     const botName = interaction.options.getString('nama_bot');
            //     const avatarUrl = interaction.options.getString('avatar_url');

            //     if (!user && !botName && !avatarUrl) return interaction.editReply("Anda harus mengisi setidaknya satu opsi untuk diubah.");
                
            //     if (botName) payload.username = botName;
            //     if (avatarUrl) payload.avatarUrl = avatarUrl;
            //     if (user) {
            //         if (!date) return interaction.editReply("Jika Anda memilih user, Anda juga harus mengisi tanggal baru.");
            //         if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) return interaction.editReply("Format tanggal salah. Gunakan DD-MM-YYYY.");
            //         payload.birthdayData = { userId: user.id, date: date };
            //     }
                
            //     const response = await internalApi.put(endpoint, payload);
            //     return interaction.editReply(`✅ ${response.data.message}`);
            // }
            case 'terdekat': {
                const response = await publicApi.get(endpoint, { params: { webhookUrl: webhookUrl } });
                const birthdays = response.data.data?.upcomingBirthdays;
                if (!birthdays || birthdays.length === 0) return interaction.editReply("Tidak ada ulang tahun yang terdaftar di webhook ini.");

                const list = birthdays.map(b => `• **${b.name}** - ${b.date}`).join('\n');
                const embed = new EmbedBuilder().setColor(0x0099FF).setTitle("🎂 Ulang Tahun Terdekat").setDescription(list);
                return interaction.editReply({ embeds: [embed] });
            }
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        await interaction.editReply(`❌ Gagal: ${errorMessage}`);
    }
  },
};
