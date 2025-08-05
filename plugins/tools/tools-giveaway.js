const { EmbedBuilder } = require('discord.js');

// State sekarang juga menyimpan hostId
// key: channelId, value: { participants: Set, info: string, startedAt: Date, hostId: string }
const giveawayState = new Map();

function formatDate(date) {
  return date.toLocaleDateString('id', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function createHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0x95a5a6)
    .setTitle("🎁 Panduan Perintah Giveaway")
    .setDescription(
      "Gunakan perintah dengan prefix `!` (contoh: `!giveaway start Hadiah pulsa`)\n\n" +
      "**Sub-Perintah Utama:**\n" +
      "`start <info>` — Memulai giveaway baru di channel ini.\n" +
      "`ikut` — Berpartisipasi dalam giveaway yang sedang berjalan.\n" +
      "`cek` — Melihat daftar peserta dan info giveaway.\n" +
      "`roll` — Mengundi pemenang (hanya bisa dilakukan oleh pembuat giveaway).\n" +
      "`hapus` — Membatalkan giveaway (hanya bisa dilakukan oleh pembuat giveaway).\n\n" +
      "Beberapa perintah memiliki alias, contohnya `!mulai`."
    )
    .setFooter({ text: "Bot Giveaway" });
}

module.exports = {
  prefix: "giveaway",
  aliases: ["giveway"], // Alias untuk typo
  category: "tools",

  /**
   * Fungsi execute utama.
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    if (args.length > 0) {
        const subCommandName = args[0].toLowerCase();
        for (const [name, commandData] of Object.entries(this.subCommands)) {
            if (name === subCommandName || (commandData.aliases && commandData.aliases.includes(subCommandName))) {
                await commandData.handler(message, args.slice(1), client);
                return;
            }
        }
    }
    const embed = createHelpEmbed();
    await message.reply({ embeds: [embed] });
  },

  subCommands: {
    start: {
      aliases: ["mulai", "mulaigiveaway", "startgiveaway"],
      /** @param {import('discord.js').Message} message */
      handler: async (message, args, client) => {
        const channelId = message.channel.id;
        const info = args.join(" ");
        if (!info) return message.reply("Contoh: `!giveaway start Hadiah pulsa 10k`");
        if (giveawayState.has(channelId)) return message.reply("Masih ada giveaway yang berjalan di channel ini!");
        
        // PERUBAHAN: Simpan ID pengguna yang memulai giveaway
        giveawayState.set(channelId, {
          participants: new Set(),
          info,
          startedAt: new Date(),
          hostId: message.author.id // Menyimpan ID host
        });
        
        const embed = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("🎁 GIVEAWAY DIMULAI!")
          .setDescription(`Gunakan \`!ikut\` untuk berpartisipasi!\n\n**Hadiah:**\n${info}`)
          .setFooter({ text: `Dimulai oleh ${message.author.username} pada: ${formatDate(new Date())}`, iconURL: message.author.displayAvatarURL() });
          
        await message.channel.send({ content: "@here", embeds: [embed] });
      }
    },

    ikut: {
      aliases: ["join", "ikutgiveaway"],
      /** @param {import('discord.js').Message} message */
      handler: async (message, args, client) => {
        const channelId = message.channel.id;
        if (!giveawayState.has(channelId)) return message.reply("Tidak ada giveaway yang sedang berlangsung di channel ini.");
        
        const state = giveawayState.get(channelId);
        if (state.participants.has(message.author.id)) return message.reply("Kamu sudah ikut dalam giveaway ini!");
        
        state.participants.add(message.author.id);
        await message.reply(`✅ **${message.author.username}** berhasil ikut giveaway!\nTotal peserta saat ini: **${state.participants.size}**`);
      }
    },

    cek: {
      aliases: ["check", "list", "peserta", "cekgiveaway"],
      /** @param {import('discord.js').Message} message */
      handler: async (message, args, client) => {
        const channelId = message.channel.id;
        if (!giveawayState.has(channelId)) return message.reply("Tidak ada giveaway yang sedang berlangsung di channel ini.");
        
        const state = giveawayState.get(channelId);
        const list = Array.from(state.participants).map((id, i) => `${i + 1}. <@${id}>`).join('\n') || "Belum ada peserta.";
        
        // PERUBAHAN: Tampilkan siapa host giveaway
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("Daftar Peserta Giveaway")
          .setDescription(`**Hadiah:**\n${state.info}\n\n**Dibuat oleh:** <@${state.hostId}>`)
          .addFields({ name: `Total Peserta: ${state.participants.size}`, value: list })
          .setFooter({ text: `Giveaway dimulai pada: ${formatDate(state.startedAt)}` });
          
        await message.reply({ embeds: [embed] });
      }
    },

    roll: {
      aliases: ["pick", "rolling", "undi", "rollgiveaway"],
      /** @param {import('discord.js').Message} message */
      handler: async (message, args, client) => {
        const channelId = message.channel.id;
        if (!giveawayState.has(channelId)) return message.reply("Tidak ada giveaway yang sedang berlangsung di channel ini.");
        
        const state = giveawayState.get(channelId);
        
        // PERUBAHAN: Cek hak akses. Hanya host yang bisa roll.
        if (message.author.id !== state.hostId) {
          return message.reply(`❌ Anda tidak memiliki izin. Hanya <@${state.hostId}> yang bisa mengundi pemenang.`);
        }
        
        if (state.participants.size === 0) return message.reply("Tidak ada peserta yang ikut giveaway ini.");
        
        const participantsArray = Array.from(state.participants);
        const winnerId = participantsArray[Math.floor(Math.random() * participantsArray.length)];
        
        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("🎊 SELAMAT KEPADA PEMENANG! 🎉")
          .setDescription(`Pemenang undian giveaway adalah <@${winnerId}>!\n\n**Hadiah yang dimenangkan:**\n${state.info}`)
          .setThumbnail(message.guild.iconURL())
          .setFooter({ text: `Diundi oleh ${message.author.username} pada: ${formatDate(new Date())}`, iconURL: message.author.displayAvatarURL() });
          
        await message.channel.send({ content: `Selamat <@${winnerId}>! 🥳`, embeds: [embed], allowedMentions: { users: [winnerId] } });
        
        giveawayState.delete(channelId);
      }
    },

    hapus: {
      aliases: ["delete", "end", "batal", "hapusgiveaway", "deletegiveaway"],
      /** @param {import('discord.js').Message} message */
      handler: async (message, args, client) => {
        const channelId = message.channel.id;
        if (!giveawayState.has(channelId)) return message.reply("Tidak ada giveaway yang sedang berlangsung di channel ini.");
        
        const state = giveawayState.get(channelId);

        // PERUBAHAN: Cek hak akses. Hanya host yang bisa hapus.
        if (message.author.id !== state.hostId) {
            return message.reply(`❌ Anda tidak memiliki izin. Hanya <@${state.hostId}> yang bisa menghapus giveaway ini.`);
        }
        
        giveawayState.delete(channelId);
        await message.reply("✅ Giveaway yang sedang berjalan di channel ini telah berhasil dihapus.");
      }
    }
  }
};