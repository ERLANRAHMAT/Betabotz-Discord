const { EmbedBuilder } = require('discord.js');
// [DIPERBARUI] Mengimpor handler API Anda, bukan database lokal
const api = require('../../api_handler.js'); 

module.exports = {
  prefix: "balance",
  category: "economy",
  aliases: ["bal", "money", "limit", "diamond"],
  
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    // Tentukan target, jika tidak ada mention, targetnya adalah diri sendiri
    const targetUser = message.mentions.users.first() || message.author;
    const processingMsg = await message.reply(`🔍 Mengambil data dompet untuk **${targetUser.username}**...`);

    try {
        // 1. GET: Ambil data user terbaru dari API
        const userData = await api.getUser(targetUser.id, targetUser.username);

        // 2. Siapkan data dengan nilai default 0 untuk keamanan
        const money = userData.money || 0;
        const limit = userData.limit || 0;
        const diamond = userData.diamond || 0; // Sesuaikan 'diamond' dengan nama properti di API Anda

        // 3. Buat embed dengan data yang diterima
        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle(`🏦 Dompet Milik ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '💰 Uang (Money)', value: `Rp ${money.toLocaleString('id-ID')}`, inline: true },
                { name: '🎟️ Limit', value: `${limit.toLocaleString('id-ID')}`, inline: true },
                { name: '💎 diamond', value: `${diamond.toLocaleString('id-ID')}`, inline: true }
            )
            .setTimestamp();

        // 4. Edit pesan tunggu dengan hasil akhir
        await processingMsg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        // 5. Tangani jika API gagal
        console.error("[BALANCE CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan saat mengambil data dompet: ${error.message}`);
    }
  },
};