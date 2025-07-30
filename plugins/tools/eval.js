// plugins/owner/eval.js (Versi Baru)

const { EmbedBuilder } = require('discord.js');
const util = require('util');
const config = require('../../config');

module.exports = {
  prefix: "eval",
  category: "tools",
  aliases: ["e", "evaluate"],

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {

    if (message.author.id !== config.ownerId) {
        return message.reply("⛔ Perintah ini hanya untuk Owner Bot!");
    }

    const code = args.join(' ');

    if (!code) {
      return message.reply("Harap masukkan kode JavaScript yang ingin dievaluasi.");
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        .addFields({ name: '📥 Input', value: `\`\`\`js\n${code.substring(0, 1010)}\n\`\`\`` })
        .setFooter({ text: 'Mengevaluasi kode...' });

    try {
      let evaled = await eval(`(async () => { ${code} })()`);
      let output = util.inspect(evaled, { depth: 0 });
      
      const token = client.token.split('').join('[^]{0,2}');
      const rev = client.token.split('').reverse().join('[^]{0,2}');
      const filter = new RegExp(`${token}|${rev}`, 'g');
      output = output.replace(filter, '[TOKEN]');

      if (output.length > 1000) {
        output = output.substring(0, 1000) + '...';
      }

      embed
        .setTitle("✅ Evaluasi Berhasil")
        .setColor(0x2ECC71)
        .addFields({ name: '📤 Output', value: `\`\`\`js\n${output}\n\`\`\`` });

    } catch (error) {
      let errorOutput = util.inspect(error, { depth: 0 });
       if (errorOutput.length > 1000) {
        errorOutput = errorOutput.substring(0, 1000) + '...';
      }

      embed
        .setTitle("❌ Evaluasi Gagal")
        .setColor(0xE74C3C)
        .addFields({ name: '📤 Error', value: `\`\`\`js\n${errorOutput}\n\`\`\`` });
    }

    await message.reply({ embeds: [embed] });
  },
};