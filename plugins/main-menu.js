const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const moment = require("moment-timezone");
const config = require("../config");

module.exports = {
  prefix: "menu",
  category: "main",
  aliases: ["help", "bot"],
  async execute(message, args, client) {
    // Ambil plugin unik berdasarkan prefix+category
    const prefixPlugins = Array.from(client.prefixCommands.values()).filter(
      (v, i, arr) =>
        arr.findIndex(
          (x) => x.prefix === v.prefix && x.category === v.category
        ) === i
    );

    // Ambil plugin dari slashCommands yang punya category (dari plugins/store)
    const slashPlugins = Array.from(client.slashCommands.values()).filter(
      (p) => p.category && typeof p.category === "string"
    );

    // Gabungkan dan filter unik berdasarkan prefix/category/name
    const plugins = [
      ...prefixPlugins,
      ...slashPlugins.filter(
        (sp) =>
          !prefixPlugins.some(
            (pp) => pp.category === sp.category && pp.prefix === sp.prefix
          )
      ),
    ];

    const categories = [
      ...new Set(plugins.map((p) => p.category).filter(Boolean)),
    ];
    const now = moment().tz("Asia/Jakarta");
    const date = now.format("DD MMMM YYYY");
    const time = now.format("HH:mm:ss");
    const uptime = getUptime(process.uptime());
    const prefix = config.prefix || "!";
    const botName = config.botName || client.user.username;
    const userName = message.member?.displayName || message.author.username;

    const description = [
      `Hi **${userName}**!`,
      `"I am **${botName}** – a Discord bot that helps you perform tasks, search, and retrieve data or information directly within Discord."`,
      "",
      `◦ **Library:** discord.js`,
      `◦ **Function:** Assistant`,
      "",
      `┌  ◦ **Uptime** : ${uptime}`,
      `│  ◦ **Tanggal** : ${date}`,
      `│  ◦ **Waktu** : ${time}`,
      `└  ◦ **Prefix Used** : [ ${prefix} ]`,
    ].join("\n");

    const isPublicMenu = config.menuPublic === true;

    // Jika tidak ada argumen, tampilkan daftar kategori dengan Select Menu
    if (!args.length) {
      const embed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle("📚 MENU KATEGORI")
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(description)
        .setFooter({
          text: `Requested by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_menu_category")
        .setPlaceholder("Pilih kategori menu...")
        .addOptions(
          categories.map((cat) => ({
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            value: cat,
            description: `Lihat command kategori ${cat}`,
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const sent = await message.reply({
        embeds: [embed],
        components: [row],
        ephemeral: !isPublicMenu, // jika false, hanya user yang panggil yang bisa lihat
      });

      // Collector untuk handle select menu
      const collector = sent.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60_000, // 1 menit
      });

      collector.on("collect", async (interaction) => {
        if (!isPublicMenu && interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: "Hanya yang memanggil menu yang bisa memilih kategori.",
            ephemeral: true,
          });
        }
        const selectedCat = interaction.values[0];
        const cmds = plugins
          .filter((p) => p.category === selectedCat)
          .filter(
            (v, i, arr) =>
              arr.findIndex(
                (x) =>
                  (x.prefix || x.data?.name) === (v.prefix || v.data?.name) &&
                  x.category === v.category
              ) === i
          );

        let commandList = cmds
          .map((cmd) => {
            // Tampilkan prefix command atau slash command
            if (cmd.prefix) {
              let aliasText =
                cmd.aliases && cmd.aliases.length
                  ? ` (alias: ${cmd.aliases.join(", ")})`
                  : "";
              return `• \`${prefix}${cmd.prefix}\`${aliasText}`;
            } else if (cmd.data && cmd.data.name) {
              return `• \`/${cmd.data.name}\``;
            }
            return "";
          })
          .filter(Boolean)
          .join("\n");

        const embedCat = new EmbedBuilder()
          .setColor("#67DFF4")
          .setTitle(`📖 MENU: ${selectedCat.toUpperCase()}`)
          .setThumbnail(client.user.displayAvatarURL())
          .setDescription(description)
          .addFields({
            name: `Daftar Command (${selectedCat})`,
            value: commandList,
            inline: false,
          })
          .setFooter({
            text: `Requested by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();

        await interaction.update({ embeds: [embedCat], components: [row] });
      });

      collector.on("end", async () => {
        try {
          await sent.edit({ components: [] });
        } catch {}
      });

      return;
    }

    // Jika ada argumen, tetap handle !menu <kategori> manual
    const inputCat = args[0].toLowerCase();
    if (!categories.includes(inputCat)) {
      const embed = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("Kategori Tidak Ditemukan")
        .setDescription(
          `❌ Kategori \`${inputCat}\` tidak ditemukan!\n\nKategori tersedia:\n${categories
            .map((c) => `\`${c}\``)
            .join(", ")}`
        )
        .setFooter({
          text: `Requested by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const cmds = plugins
      .filter((p) => p.category === inputCat)
      .filter(
        (v, i, arr) =>
          arr.findIndex(
            (x) =>
              (x.prefix || x.data?.name) === (v.prefix || v.data?.name) &&
              x.category === v.category
          ) === i
      );

    let commandList = cmds
      .map((cmd) => {
        if (cmd.prefix) {
          let aliasText =
            cmd.aliases && cmd.aliases.length
              ? ` (alias: ${cmd.aliases.join(", ")})`
              : "";
          return `• \`${prefix}${cmd.prefix}\`${aliasText}`;
        } else if (cmd.data && cmd.data.name) {
          return `• \`/${cmd.data.name}\``;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor("#67DFF4")
      .setTitle(`📖 MENU: ${inputCat.toUpperCase()}`)
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription(description)
      .addFields({
        name: `Daftar Command (${inputCat})`,
        value: commandList,
        inline: false,
      })
      .setFooter({
        text: `Requested by ${message.author.username}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};

// Helper untuk uptime
function getUptime(ms) {
  let h = Math.floor(ms / 3600);
  let m = Math.floor((ms % 3600) / 60);
  let s = Math.floor(ms % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
