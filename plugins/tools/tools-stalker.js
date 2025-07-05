const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

module.exports = {
  prefix: "stalk",
  category: "tools",
  aliases: [
    "ffstalk",
    "mlstalk",
    "mlstalk2",
    "supersusstalk",
    "npmstalk",
    "repostalk",
    "genshinstalk",
    "gistalk",
    "stalkgenshin",
    "hokstalk",
  ],
  async execute(message, args, client) {
    const command = message.content
      .slice(config.prefix.length)
      .trim()
      .split(/ +/)[0]
      .toLowerCase();
    console.log(
      `[STALK] Command triggered by: ${message.author.tag}, Command: ${command}`
    );

    // Jika tidak ada argumen, tampilkan embed panduan
    if (!args[0]) {
      console.log("[STALK] No arguments provided, showing command list");
      const embed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle("Mau Stalk Apa Kak? 😎")
        .setDescription(
          "Berikut daftar perintah stalking yang tersedia:\n\n" +
            `**${config.prefix}ffstalk <ID>** - Stalk akun Free Fire\n` +
            `Contoh: \`${config.prefix}ffstalk 919044185\`\n\n` +
            `**${config.prefix}mlstalk <ID|Server>** - Stalk akun Mobile Legends\n` +
            `Contoh: \`${config.prefix}mlstalk 2480197|2001\`\n\n` +
            `**${config.prefix}mlstalk2 <ID|Server>** - Stalk akun Mobile Legends (V2)\n` +
            `Contoh: \`${config.prefix}mlstalk2 214885010|2253\`\n\n` +
            `**${config.prefix}supersusstalk <ID>** - Stalk akun Super Sus\n` +
            `Contoh: \`${config.prefix}supersusstalk 20431364\`\n\n` +
            `**${config.prefix}npmstalk <Nama>** - Stalk package NPM\n` +
            `Contoh: \`${config.prefix}npmstalk tiktokdl\`\n\n` +
            `**${config.prefix}repostalk <Nama Repo>** - Stalk repository GitHub\n` +
            `Contoh: \`${config.prefix}repostalk RTXZY-MD\`\n\n` +
            `**${config.prefix}genshinstalk <ID>** - Stalk akun Genshin Impact\n` +
            `Contoh: \`${config.prefix}genshinstalk 843829161\`\n\n` +
            `**${config.prefix}hokstalk <ID>** - Stalk akun Honor of Kings\n` +
            `Contoh: \`${config.prefix}hokstalk 6467015277108375938\``
        )
        .setFooter({ text: "BetaBotz • Stalker" })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const waitMsg = await message.reply(
      "⏳ Sedang memproses permintaan stalking..."
    );
    const apiKey = config.apikey_lann;
    console.log("[STALK] apiKey:", apiKey);

    try {
      let apiUrl, embed;

      if (command === "ffstalk") {
        apiUrl = `https://api.betabotz.eu.org/api/stalk/ff?id=${encodeURIComponent(
          args[0]
        )}&apikey=${apiKey}`;
        console.log("[STALK FF] API URL:", apiUrl);

        const response = await fetch(apiUrl);
        console.log("[STALK FF] Fetch status:", response.status);
        const rawText = await response.text();
        console.log("[STALK FF] Raw response:", rawText.slice(0, 200));

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          console.error("[STALK FF] Parse error:", e);
          await waitMsg.edit({
            content: `[ ! ] Gagal memproses respons API. Kemungkinan server bermasalah atau diblokir oleh Cloudflare.`,
          });
          return;
        }

        if (!data.result || !data.result.userNameGame) {
          console.error("[STALK FF] Invalid response:", data);
          await waitMsg.edit({
            content: "[ ! ] Data Free Fire tidak ditemukan.",
          });
          return;
        }

        embed = new EmbedBuilder()
          .setColor("#ff4757")
          .setTitle("🔫 Free Fire Stalk")
          .setDescription(`**Username:** ${data.result.userNameGame}`)
          .setFooter({ text: "BetaBotz • Stalker" })
          .setTimestamp();
      } else if (command === "mlstalk" || command === "mlstalk2") {
        if (args.length < 2 || !args[0].includes("|")) {
          console.log("[STALK ML] Invalid arguments:", args);
          await waitMsg.edit({
            content: `❌ Format salah. Contoh: \`${config.prefix}${command} ID|Server\``,
          });
          return;
        }
        const [id, server] = args[0].split("|");
        apiUrl =
          command === "mlstalk"
            ? `https://api.betabotz.eu.org/api/stalk/ml?id=${encodeURIComponent(
                id
              )}&server=${encodeURIComponent(server)}&apikey=${apiKey}`
            : `https://api.betabotz.eu.org/api/stalk/ml-v2?id=${encodeURIComponent(
                id
              )}&server=${encodeURIComponent(server)}&apikey=${apiKey}`;
        console.log(
          `[STALK ML${command === "mlstalk2" ? "2" : ""}] API URL:`,
          apiUrl
        );

        const response = await fetch(apiUrl);
        console.log(
          `[STALK ML${command === "mlstalk2" ? "2" : ""}] Fetch status:`,
          response.status
        );
        const rawText = await response.text();
        console.log(
          `[STALK ML${command === "mlstalk2" ? "2" : ""}] Raw response:`,
          rawText.slice(0, 200)
        );

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          console.error(
            `[STALK ML${command === "mlstalk2" ? "2" : ""}] Parse error:`,
            e
          );
          await waitMsg.edit({
            content: `[ ! ] Gagal memproses respons API. Kemungkinan server bermasalah atau diblokir oleh Cloudflare.`,
          });
          return;
        }

        if (command === "mlstalk") {
          if (!data.result || !data.result.userName) {
            console.error("[STALK ML] Invalid response:", data);
            await waitMsg.edit({
              content: "[ ! ] Data Mobile Legends tidak ditemukan.",
            });
            return;
          }
          embed = new EmbedBuilder()
            .setColor("#1e90ff")
            .setTitle("🎮 Mobile Legends Stalk")
            .setDescription(
              `**User ID:** ${data.result.user_id}\n` +
                `**Server:** ${data.result.server_id}\n` +
                `**Username:** ${data.result.userName}\n` +
                `**Region:** ${data.result.country}`
            )
            .setFooter({ text: "BetaBotz • Stalker" })
            .setTimestamp();
        } else {
          if (!data.status || !data.result.data.stalk_info) {
            console.error("[STALK ML2] Invalid response:", data);
            await waitMsg.edit({
              content: "[ ! ] Data Mobile Legends (V2) tidak ditemukan.",
            });
            return;
          }
          const result = data.result.data.stalk_info;
          const shopData = data.result.data.categorized_shop;
          let description =
            `**User ID:** ${result.user_id}\n` +
            `**Server:** ${result.region}\n` +
            `**Nickname:** ${
              result.stalk_data.split("\n")[2].split(": ")[1]
            }\n` +
            `**Country:** ${
              result.stalk_data.split("\n")[3].split(": ")[1]
            }\n\n` +
            `**Diamond Packs:**\n${result.shop_data.diamond.goods
              .map(
                (good) =>
                  `- ${good.title}: ${
                    good.limits.reached ? "Reached" : "Available"
                  }, Inventory: ${good.limits.inventory}`
              )
              .join("\n")}\n\n` +
            `**Event Packs:**\n${result.shop_data.event.goods
              .map(
                (good) =>
                  `- ${good.title}: ${
                    good.limits.reached ? "Reached" : "Available"
                  }, Inventory: ${good.limits.inventory}`
              )
              .join("\n")}\n\n` +
            `**Weekly Pass:**\n${shopData.weeklyPass.items
              .map(
                (item) =>
                  `- ${item.title}: ${
                    item.limits.reached_limit ? "Reached" : "Available"
                  }`
              )
              .join("\n")}\n\n` +
            `**Diamond Packs (Categorized):**\n${shopData.diamondPacks.items
              .map(
                (item) =>
                  `- ${item.title}: ${
                    item.limits.reached_limit ? "Reached" : "Available"
                  }`
              )
              .join("\n")}\n\n` +
            `**First Charge Bonus:**\n${shopData.firstCharge.items
              .map(
                (item) =>
                  `- ${item.title}: ${
                    item.limits.reached_limit ? "Reached" : "Available"
                  }`
              )
              .join("\n")}\n\n` +
            `**Special Offers:**\n${
              shopData.specialOffers.items.length === 0
                ? "- No special offers available"
                : shopData.specialOffers.items
                    .map(
                      (item) =>
                        `- ${item.title}: ${
                          item.limits.reached_limit ? "Reached" : "Available"
                        }`
                    )
                    .join("\n")
            }\n\n` +
            `**Other Items:**\n${
              shopData.other.items.length === 0
                ? "- No other items available"
                : shopData.other.items
                    .map(
                      (item) =>
                        `- ${item.title}: ${
                          item.limits.reached_limit ? "Reached" : "Available"
                        }`
                    )
                    .join("\n")
            }`;
          embed = new EmbedBuilder()
            .setColor("#1e90ff")
            .setTitle("🎮 Mobile Legends Stalk (V2)")
            .setDescription(description)
            .setFooter({ text: "BetaBotz • Stalker" })
            .setTimestamp();
        }
      } else if (command === "supersusstalk") {
        apiUrl = `https://api.betabotz.eu.org/api/stalk/supersus?id=${encodeURIComponent(
          args[0]
        )}&apikey=${apiKey}`;
        console.log("[STALK SUPERSUS] API URL:", apiUrl);

        const response = await fetch(apiUrl);
        console.log("[STALK SUPERSUS] Fetch status:", response.status);
        const rawText = await response.text();
        console.log("[STALK SUPERSUS] Raw response:", rawText.slice(0, 200));

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          console.error("[STALK SUPERSUS] Parse error:", e);
          await waitMsg.edit({
            content: `[ ! ] Gagal memproses respons API. Kemungkinan server bermasalah atau diblokir oleh Cloudflare.`,
          });
          return;
        }

        if (!data.result || !data.result.name) {
          console.error("[STALK SUPERSUS] Invalid response:", data);
          await waitMsg.edit({
            content: "[ ! ] Data Super Sus tidak ditemukan.",
          });
          return;
        }

        embed = new EmbedBuilder()
          .setColor("#2ed573")
          .setTitle("🚀 Super Sus Stalk")
          .setDescription(
            `**ID:** ${data.result.id}\n` +
              `**Name:** ${data.result.name}\n` +
              `**Account:** ${data.result.account}\n` +
              `**User ID:** ${data.result.userId}\n` +
              `**Space ID:** ${data.result.spaceId}\n` +
              `**Sex:** ${data.result.sex}\n` +
              `**Cup Number:** ${data.result.cupNum}\n` +
              `**Bind Type:** ${data.result.bindType}\n` +
              `**Head ID:** ${data.result.headId}\n` +
              `**Head URL:** ${data.result.headUrl}\n` +
              `**Device:** ${data.result.device}`
          )
          .setFooter({ text: "BetaBotz • Stalker" })
          .setTimestamp();
      } else if (command === "npmstalk") {
        apiUrl = `https://api.betabotz.eu.org/api/stalk/npm?name=${encodeURIComponent(
          args[0]
        )}&apikey=${apiKey}`;
        console.log("[STALK NPM] API URL:", apiUrl);

        const response = await fetch(apiUrl);
        console.log("[STALK NPM] Fetch status:", response.status);
        const rawText = await response.text();
        console.log("[STALK NPM] Raw response:", rawText.slice(0, 200));

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          console.error("[STALK NPM] Parse error:", e);
          await waitMsg.edit({
            content: `[ ! ] Gagal memproses respons API. Kemungkinan server bermasalah atau diblokir oleh Cloudflare.`,
          });
          return;
        }

        if (!data.result || !data.result.name) {
          console.error("[STALK NPM] Invalid response:", data);
          await waitMsg.edit({ content: "[ ! ] Data NPM tidak ditemukan." });
          return;
        }

        let description =
          `**ID:** ${data.result._id}\n` +
          `**Name:** ${data.result.name}\n` +
          `**Description:** ${data.result.description}\n` +
          `**Main:** ${data.result.main}\n` +
          `**License:** ${data.result.license}\n` +
          `**Homepage:** ${data.result.homepage}\n` +
          `**Keywords:** ${data.result.keywords.join(", ")}\n` +
          `**Repository:** ${data.result.repository.url}\n` +
          `**Bugs:** ${data.result.bugs.url}\n`;
        for (let version in data.result.versions) {
          const v = data.result.versions[version];
          description +=
            `\n**Version: ${v.version}**\n` +
            `**Description:** ${v.description}\n` +
            `**Main:** ${v.main}\n` +
            `**License:** ${v.license}\n` +
            `**Homepage:** ${v.homepage}\n` +
            `**Keywords:** ${v.keywords.join(", ")}\n` +
            `**Repository:** ${v.repository.url}\n` +
            `**Bugs:** ${v.bugs.url}\n`;
        }

        embed = new EmbedBuilder()
          .setColor("#ff6b6b")
          .setTitle("📦 NPM Stalk")
          .setDescription(description)
          .setFooter({ text: "BetaBotz • Stalker" })
          .setTimestamp();
      } else if (command === "repostalk") {
        apiUrl = `https://api.betabotz.eu.org/api/stalk/repo?repo=${encodeURIComponent(
          args[0]
        )}&apikey=${apiKey}`;
        console.log("[STALK REPO] API URL:", apiUrl);

        const response = await fetch(apiUrl);
        console.log("[STALK REPO] Fetch status:", response.status);
        const rawText = await response.text();
        console.log("[STALK REPO] Raw response:", rawText.slice(0, 200));

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          console.error("[STALK REPO] Parse error:", e);
          await waitMsg.edit({
            content: `[ ! ] Gagal memproses respons API. Kemungkinan server bermasalah atau diblokir oleh Cloudflare.`,
          });
          return;
        }

        if (!data.result || !data.result.items[0]) {
          console.error("[STALK REPO] Invalid response:", data);
          await waitMsg.edit({
            content: "[ ! ] Data Repository tidak ditemukan.",
          });
          return;
        }

        const repo = data.result.items[0];
        embed = new EmbedBuilder()
          .setColor("#2f3542")
          .setTitle("📂 GitHub Repository Stalk")
          .setDescription(
            `**ID:** ${repo.id}\n` +
              `**Node ID:** ${repo.nodeId}\n` +
              `**Nama Repo:** ${repo.nameRepo}\n` +
              `**Nama Lengkap Repo:** ${repo.fullNameRepo}\n` +
              `**URL Repo:** ${repo.url_repo}\n` +
              `**Deskripsi:** ${repo.description || "-"}\n` +
              `**URL Git:** ${repo.git_url}\n` +
              `**URL SSH:** ${repo.ssh_url}\n` +
              `**URL Clone:** ${repo.clone_url}\n` +
              `**URL SVN:** ${repo.svn_url}\n` +
              `**Homepage:** ${repo.homepage || "-"}\n` +
              `**Stargazers:** ${repo.stargazers}\n` +
              `**Watchers:** ${repo.watchers}\n` +
              `**Forks:** ${repo.forks}\n` +
              `**Default Branch:** ${repo.defaultBranch}\n` +
              `**Bahasa:** ${repo.language || "-"}\n` +
              `**Private:** ${repo.isPrivate ? "Yes" : "No"}\n` +
              `**Fork:** ${repo.isFork ? "Yes" : "No"}\n` +
              `**Created At:** ${repo.createdAt}\n` +
              `**Updated At:** ${repo.updatedAt}\n` +
              `**Pushed At:** ${repo.pushedAt}\n` +
              `**Author Username:** ${repo.author.username}\n` +
              `**Author ID:** ${repo.author.id_user}\n` +
              `**Author Avatar URL:** ${repo.author.avatar_url}\n` +
              `**Author GitHub URL:** ${repo.author.user_github_url}\n` +
              `**Author Type:** ${repo.author.type}\n` +
              `**Is Site Admin:** ${repo.author.isSiteAdmin ? "Yes" : "No"}`
          )
          .setFooter({ text: "BetaBotz • Stalker" })
          .setTimestamp();
      } else if (
        command === "genshinstalk" ||
        command === "gistalk" ||
        command === "stalkgenshin"
      ) {
        apiUrl = `https://api.betabotz.eu.org/api/stalk/genshin?id=${encodeURIComponent(
          args[0]
        )}&apikey=${apiKey}`;
        console.log("[STALK GENSHIN] API URL:", apiUrl);

        const response = await fetch(apiUrl);
        console.log("[STALK GENSHIN] Fetch status:", response.status);
        const rawText = await response.text();
        console.log("[STALK GENSHIN] Raw response:", rawText.slice(0, 200));

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          console.error("[STALK GENSHIN] Parse error:", e);
          await waitMsg.edit({
            content: `[ ! ] Gagal memproses respons API. Kemungkinan server bermasalah atau diblokir oleh Cloudflare.`,
          });
          return;
        }

        if (!data.status || !data.result[0]) {
          console.error("[STALK GENSHIN] Invalid response:", data);
          await waitMsg.edit({
            content: "[ ! ] Data Genshin Impact tidak ditemukan.",
          });
          return;
        }

        const result = data.result[0];
        embed = new EmbedBuilder()
          .setColor("#ffcccb")
          .setTitle("🌟 Genshin Impact Stalk")
          .setDescription(
            `**Nickname:** ${result.nickname}\n` +
              `**UID:** ${result.uid}\n` +
              `**Level:** ${result.level}\n` +
              `**World Level:** ${result.worldLevel}\n` +
              `**Achievement:** ${result.achievement}\n` +
              `**Card ID:** ${result.cardId}\n` +
              `**Spiral Abyss:** ${result.spiralAbyss}\n` +
              `**Detail:** ${result.detail}`
          )
          .setFooter({ text: "BetaBotz • Stalker" })
          .setTimestamp();
      } else if (command === "hokstalk") {
        apiUrl = `https://api.betabotz.eu.org/api/stalk/hok?id=${encodeURIComponent(
          args[0]
        )}&apikey=${apiKey}`;
        console.log("[STALK HOK] API URL:", apiUrl);

        const response = await fetch(apiUrl);
        console.log("[STALK HOK] Fetch status:", response.status);
        const rawText = await response.text();
        console.log("[STALK HOK] Raw response:", rawText.slice(0, 200));

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          console.error("[STALK HOK] Parse error:", e);
          await waitMsg.edit({
            content: `[ ! ] Gagal memproses respons API. Kemungkinan server bermasalah atau diblokir oleh Cloudflare.`,
          });
          return;
        }

        if (!data.result || !data.result.ok) {
          console.error("[STALK HOK] Invalid response:", data);
          await waitMsg.edit({
            content: "[ ! ] Data Honor of Kings tidak ditemukan.",
          });
          return;
        }

        embed = new EmbedBuilder()
          .setColor("#ff7f50")
          .setTitle("⚔️ Honor of Kings Stalk")
          .setDescription(`**Name:** ${data.result.name}`)
          .setFooter({ text: "BetaBotz • Stalker" })
          .setTimestamp();
      } else {
        console.log("[STALK] Unknown command:", command);
        await waitMsg.edit({
          content: `❌ Perintah tidak dikenali. Gunakan salah satu: ${this.aliases.join(
            ", "
          )}`,
        });
        return;
      }

      await message.reply({ embeds: [embed] });
      await waitMsg.delete().catch(() => {});
      console.log(`[STALK] Successfully sent response for ${command}`);
    } catch (e) {
      console.error(`[STALK ERROR] ${command}:`, e);
      await waitMsg.edit({
        content: "[ ! ] Terjadi kesalahan saat memproses permintaan.",
      });
    }
  },
};
