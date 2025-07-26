const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder } = require('discord.js');

// --- State Management ---
const gameInstances = new Map(); // Kunci: channelId, Value: WerewolfGame
const playerGameMap = new Map(); // Kunci: userId, Value: channelId

// --- Konfigurasi Game ---
const ROLES = {
    WEREWOLF: { id: 'werewolf', name: "Werewolf", emoji: "🐺", team: "Werewolf", description: "Setiap malam, kamu dan werewolf lain memilih satu korban untuk dimangsa." },
    SEER: { id: 'seer', name: "Seer", emoji: "👳", team: "Villager", description: "Setiap malam, kamu bisa memilih satu pemain untuk mengetahui perannya." },
    GUARDIAN: { id: 'guardian', name: "Guardian", emoji: "👼", team: "Villager", description: "Setiap malam, kamu bisa memilih satu pemain untuk dilindungi dari serangan Werewolf." },
    VILLAGER: { id: 'villager', name: "Villager", emoji: "👱‍♂️", team: "Villager", description: "Kamu adalah warga biasa. Gunakan intuisimu untuk menemukan werewolf saat diskusi siang hari." }
};
const PHASE_TIMINGS = { NIGHT: 45000, DAY: 60000, VOTING: 45000 };

// --- Kelas Logika Game Werewolf ---
class WerewolfGame {
    constructor(channel, initiator) {
        this.channel = channel;
        this.initiator = initiator;
        this.players = new Map();
        this.state = 'LOBBY';
        this.day = 0;
        this.message = null;
        this.timer = null;
        this.nightActions = {};
        this.votes = new Map();
    }

    addPlayer(member) {
        if (this.players.size >= 15) return { success: false, message: "Lobi sudah penuh." };
        if (this.players.has(member.id)) return { success: false, message: "Kamu sudah ada di lobi." };
        this.players.set(member.id, { member, role: null, isAlive: true, hasVoted: false, hasUsedNightAction: false });
        playerGameMap.set(member.id, this.channel.id);
        return { success: true };
    }

