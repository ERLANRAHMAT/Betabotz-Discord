const { EmbedBuilder } = require('discord.js');
const api = require('../../api_handler.js');

// --- Konfigurasi Aksi ---
const JAIL_TIME = 3600000; // 1 jam dalam milidetik

module.exports = {
  prefix: "penjara",
  category: "rpg",
  aliases: ["jail"],
  
   async execute(message, args, client) {
    const authorId = message.author.id;
    const authorUsername = message.author.username;
    const targetUser = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || "Tidak ada alasan yang diberikan.";

    if (!targetUser) {
        return message.reply("Siapa yang mau kamu penjara? Mention targetnya! Contoh: `!penjara @user <alasan>`");
    }
    if (targetUser.id === authorId) return message.reply("Tidak bisa memenjarakan diri sendiri!");

    const processingMsg = await message.reply(`👮 Memeriksa data dan memproses penangkapan **${targetUser.username}**...`);

    try {
        const [authorData, targetData] = await Promise.all([
            api.getUser(authorId, authorUsername),
            api.getUser(targetUser.id, targetUser.username)
        ]);
        
        if (authorData.job?.toLowerCase() !== 'polisi') {
            return processingMsg.edit("👮 Fitur ini hanya untuk pemain yang bekerja sebagai Polisi.");
        }
        
        // ==================== PERBAIKAN DI SINI ====================
        const requiredWarns = 5;
        const targetWarns = targetData.warn || 0;

        // Cek apakah target memiliki cukup poin warn
        if (targetWarns < requiredWarns) {
            return processingMsg.edit(`❌ Gagal! **${targetUser.username}** tidak bisa dipenjara. Dia hanya memiliki **${targetWarns}** poin peringatan (butuh ${requiredWarns}).`);
        }
        // ==================== AKHIR PERBAIKAN ====================
        
        if (targetData.jail?.status && Date.now() < targetData.jail?.until) {
            return processingMsg.edit(`❗ **${targetUser.username}** sudah berada di dalam penjara.`);
        }

        // MODIFY: Ubah data target di memori
        targetData.jail = { status: true, reason: reason, until: Date.now() + JAIL_TIME };
        targetData.warn = 0; // Reset warn point setelah dipenjara
        
        authorData.jobexp = (authorData.jobexp || 0) + 1;

        // POST: Kirim kembali data yang sudah diperbarui
        await Promise.all([
            api.updateUser(authorId, authorData),
            api.updateUser(targetUser.id, targetData)
        ]);

        await processingMsg.edit(`✅ Berhasil memenjarakan **${targetUser.username}** selama 1 jam.\n**Alasan:** ${reason}`);
        
        await targetUser.send(`⛓️ Anda telah dipenjara oleh Polisi **${authorUsername}**!\n**Alasan:** ${reason}\nAnda tidak bisa menggunakan perintah RPG selama 1 jam.`).catch(() => {
            message.channel.send(`(Gagal mengirim DM notifikasi ke ${targetUser})`);
        });

    } catch (error) {
        console.error("[PENJARA CMD ERROR]", error);
        await processingMsg.edit(`❌ Terjadi kesalahan: ${error.message}`);
    }
  },
};