const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

// Map untuk menyimpan sesi lobi permainan, kunci: channelId
const gameLobbies = new Map();

// --- Handler Perintah ---
module.exports = {
  prefix: "hompimpa",
  category: "game",
  aliases: ["hom", "pingsut"],

  async execute(message, args, client) {
    const subCommand = args[0]?.toLowerCase();
    const channelId = message.channel.id;
    const author = message.member;

    if (!subCommand || !['start', 'join', 'play', 'end'].includes(subCommand)) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("🤝 Bantuan Game Hompimpa")
            .setDescription("Permainan klasik untuk menentukan pemenang/pecundang dalam grup (min. 2 pemain).")
            .addFields(
                { name: "!hompimpa start", value: "Membuat lobi permainan baru." },
                { name: "!hompimpa join", value: "Bergabung dengan lobi yang ada." },
                { name: "!hompimpa play", value: "Memulai babak permainan (hanya pembuat lobi)." },
                { name: "!hompimpa end", value: "Membatalkan lobi (hanya pembuat lobi)." }
            );
        return message.reply({ embeds: [helpEmbed] });
    }

    // === Sub-perintah START ===
    if (subCommand === 'start') {
        if (gameLobbies.has(channelId)) return message.reply("❗ Sudah ada lobi Hompimpa aktif di channel ini.");

        const lobbyEmbed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle("🤝 Lobi Hompimpa Dimulai!")
            .setDescription(`**${author.user.username}** telah memulai lobi.\nMenunggu pemain lain... (Min. 2 pemain)`)
            .addFields({ name: "Pemain (1)", value: `- ${author.user.username}` })
            .setFooter({ text: "Ketik !hompimpa join untuk bergabung." });
        
        const lobbyMessage = await message.channel.send({ embeds: [lobbyEmbed] });
        gameLobbies.set(channelId, { players: [author], initiator: author.id, status: 'waiting', message: lobbyMessage });
    }

    // === Sub-perintah JOIN ===
    if (subCommand === 'join') {
        const lobby = gameLobbies.get(channelId);
        if (!lobby) return message.reply("❌ Tidak ada lobi aktif di channel ini.");
        if (lobby.status !== 'waiting') return message.reply("❌ Permainan sudah dimulai.");
        if (lobby.players.some(p => p.id === author.id)) return message.reply("❗ Kamu sudah ada di dalam lobi.");

        lobby.players.push(author);
        const playerNames = lobby.players.map(p => `- ${p.user.username}`).join('\n');
        
        const updatedEmbed = EmbedBuilder.from(lobby.message.embeds[0])
            .setFields({ name: `Pemain (${lobby.players.length})`, value: playerNames });
        
        await lobby.message.edit({ embeds: [updatedEmbed] });
        await message.reply(`✅ Kamu berhasil bergabung dengan lobi!`);
    }

    // === Sub-perintah PLAY ===
    if (subCommand === 'play') {
        const lobby = gameLobbies.get(channelId);
        if (!lobby) return message.reply("❌ Tidak ada lobi untuk dimulai.");
        if (lobby.initiator !== author.id) return message.reply("❌ Hanya pembuat lobi yang bisa memulai permainan.");
        if (lobby.players.length < 2) return message.reply("❌ Butuh minimal 2 pemain untuk memulai.");

        lobby.status = 'playing';
        lobby.choices = {}; // Reset pilihan

        const playEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("Hompimpa Alaium Gambreng!")
            .setDescription(`Babak dimulai! Semua pemain silakan pilih tanganmu di bawah ini dalam 30 detik.`);

        const playButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('putih').setLabel('Putih').setEmoji('✋🏻').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('hitam').setLabel('Hitam').setEmoji('✋🏿').setStyle(ButtonStyle.Primary)
        );

        const playMessage = await message.channel.send({ embeds: [playEmbed], components: [playButtons] });

        const collector = playMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

        collector.on('collect', async interaction => {
            if (!lobby.players.some(p => p.id === interaction.user.id)) {
                return interaction.reply({ content: 'Kamu tidak ada dalam permainan ini.', ephemeral: true });
            }
            if (lobby.choices[interaction.user.id]) {
                return interaction.reply({ content: 'Kamu sudah memilih!', ephemeral: true });
            }

            lobby.choices[interaction.user.id] = interaction.customId;
            await interaction.reply({ content: `Kamu memilih **${interaction.customId}**! Menunggu pemain lain...`, ephemeral: true });
            
            // Cek jika semua pemain sudah memilih
            if (Object.keys(lobby.choices).length === lobby.players.length) {
                collector.stop('all_voted');
            }
        });

        collector.on('end', async (collected, reason) => {
            await playMessage.edit({ components: [] }); // Hapus tombol
            
            if (Object.keys(lobby.choices).length < lobby.players.length) {
                gameLobbies.delete(channelId);
                return playMessage.edit({ content: "Permainan dibatalkan karena tidak semua pemain memilih.", embeds: [] });
            }

            const putih_players = lobby.players.filter(p => lobby.choices[p.id] === 'putih');
            const hitam_players = lobby.players.filter(p => lobby.choices[p.id] === 'hitam');

            const resultEmbed = new EmbedBuilder().setTitle("Hasil Hompimpa").setTimestamp();
            
            let description = "**Pilihan Pemain:**\n";
            putih_players.forEach(p => description += `✋🏻 <@${p.id}> memilih Putih\n`);
            hitam_players.forEach(p => description += `✋🏿 <@${p.id}> memilih Hitam\n`);
            resultEmbed.setDescription(description);

            // Terapkan aturan permainan
            if (lobby.players.length === 2) {
                if (putih_players.length === 1 && hitam_players.length === 1) {
                    resultEmbed.setColor(0x2ECC71).addFields({ name: 'Pemenang', value: `✋🏻 **Putih** menang! Selamat <@${putih_players[0].id}>!` });
                } else {
                     resultEmbed.setColor(0xF1C40F).addFields({ name: 'Hasil', value: `Keduanya memilih tangan yang sama. Hasilnya seri!` });
                }
            } else { // Aturan untuk 3+ pemain
                if (putih_players.length === hitam_players.length) {
                    resultEmbed.setColor(0xF1C40F).addFields({ name: 'Hasil', value: `SERI! Jumlah tangan sama (${putih_players.length} vs ${hitam_players.length}). Silakan \`!hompimpa play\` lagi.` });
                    lobby.status = 'waiting'; // Kembalikan ke lobi untuk main lagi
                    return message.channel.send({ embeds: [resultEmbed] });
                }

                let winners, losers;
                if (putih_players.length === 0 || hitam_players.length === 0) {
                     resultEmbed.setColor(0xF1C40F).addFields({ name: 'Hasil', value: `SERI! Semua pemain memilih tangan yang sama. Silakan \`!hompimpa play\` lagi.` });
                     lobby.status = 'waiting';
                     return message.channel.send({ embeds: [resultEmbed] });
                }
                
                if (putih_players.length < hitam_players.length) {
                    winners = putih_players;
                    losers = hitam_players;
                } else {
                    winners = hitam_players;
                    losers = putih_players;
                }

                resultEmbed.setColor(0x2ECC71).addFields({ name: '🏆 Pemenang (Kelompok Minoritas)', value: winners.map(p => `<@${p.id}>`).join(', ') });
                resultEmbed.addFields({ name: '❌ Kalah (Kelompok Mayoritas)', value: losers.map(p => `<@${p.id}>`).join(', ') });
            }
            
            message.channel.send({ embeds: [resultEmbed] });
            gameLobbies.delete(channelId); // Selesaikan game setelah 1 ronde
        });
    }

    // === Sub-perintah END ===
    if (subCommand === 'end') {
        const lobby = gameLobbies.get(channelId);
        if (!lobby) return message.reply("❌ Tidak ada lobi aktif.");
        if (lobby.initiator !== author.id) return message.reply("❌ Hanya pembuat lobi yang bisa menghentikannya.");
        
        await lobby.message.edit({ content: " Lobi dibatalkan oleh pembuatnya.", embeds: [], components: [] });
        gameLobbies.delete(channelId);
        return message.reply("✅ Lobi berhasil dibatalkan.");
    }
  }
};