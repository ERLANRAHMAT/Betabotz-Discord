const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ComponentType,
  SlashCommandBuilder 
} = require("discord.js");
const moment = require("moment-timezone");
const config = require("../config");

// --- Helper Functions ---

function getUptime(seconds) {
  let d = Math.floor(seconds / (3600 * 24));
  let h = Math.floor(seconds % (3600 * 24) / 3600);
  let m = Math.floor(seconds % 3600 / 60);
  let s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

function getUniqueCommands(client) {
    const uniquePlugins = new Map();
    // Proses prefix commands
    client.prefixCommands.forEach(cmd => {
        const key = cmd.prefix || cmd.data?.name;
        if (key && !uniquePlugins.has(key)) {
            uniquePlugins.set(key, cmd);
        }
    });
    // Proses slash commands
    client.slashCommands.forEach(cmd => {
        const key = cmd.data?.name;
        if (key && !uniquePlugins.has(key)) {
            uniquePlugins.set(key, cmd);
        }
    });
    return Array.from(uniquePlugins.values());
}

// Fungsi untuk membuat embed utama/awal
function createInitialEmbed(interaction, client, categories) {
    const now = moment().tz("Asia/Jakarta");
    const uptime = getUptime(process.uptime());
    const botName = config.botName || client.user.username;
    const userName = interaction.member?.displayName || interaction.user.username;

    const description = [
      `Halo **${userName}**!`,
      `Saya **${botName}**, bot serbaguna untuk membantu Anda.`,
      "",
      `◦ **Library**: discord.js`,
      `◦ **Uptime**: ${uptime}`,
      `◦ **Waktu Server**: ${now.format("HH:mm:ss")}`,
      `◦ **Prefix**: \`${config.prefix}\``
    ].join("\n");

    const embed = new EmbedBuilder()
      .setColor("#67DFF4")
      .setTitle("📚 Menu Bantuan")
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription(description)
      .setFooter({ text: `Pilih kategori di bawah untuk melihat daftar perintah.` });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("menu_category_select")
        .setPlaceholder("Pilih kategori...")
        .addOptions(
          categories.map((cat) => ({
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            value: cat,
            description: `Lihat semua perintah dalam kategori ${cat}`,
          }))
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);
    return { embeds: [embed], components: [row] };
}

// Fungsi untuk membuat embed kategori
function createCategoryEmbed(client, category, plugins) {
    const prefix = config.prefix || "!";
    const cmds = plugins.filter(p => p.category === category);
    
    let commandList = cmds.map(cmd => {
        if (cmd.prefix) {
            let aliasText = cmd.aliases && cmd.aliases.length ? ` (alias: ${cmd.aliases.join(", ")})` : "";
            return `• \`${prefix}${cmd.prefix}\`${aliasText}`;
        } else if (cmd.data?.name) {
            return `• \`/${cmd.data.name}\``;
        }
        return "";
    }).filter(Boolean).join("\n");
    
    if (!commandList) commandList = "Tidak ada perintah di kategori ini.";

    return new EmbedBuilder()
      .setColor("#67DFF4")
      .setTitle(`📖 Kategori: ${category.toUpperCase()}`)
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription(commandList);
}


// --- Main Export ---
module.exports = {
  category: "main", // Tetap ada untuk di-scan oleh handler
  data: new SlashCommandBuilder()
    .setName("menu")
    .setDescription("Menampilkan menu bantuan interaktif bot.")
    .addStringOption(option => 
      option.setName('kategori')
            .setDescription('Langsung lihat kategori perintah tertentu')
            .setRequired(false)),

  async execute(interaction, client) {
    // Tentukan apakah menu hanya bisa dilihat oleh pengguna atau publik
    const isPublicMenu = config.menuPublic === true;
    await interaction.deferReply({ ephemeral: !isPublicMenu });

    // Ambil semua perintah dan kategori yang unik
    const plugins = getUniqueCommands(client);
    const categories = [...new Set(plugins.map(p => p.category).filter(Boolean))].sort();
    
    const categoryArg = interaction.options.getString('kategori');

    // Jika pengguna memasukkan argumen kategori
    if (categoryArg && categories.includes(categoryArg.toLowerCase())) {
        const categoryEmbed = createCategoryEmbed(client, categoryArg.toLowerCase(), plugins);
        return interaction.editReply({ embeds: [categoryEmbed] });
    }

    // Jika tidak ada argumen, tampilkan menu utama dengan dropdown
    const { embeds, components } = createInitialEmbed(interaction, client, categories);
    const response = await interaction.editReply({ embeds, components });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000, // Collector aktif selama 1 menit
    });

    collector.on("collect", async i => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: "Hanya yang memanggil menu yang bisa memilih.", ephemeral: true });
        }
        const selectedCategory = i.values[0];
        const categoryEmbed = createCategoryEmbed(client, selectedCategory, plugins);
        await i.update({ embeds: [categoryEmbed] });
    });

    collector.on("end", async () => {
        try {
            // Hapus menu dropdown setelah waktu habis
            const finalRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("menu_disabled")
                    .setPlaceholder("Waktu habis...")
                    .setDisabled(true)
                    .addOptions({ label: "disabled", value: "disabled" })
            );
            await response.edit({ components: [finalRow] });
        } catch {}
    });
  },
};