    assignRoles() {
        const playerArray = Array.from(this.players.values());
        const rolesToAssign = [];
        const playerCount = playerArray.length;
        if (playerCount >= 5) { rolesToAssign.push(ROLES.WEREWOLF, ROLES.SEER, ROLES.GUARDIAN); }
        if (playerCount >= 7) { rolesToAssign.push(ROLES.WEREWOLF); }
        if (playerCount >= 10) { rolesToAssign.push(ROLES.GUARDIAN); }
        if (playerCount >= 12) { rolesToAssign.push(ROLES.WEREWOLF); }
        while (rolesToAssign.length < playerCount) { rolesToAssign.push(ROLES.VILLAGER); }
        for (let i = playerArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rolesToAssign[i], rolesToAssign[j]] = [rolesToAssign[j], rolesToAssign[i]]; }
        playerArray.forEach((player, index) => { player.role = rolesToAssign[index]; });
    }

    async start() {
        this.state = 'STARTING';
        this.assignRoles();
        const roleList = Array.from(this.players.values()).map(p => `- ${p.member.user.username}`).join('\n');
        const startEmbed = new EmbedBuilder().setTitle("🐺 Permainan Werewolf Dimulai!").setDescription(`Peran telah dibagikan melalui DM. Periksalah DM dari bot!\n\n**Daftar Pemain:**\n${roleList}`).setFooter({ text: "Malam pertama akan segera tiba..." });
        await this.message.edit({ embeds: [startEmbed], components: [] });
        for (const [id, player] of this.players.entries()) {
            const roleEmbed = new EmbedBuilder().setTitle(`Peranmu: ${player.role.name} ${player.role.emoji}`).setDescription(player.role.description).setColor(player.role.team === "Werewolf" ? 0xE74C3C : 0x2ECC71);
            await player.member.send({ embeds: [roleEmbed] }).catch(() => { this.channel.send(`⚠️ Gagal mengirim DM ke ${player.member}. Pastikan DM-mu terbuka!`); });
        }
        this.timer = setTimeout(() => this.nextPhase(), 5000);
    }

    async nextPhase() {
        clearTimeout(this.timer);
        const winner = this.checkWinCondition();
        if (winner) return this.endGame(winner);

        if (this.state === 'STARTING' || this.state === 'VOTING' || this.state === 'DAY') await this.startNight();
        else if (this.state === 'NIGHT') await this.startDay();
        else if (this.state === 'DAY_RESULT') await this.startVoting();
    }

    async startNight() {
        this.day++;
        this.state = 'NIGHT';
        this.nightActions = { kills: new Map(), protects: new Map(), seers: new Map() };
        this.players.forEach(p => p.hasUsedNightAction = false);
        const nightEmbed = new EmbedBuilder().setColor(0x34495E).setTitle(`🌙 Malam Hari Ke-${this.day}`).setDescription(`Malam telah tiba. Semua warga tertidur lelap.\nPemain dengan peran khusus, periksalah DM untuk melakukan aksimu.\nWaktu malam: ${PHASE_TIMINGS.NIGHT / 1000} detik.`);
        await this.channel.send({ embeds: [nightEmbed] });
        for (const [id, player] of this.players.entries()) { if (player.isAlive) await this.sendNightActionDM(player); }
        this.timer = setTimeout(() => this.nextPhase(), PHASE_TIMINGS.NIGHT);
    }
    
    async sendNightActionDM(player) {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive && p.member.id !== player.member.id);
        if (alivePlayers.length === 0) return;
        const playerOptions = alivePlayers.map(p => ({ label: p.member.user.username, value: p.member.id }));
        let actionRow, content = "Pilih target untuk aksimu malam ini.";
        switch (player.role.id) {
            case 'werewolf': actionRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ww_action_kill').setPlaceholder('Pilih korban...').addOptions(playerOptions)); break;
            case 'seer': actionRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ww_action_seer').setPlaceholder('Pilih pemain...').addOptions(playerOptions)); break;
            case 'guardian': actionRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ww_action_protect').setPlaceholder('Pilih pemain...').addOptions(playerOptions.concat({ label: 'Tidak Melindungi Siapapun', value: 'no_protect' }))); break;
            default: return;
        }
        await player.member.send({ content, components: [actionRow] }).catch(() => {});
    }
    
    async handleInteraction(interaction) {
        const playerId = interaction.user.id;
        const player = this.players.get(playerId);
        if (!player || !player.isAlive) return interaction.reply({ content: "Kamu tidak bisa melakukan aksi.", ephemeral: true });

        await interaction.deferUpdate();
        const targetId = interaction.values[0];

        if (interaction.customId.startsWith('ww_action_')) {
            if (player.hasUsedNightAction) return interaction.followUp({ content: "Kamu sudah melakukan aksi malam ini.", ephemeral: true });
            const targetPlayer = this.players.get(targetId);
            switch (interaction.customId) {
                case 'ww_action_kill': this.nightActions.kills.set(playerId, targetId); await interaction.editReply({ content: `Kamu memilih untuk memangsa **${targetPlayer.member.user.username}**.`, components: [] }); break;
                case 'ww_action_seer': const targetRole = ROLES[targetPlayer.role.id]; await interaction.editReply({ content: `Hasil terawangan: **${targetPlayer.member.user.username}** adalah **${targetRole.name} ${targetRole.emoji}**.`, components: [] }); break;
                case 'ww_action_protect': if (targetId !== 'no_protect') { this.nightActions.protects.set(playerId, targetId); await interaction.editReply({ content: `Kamu melindungi **${targetPlayer.member.user.username}** malam ini.`, components: [] }); } else { await interaction.editReply({ content: `Kamu memilih untuk tidak melindungi siapapun.`, components: [] }); } break;
            }
            player.hasUsedNightAction = true;
        } else if (interaction.customId === 'ww_vote_select') {
            if (player.hasVoted) return interaction.followUp({ content: "Kamu sudah melakukan vote.", ephemeral: true });
            this.votes.set(playerId, targetId);
            player.hasVoted = true;
            await interaction.followUp({ content: `Kamu telah memilih untuk menggantung **${this.players.get(targetId).member.user.username}**.`, ephemeral: true });
            if (Array.from(this.players.values()).filter(p => p.isAlive).every(p => p.hasVoted)) {
                clearTimeout(this.timer);
                this.endVoting();
            }
        }
    }

    async startDay() {
        this.state = 'DAY';
        let description = "☀️ Matahari terbit.\n\n";
        const killVotes = Array.from(this.nightActions.kills.values());
        const protectedTarget = Array.from(this.nightActions.protects.values())[0];
        let victim = null;
        if (killVotes.length > 0) {
            const targetCounts = killVotes.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
            const mostVotedId = Object.keys(targetCounts).reduce((a, b) => targetCounts[a] > targetCounts[b] ? a : b);
            if (mostVotedId !== protectedTarget) {
                victim = this.players.get(mostVotedId);
                victim.isAlive = false;
                description += `Warga desa menemukan **${victim.member.user.username}** tewas mengenaskan. Dia ternyata adalah seorang **${victim.role.name} ${victim.role.emoji}**.`;
            } else { description += "Werewolf mencoba menyerang, namun seorang Guardian berhasil melindungi targetnya. Tidak ada yang tewas malam ini."; }
        } else { description += "Malam ini berlalu dengan damai, tidak ada serangan dari Werewolf."; }
        const dayEmbed = new EmbedBuilder().setColor(0xF1C40F).setTitle(`Pagi Hari Ke-${this.day}`).setDescription(description).setFooter({ text: `Diskusi dimulai selama ${PHASE_TIMINGS.DAY / 1000} detik.` });
        await this.channel.send({ embeds: [dayEmbed] });
        this.state = 'DAY_RESULT';
        this.timer = setTimeout(() => this.nextPhase(), PHASE_TIMINGS.DAY);
    }

    async startVoting() {
        this.state = 'VOTING';
        this.votes.clear();
        this.players.forEach(p => p.hasVoted = false);
        const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive);
        const playerOptions = alivePlayers.map(p => ({ label: p.member.user.username, value: p.member.id }));
        const voteEmbed = new EmbedBuilder().setColor(0xE67E22).setTitle("⚖️ Waktunya Voting!").setDescription(`Pilih pemain yang paling Anda curigai sebagai Werewolf untuk digantung.\nWaktu: ${PHASE_TIMINGS.VOTING / 1000} detik.`);
        const voteMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ww_vote_select').setPlaceholder('Pilih pemain...').addOptions(playerOptions));
        await this.channel.send({ embeds: [voteEmbed], components: [voteMenu] });
        this.timer = setTimeout(() => this.endVoting(), PHASE_TIMINGS.VOTING);
    }
    
    async endVoting() {
        if (this.state !== 'VOTING') return; // Mencegah double execution
        this.state = 'VOTING_RESULT';
        
        const voteCounts = Array.from(this.votes.values()).reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
        let maxVotes = 0, lynchedId = null, isTie = false;
        for (const id in voteCounts) {
            if (voteCounts[id] > maxVotes) { maxVotes = voteCounts[id]; lynchedId = id; isTie = false; }
            else if (voteCounts[id] === maxVotes) { isTie = true; }
        }

        let resultText;
        if (isTie || !lynchedId) {
            resultText = "Voting berakhir seri. Tidak ada yang digantung hari ini.";
        } else {
            const lynchedPlayer = this.players.get(lynchedId);
            lynchedPlayer.isAlive = false;
            resultText = `Warga desa memutuskan **${lynchedPlayer.member.user.username}** digantung.\nDia ternyata adalah **${lynchedPlayer.role.name} ${lynchedPlayer.role.emoji}**.`;
        }
        const voteResultEmbed = new EmbedBuilder().setColor(0x992D22).setTitle("Hasil Voting").setDescription(resultText);
        await this.channel.send({ embeds: [voteResultEmbed] });
        
        this.timer = setTimeout(() => this.nextPhase(), 5000);
    }
    
    checkWinCondition() {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive);
        const aliveWerewolves = alivePlayers.filter(p => p.role.team === 'Werewolf').length;
        const aliveVillagers = alivePlayers.filter(p => p.role.team === 'Villager').length;
        if (aliveWerewolves === 0) return 'Villager';
        if (aliveWerewolves >= aliveVillagers) return 'Werewolf';
        return null;
    }

    async endGame(winningTeam) {
        this.state = 'ENDED';
        clearTimeout(this.timer);
        const embed = new EmbedBuilder().setTitle(`Permainan Selesai! Tim ${winningTeam} Menang!`).setColor(winningTeam === 'Werewolf' ? 0xE74C3C : 0x2ECC71);
        const rolesList = Array.from(this.players.values()).map(p => `${p.role.emoji} **${p.member.user.username}** - ${p.role.name}`).join('\n');
        embed.setDescription(`**Peran Semua Pemain:**\n${rolesList}`);
        await this.channel.send({ embeds: [embed] });
        gameInstances.delete(this.channel.id);
        this.players.forEach(p => playerGameMap.delete(p.member.id));
    }
}

