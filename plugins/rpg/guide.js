const { EmbedBuilder } = require("discord.js");

module.exports = {
  prefix: "guide",
  category: "rpg",
  aliases: ["panduan", "help", "rpghelp"],
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📖 Panduan RPG BETABOTZ")
      .setDescription(
        "**Selamat datang di RPG BETABOTZ!**\n" +
          "Di sini kamu bisa bekerja, bertualang, crafting, berburu, memancing, Bermasin games, mengoleksi waifu, dan banyak lagi.\n\n" +
          "**Langkah Awal:**\n" +
          "1. Cek profilmu: `!profile`\n" +
          "2. Ambil hadiah harian: `!daily`\n" +
          "3. Pilih pekerjaan: `!job list` lalu `!job apply <nama>`\n" +
          "4. Mulai bekerja: `!job work`\n" +
          "5. Bermain Games: `/menu game`\n" +
          "6. Cek inventaris: `!inventory`\n\n" +
          "**Fitur Utama:**",
      )
      .addFields(
        { name: "🎮 Games", value: "`/menu game`" },
        {
          name: "💼 Ekonomi & Kerja",
          value: "`!job`, `!job work`, `!job list`, `!job apply`",
        },
        { name: "🎣 Mancing & Kolam", value: "`!mancing`, `!kolam`" },
        {
          name: "🏹 Berburu, Masak & !kandang",
          value: "`!berburu`, `!masak <resep>`, `!kandang`",
        },
        {
          name: "⛏️ Tambang & Crafting",
          value: "`!tambang start`, `!craft <item>`,`!repair`",
        },
        { name: "🪓 Nebang Kayu", value: "`!nebang`" },
        { name: "💊 Heal & Makan", value: "`!heal`, `!makan <item>`" },
        {
          name: "💰 Shop & Transfer",
          value: "`!shop`, `!transfer <item> <jumlah> @user`",
        },
        { name: "🎰 Slot & Copet", value: "`!slot <jumlah>`, `!copet`" },
        { name: "🗺️ Petualangan", value: "`!berpetualang start`" },
        { name: "⚔️ Bertarung", value: "`!bertarung @user <taruhan>`" },
        {
          name: "💍 Waifu",
          value:
            "`!waifu roll`, `!waifu search <nama>`, `!waifu list`, `!waifu marry`, `!waifu my`",
        },
        {
          name: "🏆 Leaderboard",
          value: "`!leaderboard eco`, `!leaderboard rpg`",
        },
        { name: "⛓️ Penjara", value: "`!penjara @user`, `!checkjail`" },
      )
      .setFooter({ text: "Selamat bersenang-senang! ❤️🩵" });

    await message.reply({ embeds: [embed] });
  },
};
