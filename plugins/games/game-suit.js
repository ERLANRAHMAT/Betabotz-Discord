const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

// --- PERBAIKAN 1: Konsistensi Data ---
// Nama properti 'name' diubah menjadi huruf kecil semua untuk menghindari error perbandingan.
const choices = {
    batu: { name: 'batu', emoji: '✊', beats: 'gunting' },
    kertas: { name: 'kertas', emoji: '✋', beats: 'batu' },
    gunting: { name: 'gunting', emoji: '✌️', beats: 'kertas' }
};

module.exports = {
  prefix: "suit",
  category: "game",
  aliases: ["rps"],

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message, args, client) {
    const challenger = message.member;
    const opponent = message.mentions.members.first();

    if (!opponent) {
        return message.reply("❗ Kamu harus me-mention seorang pemain untuk ditantang!\nContoh: `!suit @username`");
    }
    if (opponent.id === challenger.id) {
        return message.reply("❌ Kamu tidak bisa menantang dirimu sendiri!");
    }
    if (opponent.user.bot) {
        return message.reply("❌ Kamu tidak bisa menantang bot!");
    }

    // Fase Tantangan
    const challengeEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle(`⚔️ Tantangan Suit dari ${challenger.user.username}!`)
        .setDescription(`${opponent}, kamu ditantang untuk bermain Gunting Batu Kertas. Apakah kamu menerima?`)
        .setFooter({ text: "Kamu punya waktu 30 detik untuk merespons." });

    const challengeButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_challenge').setLabel('Terima').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('decline_challenge').setLabel('Tolak').setEmoji('❌').setStyle(ButtonStyle.Danger)
    );

    const challengeMessage = await message.channel.send({
        content: `${opponent}`,
        embeds: [challengeEmbed],
        components: [challengeButtons]
    });

    const challengeCollector = challengeMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000 
    });

    challengeCollector.on('collect', async interaction => {
        if (interaction.user.id !== opponent.id) {
            return interaction.reply({ content: 'Ini bukan tantangan untukmu!', ephemeral: true });
        }

        if (interaction.customId === 'decline_challenge') {
            await interaction.update({ content: `😥 Tantangan ditolak oleh ${opponent.user.username}.`, embeds: [], components: [] });
            return challengeCollector.stop();
        }

        if (interaction.customId === 'accept_challenge') {
            challengeCollector.stop();

            const gameEmbed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle("🔥 Permainan Dimulai!")
                .setDescription(`**${challenger.user.username}** vs **${opponent.user.username}**\n\nSilakan pilih Gunting, Batu, atau Kertas! Pilihanmu akan dirahasiakan.`);

            const gameButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('batu').setLabel('Batu').setEmoji('✊').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('kertas').setLabel('Kertas').setEmoji('✋').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('gunting').setLabel('Gunting').setEmoji('✌️').setStyle(ButtonStyle.Primary)
            );
            
            await interaction.update({ embeds: [gameEmbed], components: [gameButtons] });
            startGame(challengeMessage, challenger, opponent);
        }
    });

    challengeCollector.on('end', (collected, reason) => {
        if (reason === 'time') {
            challengeMessage.edit({ content: "⏳ Tantangan tidak direspons dan telah kedaluwarsa.", embeds: [], components: [] });
        }
    });
  },
};

/**
 * Fungsi untuk memulai logika permainan
 */
function startGame(gameMessage, player1, player2) {
    const gameCollector = gameMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    const playerChoices = { [player1.id]: null, [player2.id]: null };

    gameCollector.on('collect', async interaction => {
        if (interaction.user.id !== player1.id && interaction.user.id !== player2.id) {
            return interaction.reply({ content: 'Kamu tidak sedang bermain di sesi ini.', ephemeral: true });
        }

        const choice = interaction.customId;
        if (playerChoices[interaction.user.id]) {
            return interaction.reply({ content: `Kamu sudah memilih **${choices[playerChoices[interaction.user.id]].name}**!`, ephemeral: true });
        }

        playerChoices[interaction.user.id] = choice;
        await interaction.reply({ content: `Kamu memilih **${choices[choice].name}**! Menunggu lawanmu...`, ephemeral: true });

        if (playerChoices[player1.id] && playerChoices[player2.id]) {
            gameCollector.stop();
            
            const p1Choice = choices[playerChoices[player1.id]];
            const p2Choice = choices[playerChoices[player2.id]];
            let resultEmbed;

            // --- PERBAIKAN 2: Logika Pemenang ---
            // Logika ini sekarang sudah benar setelah properti 'name' diubah menjadi huruf kecil.
            if (p1Choice.name === p2Choice.name) {
                // Seri
                resultEmbed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setTitle("⚖️ Hasilnya Seri!")
                    .addFields({ name: 'Hasil Akhir', value: `${player1.user.username}: ${p1Choice.emoji}\n${player2.user.username}: ${p2Choice.emoji}` });
            } else if (p1Choice.beats === p2Choice.name) {
                // Player 1 Menang
                resultEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle(`🎉 Pemenangnya adalah ${player1.user.username}!`)
                    .addFields({ name: 'Hasil Akhir', value: `${player1.user.username}: ${p1Choice.emoji}\n${player2.user.username}: ${p2Choice.emoji}` });
            } else {
                // Player 2 Menang
                resultEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle(`🎉 Pemenangnya adalah ${player2.user.username}!`)
                    .addFields({ name: 'Hasil Akhir', value: `${player1.user.username}: ${p1Choice.emoji}\n${player2.user.username}: ${p2Choice.emoji}` });
            }
            
            resultEmbed.setTimestamp();
            await gameMessage.edit({ embeds: [resultEmbed], components: [] });
        }
    });

    gameCollector.on('end', (collected, reason) => {
        if (reason === 'time') {
            gameMessage.edit({ content: "⏳ Permainan dibatalkan karena salah satu pemain tidak memilih dalam waktu 60 detik.", embeds: [], components: [] });
        }
    });
}