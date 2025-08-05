const fs = require("fs");
const path = require("path");
const pluginFolders = require("./pluginFolders.config");

module.exports = function (client) {
  // Inisialisasi handler
  client.messageHandlers = [];
  client.autoHandlers = [];
  client.prefixCommands = new Map();
  client.slashCommands = new Map();

  // Fungsi untuk memuat file dari direktori tertentu
  function loadPluginsFromDir(dir, dirName) {
    console.log(`[HANDLER] Attempting to load from directory: ${dirName}`);
    try {
      if (!fs.existsSync(dir)) {
        console.warn(
          `[HANDLER] Directory does not exist: ${dirName}, skipping...`
        );
        return [];
      }
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
      if (files.length === 0) {
        console.log(`[HANDLER] No .js files found in: ${dirName}`);
      } else {
        console.log(`[HANDLER] Found ${files.length} .js files in: ${dirName}`);
      }
      return files;
    } catch (e) {
      console.error(`[HANDLER] Error reading directory ${dirName}:`, e.message);
      return [];
    }
  }

  // Fungsi untuk mendaftarkan plugin
  function registerPlugin(filePath, fileName) {
    try {
      const plugin = require(filePath);
      console.log(`[HANDLER] Processing file: ${fileName}`);

      // Register prefix command
      if (plugin.prefix && plugin.execute) {
        client.prefixCommands.set(plugin.prefix, plugin);
        console.log(`[HANDLER] Prefix command registered: ${plugin.prefix}`);
        if (plugin.aliases && Array.isArray(plugin.aliases)) {
          plugin.aliases.forEach((alias) => {
            client.prefixCommands.set(alias, plugin);
            console.log(`[HANDLER] Alias registered: ${alias}`);
          });
        }
      }

      // Register additional prefix commands (commands object)
      if (plugin.commands && typeof plugin.commands === "object") {
        for (const [cmd, fn] of Object.entries(plugin.commands)) {
          client.prefixCommands.set(cmd, {
            category: plugin.category,
            execute: fn,
          });
          console.log(`[HANDLER] Additional prefix command registered: ${cmd}`);
        }
      }

      // Register slash command
      if (plugin.data && plugin.execute) {
        if (Array.isArray(plugin.data)) {
          for (const dataObj of plugin.data) {
            if (dataObj && dataObj.name) {
              client.slashCommands.set(dataObj.name, plugin);
              console.log(
                `[HANDLER] Slash command registered: ${dataObj.name}`
              );
            }
          }
        } else if (plugin.data.name) {
          client.slashCommands.set(plugin.data.name, plugin);
          console.log(
            `[HANDLER] Slash command registered: ${plugin.data.name}`
          );
        }
      }

      // Register message handler
      if (typeof plugin.handleMessage === "function") {
        client.messageHandlers.push(plugin.handleMessage);
        console.log(`[HANDLER] Message handler registered for: ${fileName}`);
      }

      // Register auto handler
      if (typeof plugin.handleAuto === "function") {
        client.autoHandlers.push(plugin.handleAuto);
        console.log(`[HANDLER] Auto handler registered for: ${fileName}`);
      }
    } catch (e) {
      console.error(`[HANDLER] Error loading plugin ${fileName}:`, e.message);
    }
  }

  // Load plugins dari plugins/
  const pluginsDir = path.join(__dirname, "plugins");
  console.log(`[HANDLER] Loading from root directory: ${pluginsDir}`);
  const pluginFiles = loadPluginsFromDir(pluginsDir, "plugins");
  for (const file of pluginFiles) {
    const filePath = path.join(pluginsDir, file);
    registerPlugin(filePath, file);
  }

  // Load plugins dari subdirektori ( internet, ai, dll.)
  console.log(
    `[HANDLER] Scanning ${pluginFolders.length} folders: ${pluginFolders.join(
      ", "
    )}`
  );
  for (const folder of pluginFolders) {
    const folderPath = path.join(pluginsDir, folder);
    console.log(`[HANDLER] Checking folder: ${folderPath}`);
    const folderFiles = loadPluginsFromDir(folderPath, `plugins/${folder}`);
    for (const file of folderFiles) {
      const filePath = path.join(folderPath, file);
      registerPlugin(filePath, `${folder}/${file}`);
    }
  }

  console.log(
    `[HANDLER] Total prefix commands registered: ${client.prefixCommands.size}`
  );
  console.log(
    `[HANDLER] Total slash commands registered: ${client.slashCommands.size}`
  );
  console.log(
    `[HANDLER] Total message handlers registered: ${client.messageHandlers.length}`
  );
  console.log(
    `[HANDLER] Total auto handlers registered: ${client.autoHandlers.length}`
  );

  // Return data untuk registrasi ke API jika diperlukan
  return {
    prefixCommands: client.prefixCommands,
    slashCommands: client.slashCommands,
    messageHandlers: client.messageHandlers,
    autoHandlers: client.autoHandlers,
  };
};
