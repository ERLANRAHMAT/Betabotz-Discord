const { EmbedBuilder } = require('discord.js');
const { loadStoreDb, saveStoreDb } = require('../../store_handler.js');
const config = require('../../config.js');
const moment = require('moment-timezone');

// ==================== TEMPLATE LISTSTORE ====================
// Template diatur di sini agar mudah diubah.
const LIST_TEMPLATE = (userName, itemList) => `
🔥 **BetaBotz Hosting** 🔥  

Halo, ${userName}! Selamat datang di toko kami.
––––––––––––––––––––––––––  
📌 **Daftar Paket Panel:** 
╭──────────────────────────╮  
${itemList}
╰──────────────────────────╯  
––––––––––––––––––––––––––  

ℹ️ **Rules:**
•⁠  ⁠Dilarang untuk mining, DDOS, atau proxy.
•⁠  ⁠Dilarang menyebarkan data user/panel.
•⁠  ⁠Pelanggaran = Akun Dihapus.

✅ **Buildpack Terinstal:** 🛠️  
•⁠  ⁠FFMPEG, IMAGEMAGICK, PYTHON, PUPPETEER, PM2, NPM, YARN, DLL.  

Ketik nama item yang ingin Anda lihat detailnya.
Contoh: \`Starter 1\`
`;
// =========================================================

