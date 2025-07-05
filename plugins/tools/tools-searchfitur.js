const { EmbedBuilder } = require("discord.js");

module.exports = {
  prefix: "searchfitur",
  category: "tools",
  aliases: [],
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply(
        `✨ *Example Usage:* \`${
          client.config?.prefix || "!"
        }searchfitur fitur\``
      );
    }
    const query = args.join(" ").toLowerCase();

    // Gabungkan semua command dari prefix dan slash
    const prefixCmds = Array.from(client.prefixCommands.entries());
    const slashCmds = Array.from(client.slashCommands.entries());

    // Cari yang match di prefix
    const prefixResults = prefixCmds.filter(
      ([name, cmd]) =>
        (cmd.prefix && cmd.prefix.toLowerCase().includes(query)) ||
        (cmd.aliases &&
          cmd.aliases.some((a) => a.toLowerCase().includes(query)))
    );
    // Cari yang match di slash
    const slashResults = slashCmds.filter(
      ([name, cmd]) =>
        cmd.data && cmd.data.name && cmd.data.name.toLowerCase().includes(query)
    );

    if (prefixResults.length === 0 && slashResults.length === 0) {
      return message.reply(
        `❌ Tidak ada fitur yang cocok dengan pencarian: \`${query}\``
      );
    }

    let desc = "";
    if (prefixResults.length) {
      desc +=
        `**Prefix Commands (!)**\n` +
        prefixResults
          .map(
            ([name, cmd]) =>
              `• \`${client.config?.prefix || "!"}${cmd.prefix}\`${
                cmd.aliases && cmd.aliases.length
                  ? ` (alias: ${cmd.aliases.join(", ")})`
                  : ""
              } [${cmd.category || "-"}]`
          )
          .join("\n") +
        "\n";
    }
    if (slashResults.length) {
      desc +=
        `**Slash Commands (/)**\n` +
        slashResults
          .map(
            ([name, cmd]) => `• \`/${cmd.data.name}\` [${cmd.category || "-"}]`
          )
          .join("\n");
    }

    const embed = new EmbedBuilder()
      .setColor("#67DFF4")
      .setTitle(`🔎 Hasil Pencarian: '${query}'`)
      .setDescription(desc)
      .setFooter({ text: "BetaBotz • ArteonStudio" })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
