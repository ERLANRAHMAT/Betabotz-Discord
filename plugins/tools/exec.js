// plugins/owner/exec.js

const { EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const util = require('util');
const config = require('../../config');

const execPromise = util.promisify(exec);

module.exports = {
  /**
   * Perintah ini tidak memiliki 'prefix' atau 'aliases' karena dipanggil
   * secara khusus oleh handler di index.js melalui trigger '$'.
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    if (message.author.id !== config.ownerId) {
        return message.reply("⛔ Perintah ini hanya untuk Owner Bot!");
    }

    const command = args.join(' ');
    if (!command) {
        return message.reply("Harap masukkan perintah shell yang ingin dieksekusi.");
    }

    const processingEmbed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setDescription(`⚙️ Mengeksekusi perintah:\n\`\`\`sh\n${command}\n\`\`\``);
    const processingMessage = await message.reply({ embeds: [processingEmbed] });

    try {
        // Jalankan perintah shell
        const { stdout, stderr } = await execPromise(command, { timeout: 60000 }); // Timeout 1 menit

        // Batasi panjang output agar tidak melebihi batas Discord
        const stdout_str = stdout.substring(0, 1000) + (stdout.length > 1000 ? '...' : '');
        const stderr_str = stderr.substring(0, 1000) + (stderr.length > 1000 ? '...' : '');

        const resultEmbed = new EmbedBuilder()
            .setColor(0x2ECC71) // Hijau
            .setTitle("✅ Eksekusi Perintah Selesai")
            .addFields({ name: '📥 Input', value: `\`\`\`sh\n${command}\n\`\`\`` });

        if (stdout_str) {
            resultEmbed.addFields({ name: '📤 Output (stdout)', value: `\`\`\`sh\n${stdout_str || 'Tidak ada output.'}\n\`\`\`` });
        }
        if (stderr_str) {
            // stderr tidak selalu berarti error, bisa juga progress, jadi warnanya kuning
            resultEmbed.addFields({ name: '📢 Output Peringatan (stderr)', value: `\`\`\`sh\n${stderr_str}\n\`\`\`` });
        }

        await processingMessage.edit({ embeds: [resultEmbed] });

    } catch (error) {
        // Tangani jika perintah itu sendiri gagal (misal: command not found)
        const errorOutput = (error.stderr || error.stdout || error.message).substring(0, 1000);

        const errorEmbed = new EmbedBuilder()
            .setColor(0xE74C3C) // Merah
            .setTitle("❌ Eksekusi Perintah Gagal")
            .addFields(
                { name: '📥 Input', value: `\`\`\`sh\n${command}\n\`\`\`` },
                { name: '📤 Error', value: `\`\`\`sh\n${errorOutput}\n\`\`\`` }
            );
        
        await processingMessage.edit({ embeds: [errorEmbed] });
    }
  },
};