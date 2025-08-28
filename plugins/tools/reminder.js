const { EmbedBuilder, SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const config = require('../../config.js');

const WEBHOOK_NAME = "AQUA BOT Reminders";

/**
 * Mendapatkan atau membuat webhook khusus untuk bot di channel tertentu.
 * @param {import('discord.js').TextChannel} channel Channel untuk webhook.
 * @param {import('discord.js').Client} client Klien bot.
 * @returns {Promise<import('discord.js').Webhook|null>}
 */
async function getOrCreateWebhook(channel, client) {
    try {
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.name === WEBHOOK_NAME && wh.owner.id === client.user.id);

        if (!webhook) {
            console.log(`[Webhook] Webhook tidak ditemukan di #${channel.name}, membuat yang baru...`);
            webhook = await channel.createWebhook({
                name: WEBHOOK_NAME,
                avatar: client.user.displayAvatarURL(),
                reason: 'Untuk pengingat otomatis'
            });
        }
        return webhook;
    } catch (error) {
        console.error(`[Webhook] Gagal mendapatkan atau membuat webhook di #${channel.name}:`, error);
        return null;
    }
}

// [PERBAIKAN] Membuat instance axios khusus untuk webhook API
// Ini akan secara otomatis menambahkan apikey ke setiap request
const webhookApi = axios.create({
    baseURL: config.api.baseUrl,
    params: {
        apikey: config.api.apiKey
    }
});

