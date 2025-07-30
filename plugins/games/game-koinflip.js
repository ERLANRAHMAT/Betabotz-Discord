const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const api = require('../../api_handler.js'); // <-- Mengimpor handler API

const activeGames = new Set();
const delay = ms => new Promise(res => setTimeout(res, ms));
const MAX_BET_AMOUNT = 1000000;

module.exports = {
  prefix: "coinflip",
  category: "game",
  aliases: ["tepok", "cf"],

  async execute(message, args, client) {
    const challenger = message.member;
    const opponent = message.mentions.members.first();

    if (!opponent) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB).setTitle("🪙 Bantuan Game Coinflip")
            .setDescription("Tantang temanmu dalam permainan lempar koin!")
            .addFields(
                { name: "Tanpa Taruhan", value: "`!coinflip @username`" },
                { name: "Dengan Taruhan", value: "`!coinflip @username <jumlah>`" }
            );
        return message.reply({ embeds: [helpEmbed] });
    }

    let betAmount = 0;
    if (args[1]) {
        betAmount = parseInt(args[1]);
        if (isNaN(betAmount) || betAmount < 0 || betAmount > MAX_BET_AMOUNT) {
            return message.reply(`❗ Jumlah taruhan tidak valid. Masukkan angka antara 1 - **${MAX_BET_AMOUNT.toLocaleString('id-ID')}**.`);
        }
    }

    if (opponent.id === challenger.id) return message.reply("❌ Kamu tidak bisa menantang dirimu sendiri!");
    if (opponent.user.bot) return message.reply("❌ Kamu tidak bisa menantang bot!");
    if (activeGames.has(challenger.id) || activeGames.has(opponent.id)) return message.reply("❗ Salah satu dari kalian sedang dalam permainan lain.");

    try {
        // Hanya cek uang jika ada taruhan
        if (betAmount > 0) {
            const challengerData = await api.getUser(challenger.id, challenger.user.username);
            const opponentData = await api.getUser(opponent.id, opponent.user.username);

            if (challengerData.money < betAmount) {
                return message.reply(`💰 Uangmu tidak cukup untuk taruhan **${betAmount.toLocaleString('id-ID')}**.`);
            }
            if (opponentData.money < betAmount) {
                return message.reply(`💰 **${opponent.user.username}** tidak punya cukup uang untuk tantangan ini.`);
            }
        }

        activeGames.add(challenger.id);
        activeGames.add(opponent.id);

        const betDescription = betAmount > 0 ? `**Taruhan:** 💰 **${betAmount.toLocaleString()}** Poin` : `Ini adalah permainan untuk bersenang-senang!`;
        const challengeEmbed = new EmbedBuilder()
            .setColor(0xFFA500).setTitle(`⚔️ Tantangan Coinflip dari ${challenger.user.username}!`)
            .setDescription(`${opponent}, kamu ditantang!\n\n${betDescription}\n\n**${challenger.user.username}** memilih sisi **Atas (🔼)**\n**Kamu** akan memilih sisi **Bawah (🔽)**\n\nApakah kamu menerima tantangan ini?`)
            .setFooter({ text: "Waktu respons: 30 detik." });
        const challengeButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept_cf').setLabel('Terima').setEmoji('✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('decline_cf').setLabel('Tolak').setEmoji('❌').setStyle(ButtonStyle.Danger)
        );
        const challengeMessage = await message.channel.send({ content: `${opponent}`, embeds: [challengeEmbed], components: [challengeButtons] });
        const collector = challengeMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== opponent.id) return interaction.reply({ content: 'Ini bukan tantangan untukmu!', ephemeral: true });
            
            if (interaction.customId === 'decline_cf') { /* ... (Logika tolak sama) ... */ }

            if (interaction.customId === 'accept_cf') {
                await interaction.update({ embeds: [challengeEmbed], components: [] });
                collector.stop();

                // Pola GET -> MODIFY -> POST untuk semua pemain
                let challengerData, opponentData;
                if (betAmount > 0) {
                    challengerData = await api.getUser(challenger.id, challenger.user.username);
                    opponentData = await api.getUser(opponent.id, opponent.user.username);
                    challengerData.money -= betAmount;
                    opponentData.money -= betAmount;
                }

                // Animasi
                const animationEmbed = new EmbedBuilder().setColor(0x3498DB);
                await challengeMessage.edit({ embeds: [animationEmbed.setDescription("Tangan disatukan... 🪙")] });
                await delay(1500);
                await challengeMessage.edit({ embeds: [animationEmbed.setDescription("Koin dilempar ke atas! 🪙")] });
                await delay(2000);

                // Hasil
                const sides = [{ name: 'Atas', emoji: '🔼' }, { name: 'Bawah', emoji: '🔽' }];
                const result = sides[Math.floor(Math.random() * sides.length)];
                const winner = (result.name === 'Atas') ? challenger : opponent;
                const winnerData = (result.name === 'Atas') ? challengerData : opponentData;
                
                if (betAmount > 0) {
                    winnerData.money += (betAmount * 2);
                    // Kirim update ke API
                    await api.updateUser(challenger.id, challengerData);
                    await api.updateUser(opponent.id, opponentData);
                }

                const resultEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71).setTitle(`🎉 Pemenangnya adalah ${winner.user.username}!`)
                    .setDescription(`Koin mendarat di sisi **${result.name} ${result.emoji}**!`);
                if (betAmount > 0) {
                    resultEmbed.addFields({ name: 'Pemenang Taruhan', value: `<@${winner.id}> memenangkan 💰 **${(betAmount * 2).toLocaleString()}** Poin!`, inline: false });
                }
                
                await challengeMessage.edit({ embeds: [resultEmbed] });
                activeGames.delete(challenger.id);
                activeGames.delete(opponent.id);
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                challengeMessage.edit({ content: "⏳ Tantangan kedaluwarsa.", embeds: [], components: [] });
                activeGames.delete(challenger.id);
                activeGames.delete(opponent.id);
            }
        });
    } catch (error) {
        console.error("[COINFLIP CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};