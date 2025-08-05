const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder } = require('discord.js');

// --- State Management ---
const gameInstances = new Map();
const playerGameMap = new Map();

// --- Konfigurasi Game ---
const ROLES = {
    WEREWOLF: { id: 'werewolf', name: "Werewolf", emoji: "🐺", team: "Werewolf", description: "Setiap malam, pilih satu korban untuk dimangsa." },
    SEER: { id: 'seer', name: "Seer", emoji: "👳", team: "Villager", description: "Setiap malam, pilih satu pemain untuk mengetahui perannya." },
    GUARDIAN: { id: 'guardian', name: "Guardian", emoji: "👼", team: "Villager", description: "Setiap malam, pilih satu pemain untuk dilindungi." },
    VILLAGER: { id: 'villager', name: "Villager", emoji: "👱‍♂️", team: "Villager", description: "Gunakan intuisimu untuk menemukan werewolf." },
    JOKER: { id: 'joker', name: "Joker", emoji: "🃏", team: "Jester", description: "Menang jika berhasil membuat warga menggantungmu saat voting." },
    SHOOTER: { id: 'shooter', name: "Shooter", emoji: "🔫", team: "Villager", description: "Memiliki 1 peluru. Pada malam hari, kamu bisa menembak satu pemain." },
    SORCERER: { id: 'sorcerer', name: "Sorcerer", emoji: "🔮", team: "Werewolf", description: "Penerawang untuk tim Werewolf." },
    ANGEL: { id: 'angel', name: "Angel", emoji: "🕊️", team: "Villager", description: "Kamu bisa menghidupkan kembali pemain yang baru saja mati. Kamu memiliki 2 kesempatan." }
};
const PHASE_TIMINGS = { NIGHT: 45000, DAY: 60000, VOTING: 45000, REVIVE: 30000 };

