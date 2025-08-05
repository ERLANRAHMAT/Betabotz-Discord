const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const api = require('../../api_handler.js'); // <-- Mengimpor handler API

const gameLobbies = new Map();
const MAX_BET_AMOUNT = 1000000;
const MAX_PLAYERS = 10;

// --- Kelas & Fungsi Helper untuk Kartu (Tetap Sama) ---
const cardRankValues = { 'A': 14, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };

class Deck {
    constructor() {
        this.suits = ['♠️', '♥️', '♦️', '♣️'];
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        this.deck = [];
        this.reset();
        this.shuffle();
    }
    reset() { this.deck = []; for (const suit of this.suits) for (const rank of this.ranks) this.deck.push({ rank, suit, value: this.getCardValue(rank) }); }
    shuffle() { for (let i = this.deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]; } }
    deal(numCards) { return this.deck.splice(0, numCards); }
    getCardValue(rank) {
        if (rank === 'A') return 1;
        if (rank === '10') return 0;
        return parseInt(rank);
    }
}

function getPairValue(card1, card2) { return (card1.value + card2.value) % 10; }

function calculateBestHand(hand) {
    const kicker = Math.max(...hand.map(c => cardRankValues[c.rank]));
    if (hand.every(card => card.rank === hand[0].rank)) return { rank: 100, name: `Empat Kartu Kembar (${hand[0].rank})`, kicker };
    const totalValue = hand.reduce((sum, card) => sum + card.value, 0);
    if (totalValue <= 9) return { rank: 90, name: `Murni Kecil (Total ${totalValue})`, kicker };
    const pairings = [[[hand[0], hand[1]], [hand[2], hand[3]]],[[hand[0], hand[2]], [hand[1], hand[3]]],[[hand[0], hand[3]], [hand[1], hand[2]]]];
    let bestPairing = null, bestRank = -1;
    for (const p of pairings) {
        const val1 = getPairValue(p[0][0], p[0][1]), val2 = getPairValue(p[1][0], p[1][1]);
        const high = Math.max(val1, val2), low = Math.min(val1, val2);
        const rank = high * 10 + low;
        if (rank > bestRank) { bestRank = rank; bestPairing = { high, low }; }
    }
    let handName = `Tangan ${bestPairing.high}-${bestPairing.low}`;
    if (bestPairing.high === 9) handName = bestPairing.low === 9 ? "Qiu Qiu" : `Qiu ${bestPairing.low}`;
    return { rank: bestRank, name: handName, kicker };
}
// --- Akhir Helper ---

