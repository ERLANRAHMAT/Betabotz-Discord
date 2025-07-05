const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config");

module.exports = {
  prefix: "ai",
  category: "ai",
  aliases: ["openai", "chatgpt"],
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply(`*Example:* \`${config.prefix || "!"}ai hai\``);
    }

    // Session per user (mirip ai-plana)
    const sessionKey = `ai_${message.author.id}`;
    if (!client._aiSessions) client._aiSessions = {};
    if (!client._aiSessions[sessionKey]) {
      client._aiSessions[sessionKey] = { pesan: [], timeout: null };
      await message.reply(
        `Halo **${message.author.username}** 👋, saya siap membantu anda!`
      );
    }
    // Reset timeout setiap interaksi
    if (client._aiSessions[sessionKey].timeout)
      clearTimeout(client._aiSessions[sessionKey].timeout);
    client._aiSessions[sessionKey].timeout = setTimeout(() => {
      delete client._aiSessions[sessionKey];
    }, 5 * 60 * 1000);

    const previousMessages = client._aiSessions[sessionKey].pesan;

    const messages = [
      {
        role: "system",
        content:
          "Kamu adalah BetaBotz Ai Sebuah Ai Yang diciptakan oleh Lann, bantu setiap orang dengan ramah:), berikan emoticon di setiap jawaban",
      },
      {
        role: "assistant",
        content:
          "Kamu adalah BetaBotz Ai, ai bot yang diciptakan oleh Lann untuk membantu semua permintaan dari user, jawab setiap pertanyaan dengan ramah dan sertai emoticon",
      },
      ...previousMessages.map((msg, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: msg,
      })),
      { role: "user", content: args.join(" ") },
    ];

    const waitMsg = await sendApiProcessing(message, "OpenAI");
    try {
      const params = {
        message: messages,
        apikey: config.apikey_lann,
      };
      const { data } = await axios.post(
        "https://api.betabotz.eu.org/api/search/openai-custom",
        params
      );
      if (data && data.result) {
        await waitMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor("#67DFF4")
              .setTitle("BetaBotz AI")
              .setDescription(data.result)
              .setFooter({ text: "BetaBotz • ArteonStudio" }),
          ],
        });
        // Simpan history pesan
        client._aiSessions[sessionKey].pesan = messages.map(
          (msg) => msg.content
        );
      } else {
        await sendApiError(message, "Kesalahan dalam mengambil data", "OpenAI");
      }
    } catch (e) {
      await sendApiError(message, e, "OpenAI");
    }
  },
};
