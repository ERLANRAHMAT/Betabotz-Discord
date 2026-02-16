/*
Kode di bawah ini yang di komentar hanya untuk keperluan develop,
berfungsi agar ketika save maka bot akan restart otomatis.
tidak disarankan untuk diaktifkan di production,
*/

// if (process.env.NODE_ENV !== "production") {
//   try {
//     const chokidar = require("chokidar");
//     const { spawn } = require("child_process");
//     const watcher = chokidar.watch(".", {
//       ignored: /(^|[\/\\])\..|node_modules|logs|\.log$/,
//       persistent: true,
//       ignoreInitial: true,
//     });
//     watcher.on("all", (event, filePath) => {
//       console.log(`[WATCHER] File changed: ${filePath}. Restarting...`);

//       const args = process.argv.slice(1);
//       const child = spawn(process.argv[0], args, {
//         stdio: "inherit",
//         env: process.env,
//       });
//       watcher.close();
//       process.exit(0);
//     });
//   } catch (e) {
//     console.warn(
//       "[WATCHER] chokidar not installed. Run 'npm install chokidar' for auto-restart on save."
//     );
//   }
// }

// sampai sini

const banManager = require("./banManager");

const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
} = require("discord.js");
const config = require("./config");
const fs = require("fs");
const path = require("path");
const pluginFolders = require("./pluginFolders.config");
const antiBadwordManager = require("./plugins/antiBadwordManager");
const { werewolfManager } = require("./plugins/games/game-ww1");
// const birthdayHandler = require('./birthday_handler');
const api = require("./api_handler.js");
// const reminderHandler = require('./reminder_handler.js');
const afkHandler = require("./afk_handler.js");

const invites = new Map();
module.exports.invites = invites;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Penting untuk membaca isi pesan
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates, // Penting untuk bot musik
  ],
});

client.slashCommands = new Collection();
client.prefixCommands = new Collection();
client.musicModule = null; // Akan menyimpan module.exports dari music.js
client.asahOtakModule = null; // Akan menyimpan module.exports dari asahotak.js
client.execCommand = null; // Akan menyimpan module.exports dari exec.js
client.evalCommand = null; // Akan menyimpan module.exports dari eval.js

const pluginLoadErrors = [];
const loadedPlugins = [];

const userCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache selama 1 menit (60000 ms)