// --- Manajer Werewolf ---
const werewolfManager = {
    games: gameInstances, playerMap: playerGameMap,
    async handleInteraction(interaction) {
        const gameChannelId = playerGameMap.get(interaction.user.id);
        if (!gameChannelId) return;
        const game = gameInstances.get(gameChannelId);
        if (game) await game.handleInteraction(interaction);
    }
};

// --- Handler Perintah Discord ---
module.exports = {
  prefix: "werewolf",
  category: "game",
  aliases: ["ww"],
  async execute(message, args, client) {
    const subCommand = args[0]?.toLowerCase();
    const channelId = message.channel.id;
    const author = message.member;

    if (!subCommand || !['start', 'join', 'play', 'end'].includes(subCommand)) {
        const helpEmbed = new EmbedBuilder().setColor(0x3498DB).setTitle("🐺 Bantuan Game Werewolf").addFields(
            { name: "!ww start", value: "Membuat lobi permainan." }, { name: "!ww join", value: "Bergabung dengan lobi." },
            { name: "!ww play", value: "Memulai permainan (hanya pembuat lobi)." }, { name: "!ww end", value: "Membatalkan lobi." }
        );
        return message.reply({ embeds: [helpEmbed] });
    }

    if (subCommand === 'start') {
        if (gameInstances.has(channelId)) return message.reply("❗ Lobi sudah ada.");
        const game = new WerewolfGame(message.channel, author);
        const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🐺 Lobi Werewolf").setDescription(`**${author.user.username}** memulai lobi.\n(Min. 5, Maks. 15)`).addFields({ name: "Pemain (1/15)", value: `- ${author.user.username}` }).setFooter({ text: "Gunakan `!ww join`." });
        const lobbyMessage = await message.channel.send({ embeds: [embed] });
        game.message = lobbyMessage; game.addPlayer(author); gameInstances.set(channelId, game);
    } else if (subCommand === 'join') {
        const game = gameInstances.get(channelId);
        if (!game || game.state !== 'LOBBY') return message.reply("❌ Tidak ada lobi aktif.");
        const result = game.addPlayer(author);
        if (!result.success) return message.reply(`❗ ${result.message}`);
        await message.reply("✅ Berhasil bergabung!");
    } else if (subCommand === 'play') {
        const game = gameInstances.get(channelId);
        if (!game) return message.reply("❌ Tidak ada lobi.");
        if (game.initiator.id !== author.id) return message.reply("❌ Hanya pembuat lobi yang bisa memulai.");
        if (game.players.size < 5) return message.reply(`❌ Butuh minimal 5 pemain (saat ini ${game.players.size}).`);
        await game.start();
    } else if (subCommand === 'end') {
        const game = gameInstances.get(channelId);
        if (!game) return message.reply("❌ Tidak ada lobi.");
        if (game.initiator.id !== author.id) return message.reply("❌ Hanya pembuat lobi yang bisa membatalkan.");
        clearTimeout(game.timer);
        gameInstances.delete(channelId);
        game.players.forEach(p => playerGameMap.delete(p.member.id));
        await game.message.edit({ content: "Lobi dibatalkan.", embeds: [], components: [] });
        await message.reply("✅ Lobi permainan telah dibatalkan.");
    }
  },
  werewolfManager
};