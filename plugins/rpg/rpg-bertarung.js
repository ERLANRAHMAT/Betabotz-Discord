const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const api = require('../../api_handler.js');

const activeGames = new Set();
const delay = ms => new Promise(res => setTimeout(res, ms));

// Weapon types for battle selection
const WEAPONS = ['sword', 'axe', 'katana', 'bow', 'pickaxe'];
const EQUIPMENT_EMOJIS = {
    sword: '⚔️',
    axe: '🪓',
    katana: '🦯',
    bow: '🏹',
    pickaxe: '⛏️',
    armor: '🥼'
};

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function getEquipmentName(type, level) {
    const EQUIPMENT_NAMES = {
        armor: ['Tidak Punya', 'Leather Armor', 'Iron Armor', 'Gold Armor', 'Diamond Armor', 'Emerald Armor', 'Crystal Armor', 'Obsidian Armor', 'Netherite Armor', 'Wither Armor', 'Dragon Armor', 'Hacker Armor', 'GOD Armor'],
        sword: ['Tidak Punya', 'Wooden Sword', 'Iron Sword', 'Gold Sword', 'Diamond Sword', 'Netherite Sword', 'Crystal Sword', 'Obsidian Sword', 'Netherite Sword', 'Wither Sword', 'Dragon Sword', 'Hacker Sword', 'GOD Sword'],
        axe: ['Tidak Punya', 'Wood Axe', 'Iron Axe', 'Gold Axe', 'Diamond Axe', 'Netherite Axe', 'Crystal Axe', 'Obsidian Axe', 'Netherite Axe', 'Wither Axe', 'Dragon Axe', 'Hacker Axe', 'GOD Axe'],
        katana: ['Tidak Punya', 'Wood Katana', 'Iron Katana', 'Gold Katana', 'Diamond Katana', 'Netherite Katana', 'Crystal Katana', 'Obsidian Katana', 'Netherite Katana', 'Wither Katana', 'Dragon Katana', 'Hacker Katana', 'GOD Katana'],
        bow: ['Tidak Punya', 'Wood Bow', 'Iron Bow', 'Gold Bow', 'Diamond Bow', 'Netherite Bow', 'Crystal Bow', 'Obsidian Bow', 'Netherite Bow', 'Wither Bow', 'Dragon Bow', 'Hacker Bow', 'GOD Bow'],
        pickaxe: ['Tidak Punya', 'Wood Pickaxe', 'Iron Pickaxe', 'Gold Pickaxe', 'Diamond Pickaxe', 'Netherite Pickaxe', 'Crystal Pickaxe', 'Obsidian Pickaxe', 'Netherite Pickaxe', 'Wither Pickaxe', 'Dragon Pickaxe', 'Hacker Pickaxe', 'GOD Pickaxe']
    };
    return EQUIPMENT_NAMES[type]?.[level] || 'Tidak Diketahui';
}

// Helper: Calculate battle stats from equipment selection
function calculateBattleStats(equipment, userData) {
    const level = userData.rpg?.level || 1;
    const health = userData.rpg?.health || 100;
    const stamina = userData.stamina || 100;
    const mana = userData.rpg?.mana || 50;

    let weaponPower = 0;
    let armorPower = 0;

    // Weapon damage calculation (base 150 per tier)
    if (equipment.weapon) {
        const weaponTier = userData[equipment.weapon];
        const weaponDura = userData[`${equipment.weapon}durability`] || 40;
        const durabilityFactor = weaponDura / 40;
        weaponPower = (weaponTier * 150) * durabilityFactor;
    }

    // Armor defense calculation (base 200 per tier)
    if (equipment.armor && userData.armor > 0) {
        const armorTier = userData.armor;
        const armorDura = userData.armordurability || 50;
        const durabilityFactor = armorDura / 50;
        armorPower = (armorTier * 200) * durabilityFactor;
    }

    // Final score: level(30%) + weapon(40%) + armor(20%) + health(10%)
    const levelScore = level * 5;
    const weaponScore = weaponPower * 0.4;
    const armorScore = armorPower * 0.2;
    const healthScore = (health / 10) + (stamina / 5) + (mana / 3);

    const totalScore = levelScore + weaponScore + armorScore + healthScore;

    return {
        levelScore,
        weaponScore,
        armorScore,
        healthScore,
        totalScore,
        health,
        stamina,
        mana
    };
}