// Mapping dari nama grup di Discord ke path di API
const groupToApiMap = {
    cuaca: 'weather',
    gempa: 'quake',
    sholat: 'sholat'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Mengatur pengingat otomatis via webhook untuk channel ini.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageWebhooks)
    .addSubcommandGroup(group => group.setName('cuaca').setDescription('Perintah pengingat cuaca.')
        .addSubcommand(sub => sub.setName('set').setDescription('Mengatur atau memperbarui pengingat cuaca harian.')
            .addStringOption(opt => opt.setName('kota').setDescription('Nama kota (gunakan /tescuaca untuk validasi).').setRequired(true))
            .addStringOption(opt => opt.setName('waktu1').setDescription('Waktu pengingat pertama (format HH:MM, cth: 07:00).').setRequired(true))
            .addStringOption(opt => opt.setName('waktu2').setDescription('Waktu pengingat kedua (opsional).'))
            .addStringOption(opt => opt.setName('waktu3').setDescription('Waktu pengingat ketiga (opsional).'))
            .addStringOption(opt => opt.setName('username').setDescription('Nama kustom untuk webhook (opsional).'))
            .addStringOption(opt => opt.setName('avatar_url').setDescription('URL gambar untuk avatar webhook (opsional).'))
            .addStringOption(opt => opt.setName('webhook_url').setDescription('Gunakan URL webhook yang sudah ada (opsional).')) // Opsi baru
        )
        .addSubcommand(sub => sub.setName('delete').setDescription('Menghapus pengingat cuaca untuk channel ini.'))
        .addSubcommand(sub => sub.setName('status').setDescription('Memeriksa status pengingat cuaca saat ini.'))
    )
    .addSubcommandGroup(group => group.setName('gempa').setDescription('Perintah notifikasi gempa.')
        .addSubcommand(sub => sub.setName('set').setDescription('Mengaktifkan notifikasi gempa di channel ini.')
            .addStringOption(opt => opt.setName('username').setDescription('Nama kustom untuk webhook (opsional).'))
            .addStringOption(opt => opt.setName('avatar_url').setDescription('URL gambar untuk avatar webhook (opsional).'))
            .addStringOption(opt => opt.setName('webhook_url').setDescription('Gunakan URL webhook yang sudah ada (opsional).')) // Opsi baru
        )
        .addSubcommand(sub => sub.setName('delete').setDescription('Menonaktifkan notifikasi gempa.'))
        .addSubcommand(sub => sub.setName('status').setDescription('Memeriksa status notifikasi gempa.'))
    )
    .addSubcommandGroup(group => group.setName('sholat').setDescription('Perintah pengingat waktu sholat.')
        .addSubcommand(sub => sub.setName('set').setDescription('Mengatur atau memperbarui kota untuk pengingat sholat.')
            .addStringOption(opt => opt.setName('kota').setDescription('Nama kota (gunakan /tessholat untuk validasi).').setRequired(true))
            .addStringOption(opt => opt.setName('username').setDescription('Nama kustom untuk webhook (opsional).'))
            .addStringOption(opt => opt.setName('avatar_url').setDescription('URL gambar untuk avatar webhook (opsional).'))
            .addStringOption(opt => opt.setName('webhook_url').setDescription('Gunakan URL webhook yang sudah ada (opsional).')) // Opsi baru
        )
        .addSubcommand(sub => sub.setName('delete').setDescription('Menghapus pengingat sholat.'))
        .addSubcommand(sub => sub.setName('status').setDescription('Memeriksa status pengingat sholat saat ini.'))
    ),
  
  category: "tools",
  
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const action = interaction.options.getSubcommand();
    const channel = interaction.channel;
    
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageWebhooks)) {
        return interaction.reply({ content: "❌ Anda perlu izin 'Manage Webhooks' untuk perintah ini.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const apiGroup = groupToApiMap[group];
        const apiUrl = `/reminders/webhook/${apiGroup}`; // Path relatif
        
        if (action === 'set') {
            const providedWebhookUrl = interaction.options.getString('webhook_url');
            let finalWebhookUrl;

            if (providedWebhookUrl) {
                // Validasi URL webhook
                if (!/^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/.test(providedWebhookUrl)) {
                    return interaction.editReply("❌ URL webhook yang Anda masukkan tidak valid.");
                }
                finalWebhookUrl = providedWebhookUrl;
            } else {
                const webhook = await getOrCreateWebhook(channel, interaction.client);
                if (!webhook) {
                    return interaction.editReply("❌ Gagal membuat webhook di channel ini. Pastikan bot memiliki izin 'Manage Webhooks'.");
                }
                finalWebhookUrl = webhook.url;
            }
            
            const payload = { 
                webhookUrl: finalWebhookUrl, 
                channelId: channel.id,
                username: interaction.options.getString('username'),
                avatarUrl: interaction.options.getString('avatar_url')
            };
            if (interaction.options.getString('kota')) payload.kota = interaction.options.getString('kota');
            if (group === 'cuaca') {
                const times = [interaction.options.getString('waktu1'), interaction.options.getString('waktu2'), interaction.options.getString('waktu3')].filter(Boolean);
                for (const time of times) { if (!/^\d{2}:\d{2}$/.test(time)) return interaction.editReply(`Format waktu salah: ${time}. Gunakan HH:MM.`); }
                payload.waktu = times;
            }
            
            try {
                await webhookApi.put(`${apiUrl}/${channel.id}`, payload);
                return interaction.editReply(`✅ Berhasil! Pengingat **${group}** telah diperbarui.`);
            } catch (e) {
                if (e.response && e.response.status === 404) {
                    await webhookApi.post(apiUrl, payload);
                    return interaction.editReply(`✅ Berhasil! Pengingat **${group}** telah diatur.`);
                }
                throw e;
            }
        } 
        else if (action === 'delete') {
            await webhookApi.delete(`${apiUrl}/${channel.id}`);
            // Coba hapus webhook yang dibuat bot jika ada
            const webhook = (await channel.fetchWebhooks()).find(wh => wh.name === WEBHOOK_NAME && wh.owner.id === interaction.client.user.id);
            if (webhook) await webhook.delete('Reminder deleted by user.').catch(()=>{});
            return interaction.editReply(`✅ Pengingat **${group}** untuk channel ini telah dihapus.`);
        }
        else if (action === 'status') {
            const response = await webhookApi.get(`${apiUrl}/${channel.id}`);
            const data = response.data.data;
            let statusMessage = `🔎 Status **${group}**: Aktif.\n`;
            if (data.kota) statusMessage += `> **Kota:** ${data.kota}\n`;
            if (data.waktu) statusMessage += `> **Waktu:** ${data.waktu.join(', ')}\n`;
            return interaction.editReply(statusMessage);
        }

    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error("[REMINDER CMD ERROR]", error);
        await interaction.editReply(`❌ Gagal: ${errorMessage}`);
    }
  },
};