class WerewolfGame {
    constructor(channel, initiator) {
        this.channel = channel; this.initiator = initiator;
        this.players = new Map(); this.state = 'LOBBY';
        this.day = 0; this.message = null; this.timer = null;
        this.nightActions = {}; this.votes = new Map();
    }
    addPlayer(member) {
        if (this.players.size >= 15) return { success: false, message: "Lobi penuh." };
        if (this.players.has(member.id)) return { success: false, message: "Kamu sudah di lobi." };
        this.players.set(member.id, { member, role: null, isAlive: true, extras: {} });
        playerGameMap.set(member.id, this.channel.id);
        return { success: true };
    }
    async updateLobbyMessage() {
        const playerNames = Array.from(this.players.values()).map(p => `- ${p.member.user.username}`).join('\n');
        const updatedEmbed = EmbedBuilder.from(this.message.embeds[0]).setFields({ name: `Pemain (${this.players.size}/15)`, value: playerNames });
        await this.message.edit({ embeds: [updatedEmbed] });
    }
    assignRoles() {
        const pArr = Array.from(this.players.values()); const rArr = []; const pCount = pArr.length;
        const roleCounts = {
            5: [1, 1, 1, 0, 0, 0, 0], 6: [2, 1, 1, 0, 0, 0, 0], 7: [2, 1, 1, 0, 1, 0, 0],
            8: [2, 1, 1, 1, 1, 0, 0], 9: [2, 1, 1, 1, 1, 1, 0], 10: [3, 1, 1, 1, 1, 1, 1], // Angel masuk di 10 pemain
            11: [3, 1, 2, 1, 1, 1, 1], 12: [3, 1, 2, 1, 1, 1, 1],
            13: [3, 2, 2, 1, 1, 1, 1], 14: [4, 2, 2, 1, 1, 1, 1], 15: [4, 2, 2, 1, 1, 1, 1],
        };
        // [WW, Seer, Guard, Sorc, Joker, Shoot, Angel]
        const counts = roleCounts[pCount] || roleCounts[5];
        for(let i=0; i<counts[0]; i++) rArr.push(ROLES.WEREWOLF); for(let i=0; i<counts[1]; i++) rArr.push(ROLES.SEER);
        for(let i=0; i<counts[2]; i++) rArr.push(ROLES.GUARDIAN); for(let i=0; i<counts[3]; i++) rArr.push(ROLES.SORCERER);
        for(let i=0; i<counts[4]; i++) rArr.push(ROLES.JOKER); for(let i=0; i<counts[5]; i++) rArr.push(ROLES.SHOOTER);
        for(let i=0; i<counts[6]; i++) rArr.push(ROLES.ANGEL);
        while (rArr.length < pCount) { rArr.push(ROLES.VILLAGER); }
        for (let i=pArr.length - 1; i > 0; i--) { const j=Math.floor(Math.random() * (i + 1)); [rArr[i], rArr[j]]=[rArr[j], rArr[i]]; }
        pArr.forEach((p, i) => {
            p.role = rArr[i];
            if (p.role.id === 'shooter') p.extras.bullets = 1;
            if (p.role.id === 'angel') p.extras.revives = 2; // Beri 2 kesempatan revive
        });
    }
    async start() {
        this.state = 'STARTING'; this.assignRoles();
        const rList = Array.from(this.players.values()).map(p => `- ${p.member.user.username}`).join('\n');
        const embed = new EmbedBuilder().setTitle("🐺 Permainan Dimulai!").setDescription(`Peran telah dibagikan via DM.\n\n**Pemain:**\n${rList}`).setFooter({ text: "Malam akan tiba..." });
        await this.message.edit({ embeds: [embed], components: [] });
        for (const [id, p] of this.players.entries()) {
            const embed = new EmbedBuilder().setTitle(`Peranmu: ${p.role.name} ${p.role.emoji}`).setDescription(p.role.description).setColor(p.role.team === "Werewolf" ? 0xE74C3C : 0x2ECC71);
            await p.member.send({ embeds: [embed] }).catch(() => { this.channel.send(`⚠️ Gagal DM ${p.member}.`); });
        }
        this.timer = setTimeout(() => this.nextPhase(), 5000);
    }
    async nextPhase() {
        clearTimeout(this.timer); const winner = this.checkWinCondition();
        if (winner) return this.endGame(winner);
        if (['STARTING', 'VOTING_RESULT'].includes(this.state)) await this.startNight();
        else if (this.state === 'NIGHT') await this.startDay();
        else if (this.state === 'DAY') await this.startVoting();
    }
    async startNight() {
        this.day++; this.state = 'NIGHT';
        this.nightActions = { kills: new Map(), protects: new Map() };
        this.players.forEach(p => p.hasUsedNightAction = false);
        const embed = new EmbedBuilder().setColor(0x34495E).setTitle(`🌙 Malam Hari Ke-${this.day}`).setDescription(`Malam telah tiba. Peran khusus, cek DM untuk beraksi.\nWaktu: ${PHASE_TIMINGS.NIGHT / 1000}d.`);
        await this.channel.send({ embeds: [embed] });
        for (const [id, p] of this.players.entries()) { if (p.isAlive) await this.sendNightActionDM(p); }
        this.timer = setTimeout(() => this.nextPhase(), PHASE_TIMINGS.NIGHT);
    }
    async sendNightActionDM(player) {
        const alive = Array.from(this.players.values()).filter(p => p.isAlive && p.member.id !== player.member.id);
        if (alive.length === 0 && player.role.id !== 'guardian') return;
        const opts = alive.map(p => ({ label: p.member.user.username, value: p.member.id }));
        let row, content = "Pilih target aksimu.", customId;
        switch (player.role.id) {
            case 'werewolf': customId = 'ww_action_kill'; break;
            case 'seer': customId = 'ww_action_seer'; break;
            case 'guardian': customId = 'ww_action_protect'; opts.push({ label: 'Tidak Melindungi', value: 'no_protect' }); break;
            default: return;
        }
        row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder('Pilih pemain...').addOptions(opts));
        try {
            const dm = await player.member.send({ content, components: [row] });
            const collector = dm.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: PHASE_TIMINGS.NIGHT - 2000 });
            collector.on('collect', async i => {
                const game = gameInstances.get(playerGameMap.get(i.user.id));
                if (!game || game.players.get(i.user.id).hasUsedNightAction) return;
                await i.deferUpdate();
                const targetId = i.values[0]; 
                if (targetId === 'no_protect') {
                    await i.editReply({ content: `Kamu memilih tidak melindungi siapapun.`, components: [] });
                } else {
                    const targetPlayer = this.players.get(targetId);
                    if (!targetPlayer) return i.editReply({ content: `Target tidak valid.`, components: [] });
                    switch (i.customId) {
                        case 'ww_action_kill': game.nightActions.kills.set(i.user.id, targetId); await i.editReply({ content: `Kamu memilih memangsa **${targetPlayer.member.user.username}**.`, components: [] }); break;
                        case 'ww_action_seer': const role = targetPlayer.role; await i.editReply({ content: `Hasil terawangan: **${targetPlayer.member.user.username}** adalah **${role.name} ${role.emoji}**.`, components: [] }); break;
                        case 'ww_action_protect': game.nightActions.protects.set(i.user.id, targetId); await i.editReply({ content: `Kamu melindungi **${targetPlayer.member.user.username}**.`, components: [] }); break;
                    }
                }
                game.players.get(i.user.id).hasUsedNightAction = true; 
                collector.stop();
            });
        } catch (e) {}
    }
    async startDay() {
        this.state = 'DAY'; let desc = "☀️ Matahari terbit.\n\n";
        const killVotes = Array.from(this.nightActions.kills.values());
        const protectedTarget = Array.from(this.nightActions.protects.values())[0];
        let victim = null;
        if (killVotes.length > 0) {
            const counts = killVotes.reduce((a, v) => { a[v] = (a[v] || 0) + 1; return a; }, {});
            const mostVotedId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            if (mostVotedId && mostVotedId !== protectedTarget) {
                victim = this.players.get(mostVotedId);
                victim.isAlive = false;
                desc += `Warga menemukan **${victim.member.user.username}** tewas. Dia adalah **${victim.role.name} ${victim.role.emoji}**.`;
            } else { desc += "Serangan Werewolf digagalkan oleh Guardian! Tidak ada yang tewas."; }
        } else { desc += "Malam ini berlalu dengan damai."; }
        
        const dayEmbed = new EmbedBuilder().setColor(0xF1C40F).setTitle(`Pagi Hari Ke-${this.day}`).setDescription(desc);
        await this.channel.send({ embeds: [dayEmbed] });

        if (victim) {
            const wasRevived = await this.handleRevivePhase(victim);
            if (wasRevived) victim.isAlive = true; 
        }
        
        this.timer = setTimeout(() => this.nextPhase(), PHASE_TIMINGS.DAY);
    }
    async startVoting() {
        this.state = 'VOTING'; this.votes.clear();
        this.players.forEach(p => p.hasVoted = false);
        const alive = Array.from(this.players.values()).filter(p => p.isAlive);
        if(alive.length < 1) return this.nextPhase();
        const opts = alive.map(p => ({ label: p.member.user.username, value: p.member.id }));
        const embed = new EmbedBuilder().setColor(0xE67E22).setTitle("⚖️ Waktunya Voting!").setDescription(`Pilih pemain untuk digantung.\nWaktu: ${PHASE_TIMINGS.VOTING / 1000}d.`);
        const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ww_vote_select').setPlaceholder('Pilih pemain...').addOptions(opts));
        const voteMsg = await this.channel.send({ embeds: [embed], components: [menu] });
        const collector = voteMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: PHASE_TIMINGS.VOTING });
        collector.on('collect', async i => {
            const game = gameInstances.get(i.channelId); if(!game) return;
            const voter = game.players.get(i.user.id);
            if(!voter || !voter.isAlive || voter.hasVoted) return i.reply({content: "Kamu tidak bisa vote.", ephemeral: true});
            await i.deferUpdate();
            const targetId = i.values[0];
            game.votes.set(i.user.id, targetId); voter.hasVoted = true;
            await i.followUp({ content: `Kamu memilih **${game.players.get(targetId).member.user.username}**.`, ephemeral: true });
            if (Array.from(game.players.values()).filter(p => p.isAlive).every(p => p.hasVoted)) collector.stop('all_voted');
        });
        collector.on('end', () => this.endVoting());
        this.timer = setTimeout(() => collector.stop('time'), PHASE_TIMINGS.VOTING);
    }
    async endVoting() {
        if (this.state !== 'VOTING') return; this.state = 'VOTING_RESULT';
        const counts = Array.from(this.votes.values()).reduce((a, v) => { a[v] = (a[v] || 0) + 1; return a; }, {});
        let maxVotes = 0, lynchedId = null, isTie = false;
        let resultText; let lynchedPlayer = null;
        for (const id in counts) { if (counts[id] > maxVotes) { maxVotes = counts[id]; lynchedId = id; isTie = false; } else if (counts[id] === maxVotes) { isTie = true; } }
        let text;
        if (isTie || !lynchedId) { text = "Voting berakhir seri."; } 
        else { 
            lynchedPlayer = this.players.get(lynchedId);
            if (lynchedPlayer.role.id === 'joker') return this.endGame('Jester'); // Joker menang!
            lynchedPlayer.isAlive = false; 
            text = `Warga memutuskan **${lynchedPlayer.member.user.username}** digantung.\nDia adalah **${lynchedPlayer.role.name} ${lynchedPlayer.role.emoji}**.`;
        }
        const embed = new EmbedBuilder().setColor(0x992D22).setTitle("Hasil Voting").setDescription(text);
        await this.channel.send({ embeds: [embed] });
        if (lynchedPlayer) {
            const wasRevived = await this.handleRevivePhase(lynchedPlayer);
            if (wasRevived) lynchedPlayer.isAlive = true;
        }

        this.timer = setTimeout(() => this.nextPhase(), 5000);
    }
    async handleRevivePhase(deadPlayer) {
        const angel = Array.from(this.players.values()).find(p => p.isAlive && p.role.id === 'angel' && p.extras.revives > 0);
        if (!angel) return false; 

        this.state = 'REVIVE';
        const embed = new EmbedBuilder().setColor(0xFFFFFF).setTitle("🕊️ Kesempatan untuk Angel!").setDescription(`**${deadPlayer.member.user.username}** baru saja tewas. Apakah kamu ingin menggunakan kekuatanmu untuk menghidupkannya kembali?\n\nSisa kesempatan: **${angel.extras.revives}**`);
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ww_revive_yes').setLabel('Hidupkan Kembali').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ww_revive_no').setLabel('Jangan Gunakan').setStyle(ButtonStyle.Secondary)
        );

        const dmMessage = await angel.member.send({ embeds: [embed], components: [buttons] }).catch(() => null);
        if (!dmMessage) return false;

        return new Promise(resolve => {
            const collector = dmMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: PHASE_TIMINGS.REVIVE });
            let decisionMade = false;

            collector.on('collect', async i => {
                decisionMade = true;
                await i.deferUpdate();
                if (i.customId === 'ww_revive_yes') {
                    angel.extras.revives--;
                    await i.editReply({ content: `Kamu menggunakan kekuatanmu untuk menghidupkan **${deadPlayer.member.user.username}**. Sisa kesempatan: ${angel.extras.revives}.`, components: [] });
                    await this.channel.send(`✨ Sebuah keajaiban terjadi! **${deadPlayer.member.user.username}** hidup kembali berkat kekuatan Angel!`);
                    resolve(true);
                } else {
                    await i.editReply({ content: `Kamu memilih untuk tidak menggunakan kekuatanmu kali ini.`, components: [] });
                    resolve(false);
                }
                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                if (!decisionMade) {
                    await dmMessage.edit({ content: "Waktu habis, kamu tidak membuat keputusan.", components: [] }).catch(() => {});
                    resolve(false);
                }
            });
        });
    }
    checkWinCondition() {
        const alive = Array.from(this.players.values()).filter(p => p.isAlive);
        const ww = alive.filter(p => p.role.team === 'Werewolf').length;
        const vg = alive.filter(p => p.role.team === 'Villager').length;
        if (ww === 0 && vg > 0) return 'Villager'; if (ww >= vg && ww > 0) return 'Werewolf'; return null;
    }
    async endGame(winner) {
        this.state = 'ENDED'; clearTimeout(this.timer);
        const embed = new EmbedBuilder().setTitle(`Permainan Selesai! Tim ${winner} Menang!`).setColor(winner === 'Werewolf' ? 0xE74C3C : 0x2ECC71);
        const rolesList = Array.from(this.players.values()).map(p => `${p.role.emoji} **${p.member.user.username}** - ${p.role.name}`).join('\n');
        embed.setDescription(`**Peran Semua Pemain:**\n${rolesList}`);
        await this.channel.send({ embeds: [embed] });
        gameInstances.delete(this.channel.id);
        this.players.forEach(p => playerGameMap.delete(p.member.id));
    }
}