// Helper: Determine battle winner with variance
function determineBattleWinner(stats1, stats2) {
    const variance = 0.35 + (Math.random() * 0.1); // 35-45% variance
    const score1Adjusted = stats1.totalScore * (1 + (Math.random() - 0.5) * variance);
    const score2Adjusted = stats2.totalScore * (1 + (Math.random() - 0.5) * variance);

    return score1Adjusted > score2Adjusted ? 1 : 2;
}

const winMessages = [
    "kamu berhasil menggunakan kekuatan elemental untuk menghancurkan pertahanan lawan!",
    "kamu melancarkan serangan mematikan dengan gerakan akrobatik yang membingungkan lawan!",
    "kamu menang dengan strategi yang sempurna!",
    "kamu berhasil mengalahkan lawan dengan skilmu yang luar biasa!"
];
const loseMessages = [
    "pertahanan lawanmu terlalu kuat untuk ditembus!",
    "lawanmu melakukan serangan yang membuatmu terpojok!",
    "lawanmu unggul dalam pertarungan ini.",
    "kekuatan lawanmu jauh melampaui dirimu."
];

module.exports = {
  prefix: "bertarung",
  category: "rpg",
  aliases: ["fight"],

  async execute(message, args, client) {
    const challenger = message.member;
    const opponent = message.mentions.members.first();
    const betAmount = parseInt(args[1]);

    if (!opponent || isNaN(betAmount) || betAmount <= 0) {
        return message.reply("Format: `!bertarung @user <jumlah_taruhan (money)>`");
    }
    if (opponent.id === challenger.id) return message.reply("Tidak bisa bertarung dengan diri sendiri!");
    if (opponent.user.bot) return message.reply("Tidak bisa bertarung dengan bot!");
    if (activeGames.has(challenger.id) || activeGames.has(opponent.id)) return message.reply("❗ Salah satu dari kalian sedang dalam pertarungan lain.");

    try {
        const [challengerData, opponentData] = await Promise.all([
            api.getUser(challenger.id, challenger.user.username),
            api.getUser(opponent.id, opponent.user.username)
        ]);

        if (challengerData.money < betAmount) return message.reply(`💰 Uangmu tidak cukup untuk taruhan **${betAmount.toLocaleString('id-ID')}**.`);
        if (opponentData.money < betAmount) return message.reply(`💰 **${opponent.user.username}** tidak punya cukup uang untuk tantangan ini.`);

        const lastWar = challengerData.lastWar || 0;
        const cooldown = 10000;
        if (Date.now() - lastWar < cooldown) {
            const remaining = Math.ceil((cooldown - (Date.now() - lastWar)) / 1000);
            return message.reply(`Anda harus menunggu ${remaining} detik sebelum dapat bertarung lagi.`);
        }

        activeGames.add(challenger.id);
        activeGames.add(opponent.id);

        const challengeEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle(`⚔️ Tantangan Bertarung!`)
            .setDescription(`${challenger} menantang ${opponent} untuk bertarung!\n\n**Taruhan:** 💰 **${betAmount.toLocaleString('id-ID')}** Money\n\n${opponent}, apakah kamu menerima tantangan ini?`);

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fight_accept').setLabel('Terima').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('fight_decline').setLabel('Tolak').setStyle(ButtonStyle.Danger)
        );

        const challengeMessage = await message.channel.send({
            content: `${opponent}`,
            embeds: [challengeEmbed],
            components: [buttons]
        });

        const collector = challengeMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== opponent.id) return i.reply({ content: 'Ini bukan tantangan untukmu!', ephemeral: true });
            await i.deferUpdate();
            collector.stop();

            if (i.customId === 'fight_decline') {
                activeGames.delete(challenger.id);
                activeGames.delete(opponent.id);
                return challengeMessage.edit({ content: `😥 Tantangan ditolak.`, embeds: [], components: [] });
            }

            if (i.customId === 'fight_accept') {
                // Get fresh data
                const freshChallengerData = await api.getUser(challenger.id, challenger.user.username);
                const freshOpponentData = await api.getUser(opponent.id, opponent.user.username);

                // Get default equipment (current equipment mereka gunakan)
                const challWeapon = freshChallengerData.sword > 0 ? 'sword' :
                                   freshChallengerData.axe > 0 ? 'axe' :
                                   freshChallengerData.katana > 0 ? 'katana' :
                                   freshChallengerData.bow > 0 ? 'bow' : 'pickaxe';

                const oppWeapon = freshOpponentData.sword > 0 ? 'sword' :
                                 freshOpponentData.axe > 0 ? 'axe' :
                                 freshOpponentData.katana > 0 ? 'katana' :
                                 freshOpponentData.bow > 0 ? 'bow' : 'pickaxe';

                // Direct to confirmation with default equipment
                await directBattleConfirmation(
                    challengeMessage,
                    challenger,
                    opponent,
                    betAmount,
                    freshChallengerData,
                    freshOpponentData,
                    challWeapon,
                    oppWeapon
                );
            }
        });

        collector.on('end', (c, reason) => {
            if (reason === 'time') {
                challengeMessage.edit({ content: "⏳ Tantangan kedaluwarsa.", embeds: [], components: [] });
                activeGames.delete(challenger.id);
                activeGames.delete(opponent.id);
            }
        });

    } catch(error) {
        console.error("[FIGHT CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
        activeGames.delete(message.author.id);
    }
  },
};

