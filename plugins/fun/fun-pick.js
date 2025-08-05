const { EmbedBuilder } = require('discord.js');

module.exports = {
  prefix: "pick",
  category: "fun",
  aliases: [],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    if (args.length < 2 || isNaN(args[0]) || Number(args[0]) < 1) {
      return message.reply('Contoh: `!pick 3 gay`');
    }
    const jumlah = Math.min(Number(args[0]), message.guild.members.cache.filter(m => !m.user.bot).size);
    const label = args.slice(1).join(" ");
    // Ambil semua member (bukan bot)
    let users = message.guild.members.cache.filter(m => !m.user.bot).map(m => m.user.id);
    // Pilih acak
    let picked = [];
    for (let i = 0; i < jumlah && users.length > 0; i++) {
      const idx = Math.floor(Math.random() * users.length);
      picked.push(users.splice(idx, 1)[0]);
    }
    const mentionList = picked.map(id => `<@${id}>`).join('\n');
    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle(`🎉 Pick Result`)
      .setDescription(`Kamu Ter${message.commandName || 'pick'} sebagai **${label}**`)
      .addFields({ name: "Terpilih", value: mentionList || "-", inline: false });
    await message.reply({ embeds: [embed] });
  }
};
