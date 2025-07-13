const { EmbedBuilder } = require("discord.js"); 
const fetch = require("node-fetch"); 
const config = require("../../config"); 
 
module.exports = { 
  prefix: "pinterest", 
  category: "internet", 
  aliases: ["pin"], 
  async execute(message, args, client) { 
    if (!args[0]) { 
      return message.reply( 
        `*🚩 Example:* \`${config.prefix || "!"}pinterest Zhao Lusi\`` 
      ); 
    } 
    await sendApiProcessing(message, "Pinterest"); 
 
    try { 
      const q = encodeURIComponent(args.join(" ")); 
      const apiKey = config.apikey_lann; 
      const response = await fetch( 
        `https://api.betabotz.eu.org/api/search/pinterest?text1=${q}&apikey=${apiKey}` 
      ); 
      const data = await response.json(); 
      const res = data.result; 
 
      if (!Array.isArray(res) || res.length < 1) { 
        return message.reply("Error, Foto Tidak Ditemukan"); 
      } 
 
      // Batasi maksimal 10 gambar 
      const images = res.slice(0, 3); 
 
      // Kirim embed dengan gambar-gambar Pinterest 
      for (const url of images) { 
        const embed = new EmbedBuilder() 
          .setColor("#67DFF4") 
          .setTitle("Pinterest Result") 
          .setDescription(`Hasil pencarian untuk: **${args.join(" ")}**`) 
          .setImage(url) 
          .setFooter({ text: "BetaBotz Pinterest Downloader" }); 
        await message.channel.send({ embeds: [embed] }); 
      } 
    } catch (e) { 
      console.error("[PINTEREST ERROR]", e); 
      await sendApiError(message, e, "Pinterest"); 
    } 
  }, 
}; 
