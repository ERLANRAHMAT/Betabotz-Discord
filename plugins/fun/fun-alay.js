module.exports = {
  prefix: "alay",
  category: "fun",
  aliases: [],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    let teks = args.join(" ");
    if (!teks && message.reference?.messageId) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        teks = repliedMsg.content;
      } catch {
        teks = "";
      }
    }
    if (!teks) {
      teks = message.content.replace(/^!alay\s*/i, "");
    }
    if (!teks || !teks.trim()) {
      return message.reply("Masukkan teks yang ingin di-alay-kan!\nContoh: `!alay aku ganteng`");
    }

    let alay = teks.replace(/[a-z]/gi, v =>
      Math.random() > 0.5
        ? v[["toLowerCase", "toUpperCase"][Math.floor(Math.random() * 2)]]()
        : v
    ).replace(/[abegiors]/gi, v => {
      if (Math.random() > 0.5) return v;
      switch (v.toLowerCase()) {
        case "a": return "4";
        case "b": return Math.random() > 0.5 ? "8" : "13";
        case "e": return "3";
        case "g": return Math.random() > 0.5 ? "6" : "9";
        case "i": return "1";
        case "o": return "0";
        case "r": return "12";
        case "s": return "5";
      }
    });

    await message.reply(alay);
  },
};