const werewolfManager = {
    games: gameInstances, playerMap: playerGameMap,
};

module.exports = {
  prefix: "werewolf", category: "game", aliases: ["ww"],
  async execute(message, args, client) {
    const subCommand = args[0]?.toLowerCase();
    const channelId = message.channel.id;
    const author = message.member;

    // [DIPERBARUI] Menambahkan 'role' ke daftar perintah valid dan menu bantuan
    if (!subCommand || !['start', 'join', 'play', 'end', 'leave', 'role'].includes(subCommand)) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("🐺 Bantuan Game Werewolf")
            .setDescription("Gunakan sub-perintah berikut untuk bermain:")
            .addFields(
                { name: "!ww start", value: "Membuat lobi permainan baru." },
                { name: "!ww join", value: "Bergabung dengan lobi yang ada." },
                { name: "!ww play", value: "Memulai permainan (hanya pembuat lobi)." },
                { name: "!ww leave", value: "Keluar dari lobi yang sedang menunggu." },
                { name: "!ww end", value: "Membatalkan lobi (hanya pembuat lobi)." },
                { name: "!ww role", value: "Melihat daftar semua peran yang ada." } // Ditambahkan
            );
        return message.reply({ embeds: [helpEmbed] });
    }

    // === Sub-perintah START ===
    if (subCommand === 'start') {
        if (gameInstances.has(channelId)) return message.reply("❗ Lobi sudah ada.");
        const game = new WerewolfGame(message.channel, author);
        const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🐺 Lobi Werewolf").setDescription(`**${author.user.username}** memulai lobi.\n(Min. 5, Maks. 15)`).addFields({ name: "Pemain (1/15)", value: `- ${author.user.username}` }).setFooter({ text: "Gunakan `!ww join`." });
        game.message = await message.channel.send({ embeds: [embed] });
        game.addPlayer(author);
        gameInstances.set(channelId, game);
    } 
    // === Sub-perintah JOIN ===
    else if (subCommand === 'join') {
        const game = gameInstances.get(channelId);
        if (!game || game.state !== 'LOBBY') return message.reply("❌ Tidak ada lobi aktif.");
        const result = game.addPlayer(author);
        if (!result.success) return message.reply(`❗ ${result.message}`);
        await game.updateLobbyMessage();
        await message.reply("✅ Berhasil bergabung!");
    } 
    // === Sub-perintah PLAY ===
    else if (subCommand === 'play') {
        const game = gameInstances.get(channelId);
        if (!game) return message.reply("❌ Tidak ada lobi.");
        if (game.initiator.id !== author.id) return message.reply("❌ Hanya pembuat lobi.");
        if (game.players.size < 5) return message.reply(`❌ Butuh min. 5 pemain (saat ini ${game.players.size}).`);
        await game.start();
    } 
    // === Sub-perintah END ===
    else if (subCommand === 'end') {
        const game = gameInstances.get(channelId);
        if (!game) return message.reply("❌ Tidak ada lobi.");
        if (game.initiator.id !== author.id) return message.reply("❌ Hanya pembuat lobi.");
        clearTimeout(game.timer);
        gameInstances.delete(channelId);
        game.players.forEach(p => playerGameMap.delete(p.member.id));
        await game.message.edit({ content: "Lobi dibatalkan.", embeds: [], components: [] });
        await message.reply("✅ Lobi permainan telah dibatalkan.");
    }
    // === Sub-perintah LEAVE ===
    else if (subCommand === 'leave') {
        const game = gameInstances.get(channelId);
        if (!game) return message.reply("❌ Tidak ada lobi aktif.");
        if (game.state !== 'LOBBY') return message.reply("❌ Tidak bisa keluar saat permainan sedang berjalan.");
        if (!Array.from(game.players.values()).some(p => p.member.id === author.id)) return message.reply("❌ Kamu tidak ada di lobi ini.");
        if (game.initiator.id === author.id) return message.reply("❌ Pembuat lobi tidak bisa keluar, gunakan `!ww end`.");
        
        game.players.delete(author.id);
        playerGameMap.delete(author.id);
        await game.updateLobbyMessage();
        await message.reply("✅ Kamu berhasil keluar dari lobi.");
    }
    // [BARU] Sub-perintah ROLE
    else if (subCommand === 'role') {
        const roleEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🐺 Daftar Peran Werewolf")
            .setDescription("Berikut adalah semua peran yang mungkin ada di dalam permainan ini, tergantung jumlah pemain:")
            .setTimestamp();

        for (const roleKey in ROLES) {
            const role = ROLES[roleKey];
            roleEmbed.addFields({
                name: `${role.emoji} ${role.name} (Tim ${role.team})`,
                value: role.description
            });
        }
        
        await message.reply({ embeds: [roleEmbed] });
    }
  },
  werewolfManager
};