// ======================== DIRECT BATTLE CONFIRMATION ========================

async function directBattleConfirmation(challengeMessage, challenger, opponent, betAmount, challengerData, opponentData, challWeapon, oppWeapon) {
    try {
        const battleKey = `${challenger.id}-${opponent.id}`;

        // Calculate battle stats with default equipment
        const challengerStats = calculateBattleStats({
            weapon: challWeapon,
            armor: challengerData.armor
        }, challengerData);

        const opponentStats = calculateBattleStats({
            weapon: oppWeapon,
            armor: opponentData.armor
        }, opponentData);

        const challengerWeaponName = getEquipmentName(challWeapon, challengerData[challWeapon]);
        const challengerArmorName = challengerData.armor > 0 ? getEquipmentName('armor', challengerData.armor) : 'Tanpa Armor';

        const opponentWeaponName = getEquipmentName(oppWeapon, opponentData[oppWeapon]);
        const opponentArmorName = opponentData.armor > 0 ? getEquipmentName('armor', opponentData.armor) : 'Tanpa Armor';

        // Create confirmation embed
        const confirmEmbed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('⚙️ KONFIRMASI PERTARUNGAN')
            .addFields(
                {
                    name: `${challenger.user.username}'s Equipment`,
                    value: `**Senjata:** ${EQUIPMENT_EMOJIS[challWeapon]} ${challengerWeaponName}\n` +
                           `**Armor:** 🥼 ${challengerArmorName}\n` +
                           `**Health:** ❤️ ${challengerData.rpg?.health || 100}`,
                    inline: true
                },
                {
                    name: `${opponent.user.username}'s Equipment`,
                    value: `**Senjata:** ${EQUIPMENT_EMOJIS[oppWeapon]} ${opponentWeaponName}\n` +
                           `**Armor:** 🥼 ${opponentArmorName}\n` +
                           `**Health:** ❤️ ${opponentData.rpg?.health || 100}`,
                    inline: true
                },
                {
                    name: '💰 Taruhan',
                    value: `**${betAmount.toLocaleString('id-ID')}** Money per pemain`,
                    inline: false
                }
            )
            .setDescription('Apakah kalian siap bertarung dengan perlengkapan ini?')
            .setFooter({
                text: challengerData.rpg?.health < 20 || opponentData.rpg?.health < 20 ?
                    '⚠️ Ada pemain dengan health rendah! Kedua pemain harus konfirmasi untuk memulai pertarungan!' :
                    'Kedua pemain harus konfirmasi untuk memulai pertarungan!'
            });

        const confirmButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('battle_confirm').setLabel('⚔️ Siap Bertarung').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('battle_cancel').setLabel('❌ Batal').setStyle(ButtonStyle.Danger)
        );

        let confirmCount = 0;
        const confirmedUsers = new Set();

        await challengeMessage.edit({
            embeds: [confirmEmbed],
            components: [confirmButtons]
        });

        const confirmCollector = challengeMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000
        });

        confirmCollector.on('collect', async i => {
            if (i.user.id !== challenger.id && i.user.id !== opponent.id) {
                return i.reply({ content: 'Ini bukan untukmu!', ephemeral: true });
            }

            if (i.customId === 'battle_cancel') {
                await i.deferUpdate();
                confirmCollector.stop();
                activeGames.delete(challenger.id);
                activeGames.delete(opponent.id);
                return challengeMessage.edit({
                    content: '❌ Pertarungan dibatalkan.',
                    embeds: [],
                    components: []
                });
            }

            if (i.customId === 'battle_confirm') {
                await i.deferUpdate();

                if (confirmedUsers.has(i.user.id)) {
                    return; // Sudah konfirmasi, ignore
                }

                confirmedUsers.add(i.user.id);
                confirmCount++;

                if (confirmCount < 2) {
                    const waiting = i.user.id === challenger.id ? opponent.user.username : challenger.user.username;
                    return challengeMessage.edit({
                        embeds: [confirmEmbed.setFooter({ text: `✅ ${i.user.username} siap! Menunggu ${waiting}...` })],
                        components: [confirmButtons]
                    });
                }

                // Kedua pemain sudah konfirmasi
                confirmCollector.stop();
                await startBattle(
                    challengeMessage, challenger, opponent, battleKey,
                    betAmount, challengerData, opponentData, challengerStats, opponentStats,
                    challWeapon, oppWeapon
                );
            }
        });

        confirmCollector.on('end', (collected) => {
            if (confirmCount < 2) {
                challengeMessage.edit({ content: "⏳ Waktu konfirmasi habis.", embeds: [], components: [] });
                activeGames.delete(challenger.id);
                activeGames.delete(opponent.id);
            }
        });

    } catch(error) {
        console.error("[CONFIRMATION ERROR]", error);
        activeGames.delete(challenger.id);
        activeGames.delete(opponent.id);
    }
}