async function getCachedUser(userId, username) {
  const now = Date.now();
  if (
    userCache.has(userId) &&
    now - userCache.get(userId).timestamp < CACHE_DURATION
  ) {
    return userCache.get(userId).data;
  }
  // Jika tidak ada di cache atau sudah kedaluwarsa, ambil dari API
  const userData = await api.getUser(userId, username);
  userCache.set(userId, { data: userData, timestamp: now });
  return userData;
}
// Custom plugin loader with error handling and logs
function loadPluginsWithLogs(client) {
  const pluginsDir = path.join(__dirname, "plugins");
  const allPluginFiles = [];

  // Ambil file dari plugins/ (tingkat atas)
  const rootPluginFiles = fs
    .readdirSync(pluginsDir)
    .filter((f) => f.endsWith(".js"));
  rootPluginFiles.forEach((file) =>
    allPluginFiles.push({ path: path.join(pluginsDir, file), folder: null }),
  );

  // Ambil file dari subfolder
  for (const folder of pluginFolders) {
    const folderDir = path.join(pluginsDir, folder);
    if (fs.existsSync(folderDir)) {
      const folderFiles = fs
        .readdirSync(folderDir)
        .filter((f) => f.endsWith(".js"));
      folderFiles.forEach((file) =>
        allPluginFiles.push({
          path: path.join(folderDir, file),
          folder: folder,
        }),
      );
    } else {
      console.warn(
        `[PLUGIN LOADER] Direktori tidak ditemukan: plugins/${folder}, melewati...`,
      );
    }
  }

  client.messageHandlers = []; // Untuk plugin dengan handleMessage
  client.autoHandlers = []; // Untuk plugin dengan handleAuto

  for (const { path: filePath, folder: parentFolder } of allPluginFiles) {
    const fileName = path.basename(filePath);
    try {
      const plugin = require(filePath);
      loadedPlugins.push(
        parentFolder
          ? `plugins/${parentFolder}/${fileName}`
          : `plugins/${fileName}`,
      );

      // Simpan referensi ke modul musik jika terdeteksi
      if (plugin.prefix === "play" && plugin.subCommands) {
        client.musicModule = plugin;
        console.log(`[PLUGIN] Music module loaded: ${fileName}`);
      }
      // Simpan referensi ke modul asahotak jika terdeteksi
      if (plugin.prefix === "asahotak" && plugin.subCommands) {
        client.asahOtakModule = plugin;
        console.log(`[PLUGIN] Asah Otak module loaded: ${fileName}`);
      }
      // Simpan referensi ke perintah owner
      if (fileName === "exec.js") client.execCommand = plugin;
      if (fileName === "eval.js") client.evalCommand = plugin;

      // Registrasi prefix commands (utama)
      if (plugin.prefix && typeof plugin.execute === "function") {
        client.prefixCommands.set(plugin.prefix, plugin);
        console.log(`[PLUGIN] Registered prefix command: ${plugin.prefix}`);
        if (plugin.aliases && Array.isArray(plugin.aliases)) {
          plugin.aliases.forEach((alias) => {
            client.prefixCommands.set(alias, plugin);
            console.log(`[PLUGIN] Registered alias: ${alias}`);
          });
        }
      }
      // Registrasi sub-commands sebagai perintah/alias langsung jika diinginkan
      if (plugin.subCommands && typeof plugin.subCommands === "object") {
        for (const [subCmdName, subCmdData] of Object.entries(
          plugin.subCommands,
        )) {
          if (typeof subCmdData.handler === "function") {
            // Pastikan ada fungsi handler
            // Daftarkan sub-command itu sendiri sebagai perintah utama
            // Ini memungkinkan `!toka` atau `!skip` langsung berfungsi
            // Buat objek perintah temporer yang bisa dieksekusi
            const executableSubCommand = { execute: subCmdData.handler };

            client.prefixCommands.set(subCmdName, executableSubCommand);
            console.log(
              `[PLUGIN] Registered sub-command directly: ${subCmdName} (from ${fileName})`,
            );

            // Daftarkan juga alias-aliasnya
            if (subCmdData.aliases && Array.isArray(subCmdData.aliases)) {
              subCmdData.aliases.forEach((alias) => {
                client.prefixCommands.set(alias, executableSubCommand); // Gunakan objek yang sama
                console.log(
                  `[PLUGIN] Registered alias for sub-command: ${alias} (from ${fileName})`,
                );
              });
            }
          }
        }
      }

      // Registrasi slash commands
      if (plugin.data && typeof plugin.execute === "function") {
        if (Array.isArray(plugin.data)) {
          for (const dataObj of plugin.data) {
            if (dataObj && dataObj.name) {
              client.slashCommands.set(dataObj.name, plugin);
              console.log(
                `[SLASH] Registered: /${dataObj.name} from ${fileName}`,
              );
            }
          }
        } else if (plugin.data.name) {
          client.slashCommands.set(plugin.data.name, plugin);
          console.log(
            `[SLASH] Registered: /${plugin.data.name} from ${fileName}`,
          );
        }
      }

      // Registrasi handler pesan umum
      if (typeof plugin.handleMessage === "function") {
        client.messageHandlers.push(plugin.handleMessage);
        console.log(`[PLUGIN] Registered message handler for: ${fileName}`);
      }
      // Registrasi handler auto
      if (typeof plugin.handleAuto === "function") {
        client.autoHandlers.push(plugin.handleAuto);
        console.log(`[PLUGIN] Registered auto handler for: ${fileName}`);
      }
    } catch (err) {
      pluginLoadErrors.push({
        file: parentFolder
          ? `plugins/${parentFolder}/${fileName}`
          : `plugins/${fileName}`,
        error: err,
      });
      console.error(`[PLUGIN] Failed to load ${fileName}:`, err.message);
    }
  }
}

loadPluginsWithLogs(client);