// --- Handler Perintah ---
module.exports = {
  prefix: "qiu",
  category: "game",
  aliases: ["kiu", "qiuqiu", "q"],

  async execute(message, args, client) {
    const subCommand = args[0]?.toLowerCase();
    const channelId = message.channel.id;
    const author = message.member;

    // Logika bantuan dipindahkan ke akhir untuk struktur yang lebih bersih
    if (subCommand === 'start') {
        if (gameLobbies.has(channelId)) return message.reply("❗ Sudah ada lobi aktif di channel ini.");
        const betAmount = parseInt(args[1]);
        if (isNaN(betAmount) || betAmount <= 0 || betAmount > MAX_BET_AMOUNT) {
            return message.reply(`❗ Jumlah taruhan tidak valid. Masukkan angka antara 1 - **${MAX_BET_AMOUNT.toLocaleString('id-ID')}**.`);
        }
        
        try {
            // GET: Cek uang pembuat lobi
            const authorData = await api.getUser(author.id, author.user.username);
            if (authorData.money < betAmount) {
                return message.reply(`💰 Uangmu tidak cukup. Uangmu saat ini: **${authorData.money.toLocaleString('id-ID')}**.`);
            }

            const lobbyEmbed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🃏 Lobi Qiu Qiu Telah Dibuat!").setDescription(`**${author.user.username}** memulai lobi (Maks. ${MAX_PLAYERS} orang).`).addFields({ name: `Pemain (1/${MAX_PLAYERS})`, value: `- ${author.user.username}` }).setFooter({ text: `Taruhan: ${betAmount.toLocaleString('id-ID')} Poin | Ketik !qiu join` });
            const lobbyMessage = await message.channel.send({ embeds: [lobbyEmbed] });
            gameLobbies.set(channelId, { players: [author], initiator: author.id, status: 'waiting', message: lobbyMessage, bet: betAmount });
        } catch (e) {
            return message.reply(`❌ Terjadi kesalahan saat memeriksa data Anda: ${e.message}`);
        }
    }
    else if (subCommand === 'join') {
        const lobby = gameLobbies.get(channelId);
        if (!lobby) return message.reply("❌ Tidak ada lobi aktif.");
        if (lobby.status !== 'waiting') return message.reply("❌ Permainan sudah dimulai.");
        if (lobby.players.length >= MAX_PLAYERS) return message.reply("❌ Lobi sudah penuh.");
        if (lobby.players.some(p => p.id === author.id)) return message.reply("❗ Kamu sudah di dalam lobi.");
        
        try {
            // GET: Cek uang pemain yang bergabung
            const authorData = await api.getUser(author.id, author.user.username);
            if (authorData.money < lobby.bet) {
                return message.reply(`💰 Uangmu tidak cukup untuk ikut taruhan **${lobby.bet.toLocaleString('id-ID')}**. Uangmu: **${authorData.money.toLocaleString('id-ID')}**.`);
            }

            lobby.players.push(author);
            const playerNames = lobby.players.map(p => `- ${p.user.username}`).join('\n');
            const updatedEmbed = EmbedBuilder.from(lobby.message.embeds[0]).setFields({ name: `Pemain (${lobby.players.length}/${MAX_PLAYERS})`, value: playerNames });
            await lobby.message.edit({ embeds: [updatedEmbed] });
            await message.reply(`✅ Kamu berhasil bergabung (Taruhan: **${lobby.bet.toLocaleString('id-ID')}** Poin)!`);
        } catch (e) {
            return message.reply(`❌ Terjadi kesalahan saat memeriksa data Anda: ${e.message}`);
        }
    }
    else if (subCommand === 'deal') {
        const lobby = gameLobbies.get(channelId);
        if (!lobby) return message.reply("❌ Tidak ada lobi untuk dimulai.");
        if (lobby.initiator !== author.id) return message.reply("❌ Hanya pembuat lobi yang bisa memulai.");
        if (lobby.players.length < 2) return message.reply("❌ Butuh minimal 2 pemain.");

        lobby.status = 'playing';
        const deck = new Deck();
        const playerResults = [];
        lobby.players.forEach(player => {
            const hand = deck.deal(4);
            const bestHand = calculateBestHand(hand);
            playerResults.push({ member: player, hand, bestHand });
        });
        playerResults.sort((a, b) => {
            const rankDiff = b.bestHand.rank - a.bestHand.rank;
            if (rankDiff !== 0) return rankDiff;
            return b.bestHand.kicker - a.bestHand.kicker;
        });

        const winner = playerResults[0];
        const betAmount = lobby.bet;
        const totalPot = betAmount * lobby.players.length;
        const winAmount = totalPot - betAmount;

        // --- Pola GET -> MODIFY -> POST untuk semua pemain ---
        try {
            for (const p of lobby.players) {
                const playerData = await api.getUser(p.id, p.user.username);
                if (p.id === winner.member.id) {
                    playerData.money += winAmount;
                } else {
                    playerData.money = Math.max(0, playerData.money - betAmount);
                }
                await api.updateUser(p.id, playerData);
            }
        } catch (e) {
            console.error("[QIU DEAL ERROR] Gagal update money:", e);
            message.channel.send("⚠️ Terjadi kesalahan saat memperbarui uang pemain di database.");
        }
        
        const playerList = lobby.players.map(p => p.user.username).join(', ');
        await lobby.message.edit({ content: `Permainan Qiu Qiu antara **${playerList}** telah selesai!`, embeds: [], components: [] });

        const resultEmbed = new EmbedBuilder()
            .setColor(0x2ECC71).setTitle(`🎉 Pemenangnya Adalah ${winner.member.user.username}!`)
            .setDescription(`Dengan tangan **${winner.bestHand.name}**, dia memenangkan pot sebesar 💰 **${totalPot.toLocaleString('id-ID')}** Money!`);
        playerResults.forEach((result, index) => {
            const handString = result.hand.map(c => c.rank + c.suit).join(' ');
            const outcome = result.member.id === winner.member.id ? `(+${winAmount.toLocaleString('id-ID')})` : `(-${betAmount.toLocaleString('id-ID')})`;
            resultEmbed.addFields({
                name: `${index + 1}. ${result.member.user.username} (${outcome})`,
                value: `**Kartu:** ${handString}\n**Hasil:** ${result.bestHand.name}`
            });
        });
        await message.channel.send({ embeds: [resultEmbed] });
        gameLobbies.delete(channelId);
    }
    else if (subCommand === 'end' || subCommand === 'leave') {
        // ... (Logika end/leave tetap sama)
    }
    else {
        // Tampilkan bantuan jika perintah tidak dikenal
        const helpEmbed = new EmbedBuilder().setColor(0x3498DB).setTitle("🃏 Bantuan Game Qiu Qiu").setDescription(`Permainan kartu multipemain (2-${MAX_PLAYERS} orang).`).addFields(
            { name: "!qiu start <taruhan>", value: "Membuat lobi permainan." },
            { name: "!qiu join", value: "Bergabung dengan lobi." },
            { name: "!qiu deal", value: "Memulai permainan." },
            { name: "!qiu leave", value: "Keluar dari lobi." },
            { name: "!qiu end", value: "Membatalkan lobi." }
        );
        return message.reply({ embeds: [helpEmbed] });
    }
  }
};