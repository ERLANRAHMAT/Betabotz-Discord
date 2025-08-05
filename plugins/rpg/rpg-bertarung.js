const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const api = require('../../api_handler.js');

const activeGames = new Set();
const delay = ms => new Promise(res => setTimeout(res, ms));

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

const winMessages = [
    "kamu berhasil menggunakan kekuatan elemental untuk menghancurkan pertahanan lawan!",
    "kamu melancarkan serangan mematikan dengan gerakan akrobatik yang membingungkan lawan!",
    "kamu menang karena bot merasa kasihan sama kamu.",
    "kamu menang karena melawan orang cupu."
];
const loseMessages = [ "bodoh, gitu doang aja kalah, tolol!", "lemah lu, mending di rumah aja!", "jangan berantem kalo cupu dek, wkwkwk.", "dasar tolol, lawan itu doang aja ga bisa." ];

module.exports = {
  prefix: "bertarung",
  category: "rpg",
  aliases: ["fight"],
  
  async execute(message, args, client) {
    const challenger = message.member;
    const opponent = message.mentions.members.first();
    const betAmount = parseInt(args[1]);

    if (!opponent || isNaN(betAmount) || betAmount <= 0) {
        return message.reply("Gunakan format: `!bertarung @user <jumlah_taruhan>`");
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

        activeGames.add(challenger.id); activeGames.add(opponent.id);

        const challengeEmbed = new EmbedBuilder().setColor(0xE74C3C).setTitle(`⚔️ Tantangan Bertarung!`).setDescription(`${challenger} menantang ${opponent} untuk bertarung!\n\n**Taruhan:** 💰 **${betAmount.toLocaleString('id-ID')}** Money\n\n${opponent}, apakah kamu menerima tantangan ini?`);
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fight_accept').setLabel('Terima').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('fight_decline').setLabel('Tolak').setStyle(ButtonStyle.Danger)
        );
        const challengeMessage = await message.channel.send({ content: `${opponent}`, embeds: [challengeEmbed], components: [buttons] });
        const collector = challengeMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== opponent.id) return i.reply({ content: 'Ini bukan tantangan untukmu!', ephemeral: true });
            
            // ==================== PERBAIKAN DI SINI ====================
            await i.deferUpdate(); // Memberi tahu Discord agar menunggu
            // ==========================================================
            
            collector.stop();

            if (i.customId === 'fight_decline') {
                activeGames.delete(challenger.id); activeGames.delete(opponent.id);
                return challengeMessage.edit({ content: `😥 Tantangan ditolak.`, embeds: [], components: [] });
            }

            if (i.customId === 'fight_accept') {
                const animationEmbed = new EmbedBuilder().setColor(0x3498DB).setTitle("Arena Disiapkan...");
                await challengeMessage.edit({ embeds: [animationEmbed.setDescription("Mencari arena...")], components: [] });
                await delay(2000);
                await challengeMessage.edit({ embeds: [animationEmbed.setDescription("Arena ditemukan! Pertarungan dimulai...")] });
                await delay(2000);

                const result = Math.random() >= 0.5;
                const winner = result ? challenger : opponent;
                const loser = result ? opponent : challenger;
                
                const finalChallengerData = await api.getUser(challenger.id, challenger.user.username);
                const finalOpponentData = await api.getUser(opponent.id, opponent.user.username);

                finalChallengerData.money += (winner.id === challenger.id ? betAmount : -betAmount);
                finalOpponentData.money += (winner.id === opponent.id ? betAmount : -betAmount);
                finalChallengerData.lastWar = Date.now();

                await Promise.all([
                    api.updateUser(challenger.id, finalChallengerData),
                    api.updateUser(opponent.id, finalOpponentData)
                ]);

                const resultEmbed = new EmbedBuilder()
                    .setTitle(`🎉 Pemenangnya adalah ${winner.user.username}!`)
                    .setDescription(result ? pickRandom(winMessages) : pickRandom(loseMessages))
                    .addFields(
                        { name: "Hadiah Taruhan", value: `💰 **${betAmount.toLocaleString('id-ID')}** Money`},
                        { name: `Saldo ${winner.user.username}`, value: `💰 ${(winner.id === challenger.id ? finalChallengerData.money : finalOpponentData.money).toLocaleString('id-ID')}` },
                        { name: `Saldo ${loser.user.username}`, value: `💰 ${(loser.id === challenger.id ? finalChallengerData.money : finalOpponentData.money).toLocaleString('id-ID')}` }
                    )
                    .setThumbnail(winner.displayAvatarURL());
                
                if (winner.id === challenger.id) resultEmbed.setColor(0x2ECC71);
                else resultEmbed.setColor(0xE74C3C);

                await challengeMessage.edit({ embeds: [resultEmbed] });
                activeGames.delete(challenger.id); activeGames.delete(opponent.id);
            }
        });
        collector.on('end', (c, reason) => { if (reason === 'time') { challengeMessage.edit({ content: "⏳ Tantangan kedaluwarsa.", embeds: [], components: [] }); activeGames.delete(challenger.id); activeGames.delete(opponent.id); }});
    } catch(error) {
        console.error("[FIGHT CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};