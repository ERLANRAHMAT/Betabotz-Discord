const { EmbedBuilder } = require('discord.js');

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
  prefix: "top",
  category: "fun",
  aliases: [],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply("Contoh penggunaan:\n!top <teks>");
    }
    const text = args.join(" ");
    const members = message.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
    if (members.length < 5) {
      return message.reply("Minimal ada 5 member (bukan bot) di server untuk menggunakan fitur ini.");
    }
    let pool = [...members];
    const picks = [];
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }
    const x = pickRandom(['🤓', '😅', '😂', '😳', '😎', '🥵', '😱', '🤑', '🙄', '💩', '🍑', '🤨', '🥴', '🔥', '👇🏻', '😔', '👀', '🌚']);
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`${x} Top 5 ${text} ${x}`)
      .setDescription(
        `1. <@${picks[0].id}>\n2. <@${picks[1].id}>\n3. <@${picks[2].id}>\n4. <@${picks[3].id}>\n5. <@${picks[4].id}>`
      );
    await message.reply({ embeds: [embed] });
  }
};