// Satu event handler saja untuk semua pesan masuk
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  // [LOGGING] Mulai timer untuk seluruh proses messageCreate
  console.time(`[PERF] Total Message: ${message.content.slice(0, 20)}`);

  console.log(
    `[${message.guild?.name}] #${message.channel?.name} <${message.author.tag}>: ${message.content}`,
  );

  try {
    //afk handler uji coba jika ini membuat maslah pada slash command bisa di comment
    afkHandler.handleMessage(message, client);
    
    // [LOGGING] Ukur waktu pengambilan data user
    console.time(`[PERF] getCachedUser`);
    const userData = await getCachedUser(
      message.author.id,
      message.author.username,
    );
    console.timeEnd(`[PERF] getCachedUser`);

    // ... (Pengecekan ban & penjara)

    // --- Penanganan Handler Plugin Umum (handleMessage, handleAuto) ---
    if (client.messageHandlers) {
      for (const handler of client.messageHandlers) {
        // [LOGGING] Ukur waktu setiap message handler
        const handlerName = handler.name || "anonymousHandler";
        console.time(`[PERF] Message Handler: ${handlerName}`);
        try {
          await handler(message, client);
        } catch (err) {
          console.error(`[HANDLER ERROR] ${handlerName}:`, err);
        }
        console.timeEnd(`[PERF] Message Handler: ${handlerName}`);
      }
    }

    // --- Penanganan Perintah Prefix ---
    if (config.prefix && message.content.startsWith(config.prefix)) {
      const args = message.content
        .slice(config.prefix.length)
        .trim()
        .split(/ +/);
      const commandName = args.shift().toLowerCase();
      const command = client.prefixCommands.get(commandName);

      if (command) {
        // [LOGGING] Ukur waktu eksekusi perintah
        console.time(`[PERF] Command: !${commandName}`);
        await command.execute(message, args, client);
        console.timeEnd(`[PERF] Command: !${commandName}`);
      }
    }
  } catch (error) {
    console.error("[MessageCreate Critical Error]", error);
  } finally {
    // [LOGGING] Hentikan timer untuk seluruh proses
    console.timeEnd(`[PERF] Total Message: ${message.content.slice(0, 20)}`);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return; // Hanya tangani slash command

  // [LOGGING] Mulai timer untuk seluruh proses interaksi
  console.time(`[PERF] Total Interaction: /${interaction.commandName}`);

  const command = client.slashCommands.get(interaction.commandName);
  if (!command) return;

  try {
    // [LOGGING] Ukur waktu pengambilan data user
    console.time(`[PERF] getCachedUser (Interaction)`);
    const userData = await getCachedUser(
      interaction.user.id,
      interaction.user.username,
    );
    console.timeEnd(`[PERF] getCachedUser (Interaction)`);

    // ... (Pengecekan ban & penjara)

    // [LOGGING] Ukur waktu eksekusi perintah
    console.time(`[PERF] Command: /${interaction.commandName}`);
    await command.execute(interaction, client);
    console.timeEnd(`[PERF] Command: /${interaction.commandName}`);
  } catch (error) {
    // ... (Error handling Anda)
  } finally {
    // [LOGGING] Hentikan timer untuk seluruh proses
    console.timeEnd(`[PERF] Total Interaction: /${interaction.commandName}`);
  }
});

