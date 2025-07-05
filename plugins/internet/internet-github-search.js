const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  prefix: "githubsearch",
  aliases: ["ghsearch"],
  category: "tools",
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const query = args.join(" ");
    if (!query) {
      return message.reply(
        "❗ Masukkan kata kunci pencarian. Contoh: `!githubsearch discord bot`"
      );
    }
    const waitMsg = await message.reply("🔎 Mencari repository di GitHub...");
    try {
      const apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(
        query
      )}`;
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (
        !json.items ||
        !Array.isArray(json.items) ||
        json.items.length === 0
      ) {
        await waitMsg.edit(
          "❌ Tidak ditemukan repository untuk pencarian tersebut."
        );
        return;
      }
      const results = json.items
        .slice(0, 5)
        .map(
          (repo, i) =>
            `**${i + 1}. [${repo.full_name}](${repo.html_url})**${
              repo.fork ? " (fork)" : ""
            }\n` +
            `⭐ ${repo.stargazers_count} | 🍴 ${repo.forks} | 👁 ${repo.watchers}\n` +
            `Deskripsi: ${
              repo.description ? repo.description : "_Tidak ada deskripsi_"
            }\n` +
            `Clone: \`${repo.clone_url}\``
        )
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setColor("#67DFF4")
        .setTitle(`Hasil GitHub: "${query}"`)
        .setDescription(results)
        .setFooter({ text: "BetaBotz • GitHub Search" })
        .setTimestamp();

      await waitMsg.edit({ content: null, embeds: [embed] });
    } catch (e) {
      console.error("[GITHUB SEARCH ERROR]", e);
      await waitMsg.edit("❌ Terjadi error saat mencari di GitHub.");
    }
  },
};
