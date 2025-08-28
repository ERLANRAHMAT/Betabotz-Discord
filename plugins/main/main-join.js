const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { invites } = require("../../index");
const config = require("../../config");

const JOIN_CHANNEL_ID = config.joinChannelId;
const CHANNEL_IDS = config.channelIds;

module.exports = {
  category: "main", // Tambahkan baris ini
  data: new SlashCommandBuilder()
    .setName("testjoin")
    .setDescription(
      "Simulasi pesan sambutan untuk pengguna tertentu (khusus admin)"
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Pengguna yang akan menerima pesan sambutan")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return await interaction.editReply({
          content:
            "❌ Anda tidak memiliki izin untuk menggunakan perintah ini!",
        });
      }
      const targetUser = interaction.options.getMember("user");
      if (!targetUser) {
        return await interaction.editReply({
          content: "❌ Pengguna tidak ditemukan atau bukan anggota server!",
        });
      }
      await module.exports.handleGuildMemberAdd(targetUser, interaction.client);
      await interaction.editReply({
        content: `✅ Berhasil mengirim pesan sambutan untuk ${targetUser.user.tag}!`,
      });
    } catch (error) {
      console.error(
        `Error saat menjalankan /testjoin untuk ${
          interaction.options.getUser("user")?.tag
        }:`,
        error
      );
      await interaction.editReply({
        content: `❌ Gagal menjalankan simulasi: ${error.message || error}`,
      });
    }
  },

  async handleGuildMemberAdd(member, client) {
    try {
      // Invite tracker logic
      let inviter = null,
        inviterTotal = 0;
      const guildInvites = await member.guild.invites.fetch();
      const cachedInvites = invites.get(member.guild.id) || new Map();

      for (const [code, invite] of guildInvites) {
        const prevUses = cachedInvites.get(code) || 0;
        if (invite.uses > prevUses) {
          inviter = invite.inviter;
          break;
        }
      }
      if (inviter) {
        inviterTotal = guildInvites
          .filter((inv) => inv.inviter?.id === inviter.id)
          .reduce((acc, inv) => acc + (inv.uses || 0), 0);
      }
      invites.set(
        member.guild.id,
        new Map(guildInvites.map((inv) => [inv.code, inv.uses]))
      );

      await member.guild.members.fetch();
      const totalMember = member.guild.memberCount;

      // BUTTONS
      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Official Website")
          .setStyle(ButtonStyle.Link)
          .setURL("https://arteonstudio.site")
          .setEmoji("🌐"),
        new ButtonBuilder()
          .setLabel("Order Skill Sekarang")
          .setStyle(ButtonStyle.Link)
          .setURL(
            `https://discord.com/channels/${member.guild.id}/${CHANNEL_IDS.ticket}`
          )
          .setEmoji("🎫")
      );

      // EMBED UTAMA (CHANNEL)
      const channel = await client.channels.fetch(JOIN_CHANNEL_ID);
      if (channel) {
        const channelEmbed = new EmbedBuilder()
          .setColor("#67DFF4")
          .setTitle(`Selamat Datang, ${member.user.username}!`)
          .setDescription(
            `Halo <@${member.user.id}>, selamat bergabung di **ArteonStudio**!\n\n` +
              `**Total member:** ${totalMember}\n` +
              (inviter
                ? `**Diundang oleh:** ${inviter.tag} (Total invite: ${inviterTotal})`
                : "Tidak diketahui siapa yang mengundang.") +
              `\n\nKami sangat senang menyambut Anda di komunitas kami! Silakan kunjungi website resmi kami atau langsung order skill melalui tiket!`
          )
          .setThumbnail(
            member.user.displayAvatarURL({ dynamic: true, size: 256 })
          )
          .setFooter({ text: "© 2025 Arteon Studio. Hak cipta dilindungi." })
          .setTimestamp();

        await channel.send({ embeds: [channelEmbed], components: [buttonRow] });
      }

      // EMBED DM
      const dmEmbed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle("Selamat Datang di ArteonStudio!")
        .setDescription(
          `Halo **${member.user.username}**, terima kasih telah bergabung dengan **ArteonStudio**!\n\n` +
            `Kami adalah komunitas yang berfokus pada layanan kreatif dan kolaborasi seni. ` +
            `Untuk memulai, silakan baca informasi penting di channel berikut dan jangan ragu untuk menghubungi tim kami jika ada pertanyaan.`
        )
        .addFields(
          {
            name: "📜 Peraturan",
            value: `Pelajari peraturan server di <#${CHANNEL_IDS.rules}>.`,
            inline: true,
          },
          {
            name: "💰 Daftar Harga",
            value: `Lihat layanan dan harga di <#${CHANNEL_IDS.pricelist}>.`,
            inline: true,
          },
          {
            name: "🎫 Tiket",
            value: `Butuh bantuan? Buat tiket di <#${CHANNEL_IDS.ticket}>.`,
            inline: true,
          },
          {
            name: "📋 Antrian",
            value: `Cek atau gabung antrian di <#${CHANNEL_IDS.queue}>.`,
            inline: true,
          }
        )
        .setThumbnail(
          member.guild.iconURL({ dynamic: true, size: 256 }) ||
            "https://artreonstudio.site/logo.png"
        )
        .setFooter({
          text: "ArteonStudio • Bersama, wujudkan kreativitas!",
          iconURL: client.user.displayAvatarURL(),
        })
        .setTimestamp();

      await member.send({ embeds: [dmEmbed], components: [buttonRow] });
    } catch (error) {
      if (error.code === 50007) {
        // Tidak dapat mengirim pesan ke pengguna (DM dinonaktifkan)
        console.log(
          `Gagal mengirim DM ke ${member.user.tag}: DM dinonaktifkan.`
        );
      } else {
        console.error(
          `Error di handleGuildMemberAdd untuk ${member.user.tag}:`,
          error
        );
      }
    }
  },
};