// Event yang dijalankan saat bot siap (ready)
client.once("clientReady", async () => {
  // ==================== PERUBAHAN UTAMA ====================

  // 1. console.clear() dipindahkan ke paling atas
  console.clear();
  // birthdayHandler.init(client);
  banManager.loadBans();
  antiBadwordManager.loadConfig();
  // reminderHandler.init(client);
  const banner = `
=========================================================
██████╗ ███████╗████████╗ █████╗ ██████╗  ██████╗ ████████╗███████╗
██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝╚══███╔╝
██████╔╝█████╗     ██║   ███████║██████╔╝██║   ██║   ██║     ███╔╝ 
██╔══██╗██╔══╝     ██║   ██╔══██║██╔══██╗██║   ██║   ██║    ███╔╝  
██████╔╝███████╗   ██║   ██║  ██║██████╔╝╚██████╔╝   ██║   ███████╗
╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═════╝  ╚═════╝    ╚═╝   ╚══════╝
=========================================================
VIRTUNIX Discord - danafxc.my.id
Prefix: ${config.prefix}
Owner: ${config.ownerId}
=========================================================
`;

  console.log(banner);
  console.log(
    `Logged in as ${client.user.tag} at ${new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
    })}`,
  );
  client.user.setPresence({
    activities: [{ name: "/menu", type: 1 }],
    status: "online",
  });

  // Log ringkasan plugin (sudah benar)
  console.log("========== Ringkasan Pemuatan Plugin ==========");
  // 'loadedPlugins' dan 'pluginLoadErrors' harus didefinisikan di atas (di dalam 'loadPluginsWithLogs')
  // Pastikan variabel ini dapat diakses di sini.
  // loadedPlugins.forEach((p) => console.log(`✔ Dimuat: ${p}`));
  // if (pluginLoadErrors.length) { /* ... */ }
  // Bagian untuk mengambil semua data slash command (sudah benar)
  const rest = new REST({ version: "10" }).setToken(config.token);
  const commands = [];
  const commandNames = new Set();
  for (const plugin of client.slashCommands.values()) {
    if (plugin.data) {
      // Logika Anda untuk mengumpulkan 'commands' sudah benar
      if (Array.isArray(plugin.data)) {
        for (const dataObj of plugin.data) {
          if (dataObj?.name && !commandNames.has(dataObj.name)) {
            commands.push(dataObj.toJSON());
            commandNames.add(dataObj.name);
          }
        }
      } else if (plugin.data.name && !commandNames.has(plugin.data.name)) {
        commands.push(plugin.data.toJSON());
        commandNames.add(plugin.data.name);
      }
    }
  }

  // 2. Blok try...catch yang benar untuk mendaftarkan slash command
  try {
    console.log(`Mencoba mendaftarkan ${commands.length} slash command...`);
    if (config.guildID) {
      // Untuk guild/server spesifik (mode development)
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, config.guildID),
        { body: commands },
      );
      console.log(
        `✅ Slash commands berhasil terdaftar untuk guild ${config.guildID}.`,
      );
    } else {
      // Untuk global (mode production)
      await rest.put(Routes.applicationCommands(client.user.id), {
        body: commands,
      });
      console.log("✅ Slash commands berhasil terdaftar secara global.");
    }
  } catch (err) {
    // 3. Penanganan error yang lebih baik digabungkan di sini
    if (err.code === 50001) {
      // Error 'Missing Access'
      console.error("❌ GAGAL MENDAFTARKAN SLASH COMMAND: MISSING ACCESS");
      console.error(
        "-------------------------------------------------------------------",
      );
      console.error(
        "SOLUSI: Bot ini diundang ke server tanpa izin yang benar/ belum sama sekali.",
      );
      console.error(
        "UTAMA: Pastikan bot sudah masuk ke server dengan izin yang benar.",
      );
      console.error("=== JIKA SUDAH MASUK DAN MASIH ERROR MAKA ===");
      console.error("1. Kick bot dari server Discord Anda.");
      console.error(
        "2. Undang kembali menggunakan link dari Discord Developer Portal.",
      );
      console.error(
        '3. Pastikan Anda mencentang scope "bot" DAN "applications.commands".',
      );
      console.error(
        "-------------------------------------------------------------------",
      );
    } else {
      // Untuk error lainnya
      console.error("Gagal mendaftarkan slash commands:", err);
    }
  }

  // Bagian untuk cache invites (sudah benar)
  for (const guild of client.guilds.cache.values()) {
    const guildInvites = await guild.invites.fetch().catch(() => new Map());
    // Pastikan 'invites' sudah di-define di atas (const invites = new Map();)
    invites.set(
      guild.id,
      new Map(guildInvites.map((inv) => [inv.code, inv.uses])),
    );
    console.log(`[INVITES] Meng-cache invite untuk guild ${guild.name}`);
  }
});

client.on("guildMemberAdd", async (member) => {
  for (const plugin of client.slashCommands.values()) {
    if (typeof plugin.handleGuildMemberAdd === "function") {
      try {
        await plugin.handleGuildMemberAdd(member, client);
      } catch (err) {
        console.error(
          `Error di handleGuildMemberAdd untuk ${member.user.tag}:`,
          err,
        );
      }
    }
  }
});

global.sendApiError = async function (message, error, context = "API") {
  let errMsg = typeof error === "string" ? error : error?.message || error;
  if (typeof errMsg === "string") {
    errMsg = errMsg.replace(/apikey=([a-zA-Z0-9_-]+)/gi, "apikey=****");
    errMsg = errMsg.replace(/apikey%3D([a-zA-Z0-9_-]+)/gi, "apikey%3D****");
    errMsg = errMsg.replace(/apikey%3d([a-zA-Z0-9_-]+)/gi, "apikey%3d****");
    errMsg = errMsg.replace(/apikey:([a-zA-Z0-9_-]+)/gi, "apikey:****");
    errMsg = errMsg.replace(/apikey":"([a-zA-Z0-9_-]+)"/gi, 'apikey":"****"');
  }
  if (errMsg && errMsg.length > 1500)
    errMsg = errMsg.slice(0, 1500) + "\n... (terpotong)";
  await message.reply({
    embeds: [
      {
        color: 0xe74c3c,
        title: `❌ ${context} Error`,
        description: `Terjadi kesalahan saat memproses data dari ${context}.\n\n\`\`\`\n${errMsg}\n\`\`\``,
        footer: { text: "BetaBotz • ArteonStudio" },
      },
    ],
  });
};

global.sendApiProcessing = async function (message, context = "API") {
  return await message.reply({
    embeds: [
      {
        color: 0x3498db,
        title: `⏳ Memproses Data`,
        description: `Sedang memproses data dari ${context}...\nMohon tunggu beberapa saat.`,
        footer: { text: "BetaBotz • ArteonStudio" },
      },
    ],
  });
};

client.login(config.token);
