const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const gameSessions = new Map();

class TicTacToeGame {
    constructor(playerX, playerO) {
        this.playerX = playerX;
        this.playerO = playerO;
        this.board = Array(9).fill(null);
        this.turn = 'X';
        this.winner = null;
        this.gameOver = false;
    }
    get currentPlayer() { return this.turn === 'X' ? this.playerX : this.playerO; }
    makeMove(position, player) {
        if (this.gameOver || player.id !== this.currentPlayer.id || this.board[position] !== null) return false;
        this.board[position] = this.turn;
        if (this.checkWin()) {
            this.winner = this.currentPlayer;
            this.gameOver = true;
        } else if (this.board.every(cell => cell !== null)) {
            this.gameOver = true;
        } else {
            this.turn = this.turn === 'X' ? 'O' : 'X';
        }
        return true;
    }
    checkWin() {
        const cond = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (const [a, b, c] of cond) {
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) return true;
        }
        return false;
    }
}
// --- Akhir Kelas Logika Game ---


// [DIPERBARUI] Fungsi ini sekarang hanya untuk merender tampilan
function createGameDisplay(game) {
    const status = game.gameOver
        ? game.winner ? `🎉 Pemenangnya adalah ${game.winner.user.username}!` : "⚖️ Permainan Berakhir Seri!"
        : `Giliran: **${game.currentPlayer.user.username} (${game.turn})**`;

    const embed = new EmbedBuilder()
        .setTitle("Tic Tac Toe")
        .setDescription(`**❌ (X)**: ${game.playerX.user.username}\n**⭕ (O)**: ${game.playerO.user.username}\n\n${status}`)
        .setColor(game.gameOver ? (game.winner ? 0x2ECC71 : 0xF1C40F) : 0x3498DB);

    const rows = [];
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const index = i * 3 + j;
            const cellValue = game.board[index];
            const button = new ButtonBuilder()
                .setCustomId(`ttt_move_${index}`)
                .setLabel(cellValue ? cellValue : `${index + 1}`)
                .setStyle(cellValue ? (cellValue === 'X' ? ButtonStyle.Danger : ButtonStyle.Success) : ButtonStyle.Secondary)
                .setDisabled(cellValue !== null || game.gameOver);
            row.addComponents(button);
        }
        rows.push(row);
    }
    return { embeds: [embed], components: rows };
}


// --- Handler Perintah ---
module.exports = {
  prefix: "tictactoe",
  category: "game",
  aliases: ["ttt"],

  async execute(message, args, client) {
    const challenger = message.member;
    const opponent = message.mentions.members.first();

    if (!opponent) return message.reply("❗ Kamu harus me-mention pemain untuk ditantang!\nContoh: `!ttt @username`");
    if (opponent.id === challenger.id) return message.reply("❌ Kamu tidak bisa menantang dirimu sendiri!");
    if (opponent.user.bot) return message.reply("❌ Kamu tidak bisa menantang bot!");
    if (gameSessions.has(message.channel.id)) return message.reply("❗ Sudah ada permainan Tic Tac Toe di channel ini.");

    // Fase Tantangan
    const challengeEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle(`⚔️ Tantangan Tic Tac Toe dari ${challenger.user.username}!`)
        .setDescription(`${opponent}, kamu ditantang untuk bermain. Apakah kamu menerima?`);

    const challengeButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_ttt').setLabel('Terima').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('decline_ttt').setLabel('Tolak').setStyle(ButtonStyle.Danger)
    );
    const challengeMessage = await message.channel.send({ content: `${opponent}`, embeds: [challengeEmbed], components: [challengeButtons] });
    const challengeCollector = challengeMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    challengeCollector.on('collect', async interaction => {
        if (interaction.user.id !== opponent.id) return interaction.reply({ content: 'Ini bukan tantangan untukmu!', ephemeral: true });
        
        await interaction.deferUpdate();
        if (interaction.customId === 'decline_ttt') {
            challengeCollector.stop('declined');
            return challengeMessage.edit({ content: `😥 Tantangan ditolak oleh ${opponent.user.username}.`, embeds: [], components: [] });
        }

        if (interaction.customId === 'accept_ttt') {
            challengeCollector.stop('accepted');
            const game = new TicTacToeGame(challenger, opponent);
            gameSessions.set(message.channel.id, game);
            
            const display = createGameDisplay(game);
            await challengeMessage.edit({ content: null, embeds: display.embeds, components: display.components });

            // [DIPERBARUI] Collector untuk gerakan permainan dibuat di sini, HANYA SEKALI.
            const moveCollector = challengeMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            moveCollector.on('collect', async moveInteraction => {
                const currentGame = gameSessions.get(message.channel.id);
                if (!currentGame) return moveCollector.stop();
                if (moveInteraction.user.id !== currentGame.currentPlayer.id) {
                    return moveInteraction.reply({ content: 'Bukan giliranmu!', ephemeral: true });
                }
                
                await moveInteraction.deferUpdate();
                const position = parseInt(moveInteraction.customId.split('_')[2]);
                currentGame.makeMove(position, moveInteraction.member);

                const newDisplay = createGameDisplay(currentGame);
                await challengeMessage.edit({ embeds: newDisplay.embeds, components: newDisplay.components });

                if (currentGame.gameOver) {
                    moveCollector.stop('game_over');
                    gameSessions.delete(message.channel.id);
                } else {
                    moveCollector.resetTimer();
                }
            });

            moveCollector.on('end', (collected, reason) => {
                const currentGame = gameSessions.get(message.channel.id);
                if (reason === 'time' && currentGame) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle("⏰ Waktu Habis!")
                        .setDescription(`Permainan dibatalkan karena ${currentGame.currentPlayer.user.username} tidak bergerak.`);
                    challengeMessage.edit({ embeds: [timeoutEmbed], components: [] });
                    gameSessions.delete(message.channel.id);
                }
            });
        }
    });

    challengeCollector.on('end', (collected, reason) => {
        if (reason === 'time') {
            challengeMessage.edit({ content: "⏳ Tantangan tidak direspons dan telah kedaluwarsa.", embeds: [], components: [] });
        }
    });
  },
};