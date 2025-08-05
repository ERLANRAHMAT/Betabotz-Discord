const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  prefix: "status",
  category: "tools",
  aliases: ["mcstatus", "mcserver"],
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply(
        "❗ Contoh: `!status demo.mcstatus.io 25565` atau `!status play.example.com`"
      );
    }
    const address = args[0];
    let fixedAddress = address;
    if (!fixedAddress.includes(".") && !fixedAddress.endsWith(".xyz")) {
      fixedAddress = fixedAddress + ".xyz";
    }
    const port = args[1] ? parseInt(args[1], 10) : null;
    if (!fixedAddress || (args[1] && isNaN(port))) {
      return message.reply(
        "❗ Format salah. Contoh: `!status demo.mcstatus.io 25565`"
      );
    }

    const waitMsg = await sendApiProcessing(message, "MCStatus");
    try {
      const apiUrl = port
        ? `https://api.mcsrvstat.us/3/${fixedAddress}:${port}`
        : `https://api.mcsrvstat.us/3/${fixedAddress}`;
      const res = await fetch(apiUrl);
      const contentType = res.headers.get("content-type") || "";
      let json = null;
      let rawText = null;

      if (!contentType.includes("application/json")) {
        rawText = await res.text();
        console.log("[MCSRVSTAT RAW RESPONSE]", rawText);
        await sendApiError(
          message,
          "API mcsrvstat.us tidak mengembalikan JSON valid atau server tidak ditemukan.",
          "MCStatus"
        );
        return;
      }

      try {
        json = await res.json();
      } catch (err) {
        console.error("[MCSRVSTAT PARSE ERROR]", err);
        await sendApiError(
          message,
          "API mcsrvstat.us tidak mengembalikan JSON valid.",
          "MCStatus"
        );
        return;
      }

      if (!json || typeof json.online !== "boolean") {
        await sendApiError(
          message,
          "Gagal mengambil status server.",
          "MCStatus"
        );
        return;
      }

      const playersOnline = json.players?.online ?? "-";
      const playersMax = json.players?.max ?? "-";
      const playerList = Array.isArray(json.players?.list)
        ? json.players.list.map((p) => `\`${p.name}\``).join("  ")
        : "-";
      const motd = Array.isArray(json.motd?.clean)
        ? json.motd.clean.join("\n")
        : json.motd?.clean || "-";
      const version = json.version || json.protocol?.name || "-";

      // UI embed lebih rapi
      const embed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle("Minecraft Server Status")
        .setDescription(
          `**Menampilkan Status server:** \`${fixedAddress}${
            port ? ":" + port : ""
          }\``
        )
        .addFields(
          {
            name: "Status | IP | Port",
            value: `\`${
              json.online ? "🟢 Online" : "🔴 Offline"
            }\`   |   \`${fixedAddress}\`   |   \`${String(
              json.port || port || "-"
            )}\``,
            inline: false,
          },
          {
            name: "Version | Players",
            value: `\`${version}\`   |   \`${playersOnline} / ${playersMax}\``,
            inline: false,
          },
          {
            name: "MOTD",
            value: `\`\`\`\n${motd}\n\`\`\``,
            inline: false,
          }
        )
        .setFooter({ text: "BetaBotz MCStatus" })
        .setTimestamp();

      // Tidak perlu setThumbnail/iconUrl

      if (playerList && playerList !== "-") {
        embed.addFields({
          name: "Sample Players",
          value: playerList,
          inline: false,
        });
      }

      // Plugins/mods info
      if (Array.isArray(json.plugins) && json.plugins.length) {
        embed.addFields({
          name: "Plugins",
          value: json.plugins
            .map((p) => `${p.name}${p.version ? ` (${p.version})` : ""}`)
            .join(", "),
          inline: false,
        });
      }
      if (Array.isArray(json.mods) && json.mods.length) {
        embed.addFields({
          name: "Mods",
          value: json.mods
            .map((m) => `${m.name}${m.version ? ` (${m.version})` : ""}`)
            .join(", "),
          inline: false,
        });
      }

      await waitMsg.edit({ embeds: [embed] });
    } catch (err) {
      console.error("[MCSTATUS ERROR]", err);
      await sendApiError(message, err, "MCStatus");
    }
  },
};
