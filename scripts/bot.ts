/**
 * Запуск бота в режиме long-polling (для разработки и VPS).
 *   npm run bot
 * Для serverless (Netlify/Vercel) используется вебхук: app/api/tg/route.ts.
 */

import { existsSync } from "node:fs";
import { createBot } from "../lib/bot/bot";
import { createProxyAgent } from "../lib/bot/proxy";

// Загружаем .env.local (Next.js делает это сам, а отдельному скрипту — нет).
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
  console.error("[bot] TELEGRAM_BOT_TOKEN не задан. Скопируйте .env.example в .env.local и заполните.");
  process.exit(1);
}

// Telegram с этой машины доступен только через локальный прокси.
const bot = createBot(token, createProxyAgent());
bot.catch((error) => {
  console.error("[bot] ошибка:", (error as { error?: unknown }).error ?? error);
});

bot.start({
  drop_pending_updates: true,
  onStart: (info) => console.log(`[bot] запущен как @${info.username}`),
});
