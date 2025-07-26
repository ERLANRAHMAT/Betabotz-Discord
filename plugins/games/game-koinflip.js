const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { db, ensureUser } = require('../../database.js');

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

    // Validasi dasar: harus ada lawan yang di-mention
    if (!opponent) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("🪙 Bantuan Game Tepok Gambar (Coinflip)")
            .setDescription("Tantang temanmu dalam permainan lempar koin!")
            .addFields(
                { name: "Cara Bermain (Tanpa Taruhan)", value: "`!coinflip @username`" },
                { name: "Cara Bermain (Dengan Taruhan)", value: "`!coinflip @username <jumlah_taruhan>`" }
            );
        return message.reply({ embeds: [helpEmbed] });
    }

    // ==================== LOGIKA IF/ELSE UNTUK TARUHAN ====================
    let betAmount = 0; // Default taruhan adalah 0 (main untuk seru-seruan)
    if (args[1]) {
        betAmount = parseInt(args[1]);
        // Validasi jika taruhan diberikan tapi tidak valid
        if (isNaN(betAmount) || betAmount < 0 || betAmount > MAX_BET_AMOUNT) {
            return message.reply(`❗ Jumlah taruhan tidak valid. Harap masukkan angka antara 1 dan **${MAX_BET_AMOUNT.toLocaleString('id-ID')}** atau kosongkan untuk bermain tanpa taruhan.`);
        }
    }
    // =====================================================================

    if (opponent.id === challenger.id) return message.reply("❌ Kamu tidak bisa menantang dirimu sendiri!");
    if (opponent.user.bot) return message.reply("❌ Kamu tidak bisa menantang bot!");
    if (activeGames.has(challenger.id) || activeGames.has(opponent.id)) return message.reply("❗ Salah satu dari kalian sedang dalam permainan lain.");

    // Hanya cek uang jika ada taruhan
    if (betAmount > 0) {
        ensureUser(challenger.id, challenger.user.username);
        ensureUser(opponent.id, opponent.user.username);
        const challengerMoney = db.users[challenger.id].money || 0;
        const opponentMoney = db.users[opponent.id].money || 0;

        if (challengerMoney < betAmount) {
            return message.reply(`💰 Uangmu tidak cukup untuk taruhan **${betAmount.toLocaleString('id-ID')}**.`);
        }
        if (opponentMoney < betAmount) {
            return message.reply(`💰 **${opponent.user.username}** tidak punya cukup uang untuk tantangan ini.`);
        }
    }

    activeGames.add(challenger.id);
    activeGames.add(opponent.id);

    // Teks deskripsi dinamis berdasarkan taruhan
    const betDescription = betAmount > 0 
        ? `**Taruhan:** 💰 **${betAmount.toLocaleString()}** Poin`
        : `Ini adalah permainan untuk bersenang-senang!`;

    const challengeEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle(`⚔️ Tantangan Coinflip dari ${challenger.user.username}!`)
        .setDescription(
            `${opponent}, kamu ditantang untuk bermain Tepok Gambar!\n\n` +
            `${betDescription}\n\n` +
            `**${challenger.user.username}** memilih sisi **Atas (🔼)**\n` +
            `**Kamu** akan memilih sisi **Bawah (🔽)**\n\n` +
            `Apakah kamu menerima tantangan ini?`
        )
        .setFooter({ text: "Kamu punya waktu 30 detik untuk merespons." });

    const challengeButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_cf').setLabel('Terima').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('decline_cf').setLabel('Tolak').setEmoji('❌').setStyle(ButtonStyle.Danger)
    );

    const challengeMessage = await message.channel.send({ content: `${opponent}`, embeds: [challengeEmbed], components: [challengeButtons] });
    const collector = challengeMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async interaction => {
        if (interaction.user.id !== opponent.id) return interaction.reply({ content: 'Ini bukan tantangan untukmu!', ephemeral: true });
        
        if (interaction.customId === 'decline_cf') { /* ... (Sama seperti sebelumnya) ... */ }

        if (interaction.customId === 'accept_cf') {
            await interaction.update({ embeds: [challengeEmbed], components: [] });
            collector.stop();
            
            // Kurangi uang pemain HANYA jika ada taruhan
            if (betAmount > 0) {
                db.users[challenger.id].money -= betAmount;
                db.users[opponent.id].money -= betAmount;
            }

            const animationEmbed = new EmbedBuilder().setColor(0x3498DB);
            await challengeMessage.edit({ embeds: [animationEmbed.setDescription("Tangan disatukan... 🪙")] });
            await delay(1500);
            await challengeMessage.edit({ embeds: [animationEmbed.setDescription("Koin dilempar ke atas! 🪙")] });
            await delay(2000);

            const sides = [{ name: 'Atas', emoji: '🔼' }, { name: 'Bawah', emoji: '🔽' }];
            const result = sides[Math.floor(Math.random() * sides.length)];
            const winner = (result.name === 'Atas') ? challenger : opponent;
            
            // Tambahkan uang ke pemenang HANYA jika ada taruhan
            if (betAmount > 0) {
                db.users[winner.id].money += (betAmount * 2);
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle(`🎉 Pemenangnya adalah ${winner.user.username}!`)
                .setDescription(`Koin mendarat di sisi **${result.name} ${result.emoji}**!`)
                .addFields(
                    { name: `Pilihan ${challenger.user.username}`, value: "Atas 🔼", inline: true },
                    { name: `Pilihan ${opponent.user.username}`, value: "Bawah 🔽", inline: true }
                );
            
            // Tampilkan field pemenang taruhan HANYA jika ada taruhan
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
  },
};