// ======================== BATTLE EXECUTION ========================

async function startBattle(challengeMessage, challenger, opponent, battleKey, betAmount, challengerData, opponentData, challengerStats, opponentStats, challWeapon, oppWeapon) {
    try {
        // Determine winner
        const winnerNum = determineBattleWinner(challengerStats, opponentStats);
        const winner = winnerNum === 1 ? challenger : opponent;
        const loser = winnerNum === 1 ? opponent : challenger;
        const winnerData = winnerNum === 1 ? challengerData : opponentData;
        const loserData = winnerNum === 1 ? opponentData : challengerData;
        const winnerWeapon = winnerNum === 1 ? challWeapon : oppWeapon;
        const loserWeapon = winnerNum === 1 ? oppWeapon : challWeapon;
        const winnerArmor = winnerNum === 1 ? challengerData.armor : opponentData.armor;
        const loserArmor = winnerNum === 1 ? opponentData.armor : challengerData.armor;

        // Battle animation sequence
        const battleFrames = [
            `⚔️⚔️⚔️ PERTARUNGAN DIMULAI! ⚔️⚔️⚔️\n\n${challenger.user.username} vs ${opponent.user.username}`,
            `${challenger.user.username} menyerang dengan ${EQUIPMENT_EMOJIS[challWeapon]} ${getEquipmentName(challWeapon, challengerData[challWeapon])}! ⚡`,
            `${opponent.user.username} bertahan dengan ${loserArmor > 0 ? '🥼' : '❌'} ${loserArmor > 0 ? getEquipmentName('armor', loserArmor) : 'No Defense'}!`,
            `⚔️ BENTUKAN SERANGAN BERLANJUT! ⚔️\n\nKedua prajurit berduel sengit...`,
            `💥 ${winner.user.username} MELUNCURKAN SERANGAN PAMUNGKAS! 💥\n\nEfektivitas: ${(Math.random() * 30 + 70).toFixed(0)}%`
        ];

        for (const frame of battleFrames) {
            const animEmbed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle('⚔️ PERTARUNGAN BERLANGSUNG')
                .setDescription(frame);
            await challengeMessage.edit({ embeds: [animEmbed], components: [] });
            await delay(800);
        }

        // Calculate money transfer with armor mitigation
        let armorReduction = 0;
        if (loserArmor > 0) {
            armorReduction = Math.min(0.5, 0.1 * loserArmor);
        }

        let actualLoss = betAmount;
        if (armorReduction > 0) {
            actualLoss = Math.floor(betAmount * (1 - armorReduction));
        }

        // Update money
        if (winner.id === challenger.id) {
            challengerData.money += betAmount;
            opponentData.money -= actualLoss;
        } else {
            challengerData.money -= actualLoss;
            opponentData.money += betAmount;
        }

        challengerData.lastWar = Date.now();

        // Durability damage
        if (winnerWeapon && winnerData[winnerWeapon + 'durability'] > 0) {
            winnerData[winnerWeapon + 'durability'] -= 1;
        }
        if (loserWeapon && loserData[loserWeapon + 'durability'] > 0) {
            loserData[loserWeapon + 'durability'] -= Math.min(loserData[loserWeapon + 'durability'], 2);
        }
        if (loserArmor > 0 && loserData.armordurability > 0) {
            loserData.armordurability -= Math.min(loserData.armordurability, 2);
        }
        if (winnerArmor > 0 && winnerData.armordurability > 0) {
            winnerData.armordurability -= 1;
        }

        // Health damage system with armor mitigation
        let winnerHealthDamage = 10; // Winner loses 10 HP
        let loserHealthDamage = 20;  // Loser loses 20 HP

        // Apply armor-based mitigation to loser's health damage
        const armorMitigation = Math.min(0.5, 0.1 * loserArmor);
        loserHealthDamage = Math.max(1, Math.floor(loserHealthDamage * (1 - armorMitigation)));

        // Store health before damage
        const winnerHealthBefore = winnerData.rpg?.health || 100;
        const loserHealthBefore = loserData.rpg?.health || 100;

        // Apply health damage
        if (!winnerData.rpg) winnerData.rpg = {};
        if (!loserData.rpg) loserData.rpg = {};
        winnerData.rpg.health = Math.max(0, (winnerData.rpg.health || 100) - winnerHealthDamage);
        loserData.rpg.health = Math.max(0, (loserData.rpg.health || 100) - loserHealthDamage);

        const winnerHealthAfter = winnerData.rpg.health;
        const loserHealthAfter = loserData.rpg.health;

        // Save data
        await Promise.all([
            api.updateUser(challenger.id, challengerData),
            api.updateUser(opponent.id, opponentData)
        ]);

        // Result embed
        const resultEmbed = new EmbedBuilder()
            .setColor(winner.id === challenger.id ? 0x2ECC71 : 0xE74C3C)
            .setTitle(`🏆 Pemenang: ${winner.user.username}!`)
            .setDescription(pickRandom(winnerNum === 1 ? winMessages : loseMessages))
            .addFields(
                {
                    name: `${winner.user.username} (Pemenang)`,
                    value: `💰 Gain: **+${betAmount.toLocaleString('id-ID')}** Money\n` +
                           `📊 Balance: **${(winner.id === challenger.id ? challengerData.money : opponentData.money).toLocaleString('id-ID')}** Money`,
                    inline: true
                },
                {
                    name: `${loser.user.username} (Kalah)`,
                    value: `💰 Loss: **-${actualLoss.toLocaleString('id-ID')}** Money\n` +
                           `📊 Balance: **${(loser.id === challenger.id ? challengerData.money : opponentData.money).toLocaleString('id-ID')}** Money`,
                    inline: true
                },
                {
                    name: '⚙️ Equipment Durability',
                    value: `**${winner.user.username}** Weapon: -1 | Armor: ${winnerArmor > 0 ? '-1' : 'N/A'}\n` +
                           `**${loser.user.username}** Weapon: -2 | Armor: ${loserArmor > 0 ? '-2' : 'N/A'}`,
                    inline: false
                },
                {
                    name: '❤️ Health Damage',
                    value: `**${winner.user.username}** ${winnerHealthBefore} → ${winnerHealthAfter} (-${winnerHealthDamage})\n` +
                           `**${loser.user.username}** ${loserHealthBefore} → ${loserHealthAfter} (-${loserHealthDamage})`,
                    inline: false
                }
            );

        if (armorReduction > 0) {
            resultEmbed.addFields({
                name: '🛡️ Armor Protection',
                value: `Kerugian uang dikurangi **${Math.floor(armorReduction * 100)}%** oleh armor!\nDamage kesehatan dikurangi **${Math.floor((armorMitigation) * 100)}%** oleh armor!`
            });
        }

        await challengeMessage.edit({ embeds: [resultEmbed], components: [] });

        equipmentSelections.delete(battleKey);
        activeGames.delete(challenger.id);
        activeGames.delete(opponent.id);

    } catch(error) {
        console.error("[BATTLE ERROR]", error);
        activeGames.delete(challenger.id);
        activeGames.delete(opponent.id);
    }
}