const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// Set untuk melacak pengguna yang sedang menjalankan misi
const activeMissions = new Set();
const cooldown = 180000; // 3 menit dalam milidetik

// Fungsi helper untuk delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Fungsi untuk format waktu
function formatTime(ms) {
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return `${m} menit ${s} detik`;
}

module.exports = {
  prefix: "mancing",
  category: "rpg",
  aliases: ["memancing", "fish"],
  
  async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;

    if (activeMissions.has(authorId)) {
        return message.reply("❗ Anda sedang menyelesaikan misi lain. Tunggu sampai selesai!");
    }

    try {
        // 1. GET: Ambil data user dari API
        const userData = await api.getUser(authorId, authorUsername);

        if ((userData.fishingrod || 0) <= 0) {
            return message.reply("🎣 Kamu tidak punya pancingan! Buat dulu di `!craft`.");
        }
        if ((userData.fishingroddurability || 0) <= 0) {
            return message.reply("❗ Pancinganmu sudah rusak. Buat yang baru di `!craft`.");
        }

        const lastMancing = userData.lastmancing || 0;
        const currentTime = Date.now();

        // Cek Cooldown
        if (currentTime - lastMancing < cooldown) {
            const remainingTime = cooldown - (currentTime - lastMancing);
            return message.reply(` kamu baru saja memancing, istirahat dulu ya.\nKembali lagi dalam **${formatTime(remainingTime)}**.`);
        }

        activeMissions.add(authorId);

        const embed = new EmbedBuilder().setColor(0x3498DB).setTitle("🎣 Misi Memancing Dimulai");
        const missionMessage = await message.reply({ embeds: [embed.setDescription("Melempar kail ke air...")] });
        
        // Animasi
        await delay(5000);
        await missionMessage.edit({ embeds: [embed.setDescription("Menunggu umpan dimakan...")] });
        await delay(8000);
        await missionMessage.edit({ embeds: [embed.setDescription("Terasa ada tarikan! Menarik pancing dengan sekuat tenaga!")] });
        await delay(5000);

        // Hitung hasil tangkapan
        const catches = {
            nila: Math.floor(Math.random() * 2),
            lele: Math.floor(Math.random() * 2),
            bawal: Math.floor(Math.random() * 1),
            ikan: Math.floor(Math.random() * 2),
            udang: Math.floor(Math.random() * 1),
            paus: Math.random() < 0.05 ? 1 : 0, // 5% kemungkinan dapat paus
            kepiting: Math.floor(Math.random() * 1),
        };

        // Ambil data terbaru lagi sebelum diubah
        const finalUserData = await api.getUser(authorId, authorUsername);
        
        // 2. MODIFY: Ubah data di memori
        let catchSummary = "";
        for (const fish in catches) {
            if (catches[fish] > 0) {
                finalUserData[fish] = (finalUserData[fish] || 0) + catches[fish];
                catchSummary += `◦ ${fish.charAt(0).toUpperCase() + fish.slice(1)}: ${catches[fish]}\n`;
            }
        }
        
        finalUserData.fishingroddurability = (finalUserData.fishingroddurability || 0) - 1;
        finalUserData.lastmancing = currentTime;

        // 3. POST: Kirim kembali data yang sudah diperbarui ke API
        await api.updateUser(authorId, finalUserData);

        // Tampilkan hasil akhir
        if (catchSummary === "") {
            catchSummary = "Sayang sekali kamu tidak mendapatkan ikan apapun...";
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("🐟 Hasil Tangkapan!")
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(catchSummary)
            .addFields({ name: "Durability Pancingan", value: ` tersisa ${finalUserData.fishingroddurability}` });
        
        await missionMessage.edit({ embeds: [resultEmbed] });

    } catch (error) {
        console.error("[MANCING CMD ERROR]", error);
        message.reply(`❌ Terjadi kesalahan saat memancing: ${error.message}`);
    } finally {
        // Selalu hapus kunci setelah misi selesai atau gagal
        activeMissions.delete(authorId);
    }
  },
};