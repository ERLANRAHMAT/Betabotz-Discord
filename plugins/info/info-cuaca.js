const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const fetch = require("node-fetch");
const config = require("../../config");

const CUACA_HOURS = [7, 12, 18];
const WINDOW_MINUTES = 2;

let cuacaCache = {}; // Cache untuk menyimpan data cuaca sementara
let repliedChannels = {};
let lastLocation = {};

const majorCities = [
    'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Bekasi', 'Depok', 'Tangerang', 'Palembang',
    'Makassar', 'Semarang', 'Batam', 'Bogor', 'Padang', 'Pekanbaru', 'Malang', 'Yogyakarta'
];

async function fetchCuaca(location) {
    if (!location) return null;

    // Cek cache terlebih dahulu
    if (cuacaCache[location] && (Date.now() - cuacaCache[location].timestamp < 10 * 60 * 1000)) {
        return cuacaCache[location].data;
    }

    const url = `https://api.betabotz.eu.org/api/tools/cuaca?query=${encodeURIComponent(location)}&apikey=${config.apikey_lann}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data?.result) {
            cuacaCache[location] = { data: data.result, timestamp: Date.now() }; // Simpan ke cache
            return data.result;
        }
        return null;
    } catch (e) {
        console.error(`[Cuaca API] Gagal fetch:`, e);
        return null;
    }
}

function isWithinHourWindow(targetHour, now) {
    const target = new Date(now);
    target.setHours(targetHour, 0, 0, 0);
    return Math.abs(target.getTime() - now.getTime()) <= WINDOW_MINUTES * 60 * 1000;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cuaca")
    .setDescription("Lihat info cuaca atau atur pengingat cuaca otomatis.")
    .addStringOption(option =>
      option.setName('kota')
            .setDescription('Ketik nama kota atau pilih dari daftar.')
            .setRequired(true)
            .setAutocomplete(true)),

  category: "info",

  async autocomplete(interaction) {
      try {
        const focusedValue = interaction.options.getFocused();
        const filtered = majorCities.filter(city => city.toLowerCase().startsWith(focusedValue.toLowerCase())).slice(0, 25);
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
        );
      } catch (error) {
          console.error("[Cuaca Autocomplete] Gagal merespons:", error);
      }
  },

  async execute(interaction) {
    await interaction.deferReply();
    const location = interaction.options.getString('kota');
    
    const info = await fetchCuaca(location);
    if (!info) return interaction.editReply("❌ Tidak bisa mengambil data cuaca untuk lokasi tersebut.");

    lastLocation[interaction.channel.id] = location;
    cuacaCache[interaction.channel.id] = { date: new Date().toLocaleDateString("id-ID"), info };
    repliedChannels[interaction.channel.id] = {}; // Reset pengingat saat lokasi baru diatur

    const embed = new EmbedBuilder()
      .setColor("#67DFF4").setTitle(`🌤️ Info Cuaca Saat Ini (${info.location})`)
      .setDescription(`🌍 Negara: ${info.country}\n🌦️ Cuaca: ${info.weather}`)
      .addFields(
          { name: '🌡️ Suhu', value: `${info.currentTemp} (Min: ${info.minTemp} / Maks: ${info.maxTemp})`, inline: true },
          { name: '💧 Kelembapan', value: info.humidity, inline: true },
          { name: '🌬️ Angin', value: info.windSpeed, inline: true }
      )
      .setFooter({ text: `Info cuaca diatur untuk channel ini. Pengingat otomatis aktif.` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  },

  async handleMessage(message, client) {
    if (!message.guild || !message.channel || message.author.bot) return;
    const channelId = message.channel.id;
    const location = lastLocation[channelId];
    if (!location) return;

    const todayStr = new Date().toLocaleDateString("id-ID");
    if (!cuacaCache[channelId] || cuacaCache[channelId].date !== todayStr) {
        const info = await fetchCuaca(location);
        if (!info) return;
        cuacaCache[channelId] = { date: todayStr, info };
        repliedChannels[channelId] = {};
    }

    const now = new Date();
    if (!repliedChannels[channelId]) repliedChannels[channelId] = {};
    for (const hour of CUACA_HOURS) {
      if (repliedChannels[channelId][hour]) continue;
      if (isWithinHourWindow(hour, now)) {
        const info = cuacaCache[channelId].info;
        const embed = new EmbedBuilder().setColor("#67DFF4").setTitle(`🌤️ PENGINGAT CUACA (${info.location})`)
            .setDescription(`Cuaca saat ini: **${info.weather}** dengan suhu **${info.currentTemp}**.`);
        await message.channel.send({ embeds: [embed] });
        repliedChannels[channelId][hour] = true;
        break;
      }
    }
  },
};