module.exports = {
  prefix: "store",
  category: "rpg",
  aliases: ["liststore", "addlist", "dellist", "editlist", "transaksi", "bayar", "proses", "done", "beli"],
  
  async execute(message, args, client) {
    const command = message.content.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();
    const guildId = message.guild.id;
    const isOwner = message.author.id === config.ownerId;

    const db = loadStoreDb();
    db[guildId] = db[guildId] || { items: [], transactions: [] };

    try {
        switch (command) {
            // --- Perintah Publik ---
            case 'liststore': {
                if (!db[guildId].items || db[guildId].items.length === 0) return message.reply("Toko untuk server ini masih kosong.");
                const itemList = db[guildId].items.map(item => `⇒ ${item.key}`).join('\n');
                const replyMessage = LIST_TEMPLATE(message.author.username, itemList);
                return message.reply(replyMessage);
            }
            case 'bayar': {
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF).setTitle("💳 Metode Pembayaran")
                    .setDescription("Silakan lakukan pembayaran ke salah satu metode di bawah ini. Setelah itu, kirim bukti pembayaran dengan caption **ID Transaksi** yang Anda dapatkan dari admin.")
                    .addFields({ name: "Dana", value: "081289694906" })
                    .setImage('https://files.catbox.moe/spv9di.jpg') // URL QRIS
                    .setFooter({ text: "Pastikan bukti transfer jelas dan menyertakan ID Transaksi." });
                return message.reply({ embeds: [embed] });
            }
            case 'beli': {
                const itemKey = args.join(' ').toLowerCase();
                if (!itemKey) return message.reply("Format salah. Contoh: `!beli Nama Item`");
                if (!db[guildId].items.some(item => item.key.toLowerCase() === itemKey)) return message.reply(`Item **${itemKey}** tidak ditemukan di toko ini.`);

                const transactionId = Math.random().toString(36).substring(2, 8).toUpperCase();
                const expiryTime = moment().tz('Asia/Jakarta').add(5, 'minutes').toISOString();
                
                db[guildId].transactions.push({ transactionId, userId: message.author.id, itemKey, expiryTime, status: 'pending' });
                saveStoreDb(db);

                await message.reply(`Transaksi berhasil dibuat!\n\nID Transaksi Anda: \`${transactionId}\`\n\nSilakan lakukan pembayaran dalam 5 menit melalui metode di \`!bayar\`, lalu kirim bukti pembayaran dengan caption ID ini.`);
                break;
            }

            // --- Perintah Khusus Owner ---
            case 'addlist': {
                if (!isOwner) return;
                const text = args.join(' ');
                if (!text.includes('|')) return message.reply(`Format salah. Contoh: \`!addlist Nama Item | Deskripsi Item\``);
                const [key, ...responseParts] = text.split('|').map(part => part.trim());
                const response = responseParts.join('|');
                if (!key || !response) return message.reply("Key dan respons tidak boleh kosong.");
                db[guildId].items.push({ key, response });
                saveStoreDb(db);
                return message.reply(`✅ Berhasil menambahkan **${key}** ke daftar toko!`);
            }
            case 'dellist': {
                if (!isOwner) return;
                const key = args.join(' ');
                if (!key) return message.reply("Harap tentukan item yang akan dihapus.");
                const initialLength = db[guildId].items.length;
                db[guildId].items = db[guildId].items.filter(item => item.key.toLowerCase() !== key.toLowerCase());
                if (db[guildId].items.length === initialLength) return message.reply(`Item **${key}** tidak ditemukan.`);
                saveStoreDb(db);
                return message.reply(`✅ Berhasil menghapus **${key}** dari toko.`);
            }
            case 'editlist': {
                if (!isOwner) return;
                const text = args.join(' ');
                if (!text.includes('|')) return message.reply(`Format salah. Contoh: \`!editlist Nama Item | Deskripsi Baru\``);
                const [key, ...responseParts] = text.split('|').map(part => part.trim());
                const newResponse = responseParts.join('|');
                const item = db[guildId].items.find(item => item.key.toLowerCase() === key.toLowerCase());
                if (!item) return message.reply(`Item **${key}** tidak ditemukan.`);
                item.response = newResponse;
                saveStoreDb(db);
                return message.reply(`✅ Berhasil mengedit item **${key}**.`);
            }
            case 'transaksi': {
                if (!isOwner) return;
                const targetUser = message.mentions.users.first();
                const itemKey = args.slice(1).join(' ').toLowerCase();
                if (!targetUser || !itemKey) return message.reply("Format salah. Contoh: `!transaksi @user Nama Item`");
                if (!db[guildId].items.some(item => item.key.toLowerCase() === itemKey)) return message.reply(`Item **${itemKey}** tidak ditemukan.`);
                const transactionId = Math.random().toString(36).substring(2, 8).toUpperCase();
                const expiryTime = moment().tz('Asia/Jakarta').add(5, 'minutes').toISOString();
                db[guildId].transactions.push({ transactionId, userId: targetUser.id, itemKey, expiryTime, status: 'pending' });
                saveStoreDb(db);
                await message.reply(`Transaksi dibuat untuk **${targetUser.username}**!\nID Transaksi: \`${transactionId}\`\nSilakan minta user melakukan pembayaran dalam 5 menit.`);
                break;
            }
            case 'proses':
            case 'done': {
                if (!isOwner) return;
                if (!message.reference) return message.reply("Harap reply ke pesan bukti pembayaran yang berisi ID Transaksi.");
                const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
                const transactionId = repliedMsg.content.trim().toUpperCase();
                const transactionIndex = db[guildId].transactions.findIndex(t => t.transactionId === transactionId);
                if (transactionIndex === -1) return message.reply("ID Transaksi tidak valid atau sudah diproses.");
                const transaction = db[guildId].transactions[transactionIndex];
                const buyer = await client.users.fetch(transaction.userId);
                if (command === 'proses') {
                    const item = db[guildId].items.find(item => item.key.toLowerCase() === transaction.itemKey);
                    await message.reply(`「 PROSES ADMIN 」\n\nPesanan **${item.key}** untuk ${buyer} sedang diproses!\n\nCatatan:\n${item.response}`);
                } else { // done
                    await message.reply(`「 TRANSAKSI SELESAI 」\n\nTerima kasih ${buyer} sudah berbelanja di toko kami!`);
                    db[guildId].transactions.splice(transactionIndex, 1);
                    saveStoreDb(db);
                }
                break;
            }
            // --- Default (Bantuan) ---
            default: {
                const helpEmbed = new EmbedBuilder().setColor(0x5865F2).setTitle("🏪 Bantuan Perintah Toko").addFields(
                    { name: "Untuk Semua Pengguna", value: "`!liststore` - Menampilkan semua item.\n`!bayar` - Menampilkan metode pembayaran.\n`!beli <nama_item>` - Membuat transaksi untuk diri sendiri.\n`<nama_item>` - Melihat detail item." },
                    { name: "Khusus Owner Bot", value: "`!addlist <nama> | <deskripsi>`\n`!dellist <nama>`\n`!editlist <nama> | <deskripsi_baru>`\n`!transaksi @user <nama_item>`\n`!proses` (reply bukti)\n`!done` (reply bukti)" }
                );
                return message.reply({ embeds: [helpEmbed] });
            }
        }
    } catch (e) {
        console.error("[STORE CMD ERROR]", e);
        message.reply(`❌ Terjadi kesalahan: ${e.message}`);
    }
  },

  handleMessage: async (message, client) => {
    if (message.author.bot || message.content.startsWith(config.prefix)) return;
    const guildId = message.guild.id;
    const db = loadStoreDb();
    const storeData = db[guildId]?.items || [];
    const keyword = message.content.toLowerCase().trim();
    const matchedItem = storeData.find(item => item.key.toLowerCase() === keyword);
    if (matchedItem) {
        return message.reply(matchedItem.response);
    }
  }
};
