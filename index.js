// index.js
// Bot de Telegram para generar recetas con Groq + LLaMA 3, ignorando JSON y enviando Markdown bonito
// Usa variables de entorno: TELEGRAM_BOT_TOKEN, GROQ_API_KEY

import "dotenv/config";
import { Telegraf } from "telegraf";
import fetch from "node-fetch";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Escapa caracteres especiales de Markdown V2
function escapeMarkdownV2(text) {
  return text.replace(/([_*[\]\(\)~`>#+=|{}\.\-!])/g, "\\$1");
}

bot.start(ctx =>
  ctx.reply(
    '¡Hola! Envíame ingredientes, por ejemplo: "lentejas y calabaza", y te daré una receta.'
  )
);

bot.on("text", async ctx => {
  const ingredients = ctx.message.text.trim();
  const prompt = `Receta con ${ingredients}`;

  try {
    // Llamada a la API de Groq / OpenAI
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: `
Eres un chef creativo que habla en español. Cuando recibas ingredientes:
• Sugiere un solo plato original.
• Añade ingredientes extra a los que ya se te han dado paa completar la receta.
• Describe el plato en 2 o 3 líneas.
• Lista los ingredientes en viñetas.
• Explica los pasos numerados y bien explicados.
Nada de JSON, solo Markdown bien formateado con emojis.
            `.trim()
          },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await resp.json();
    let aiContent = data.choices?.[0]?.message?.content;
    if (!aiContent) throw new Error("Respuesta vacía de la IA");

    // Escapamos y enviamos tal cual en MarkdownV2
    const safeMd = escapeMarkdownV2(aiContent);
    await ctx.reply(safeMd, { parse_mode: "MarkdownV2" });

  } catch (err) {
    console.error(err);
    await ctx.reply("❌ Error al generar la receta. Intenta de nuevo más tarde.");
  }
});

bot
  .launch()
  .then(() => console.log("🤖 Bot en ejecución"))
  .catch(console.error);

// Manejo de shutdown limpio
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
