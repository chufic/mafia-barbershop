/**
 * Вебхук Telegram-бота для serverless (Netlify/Vercel).
 *
 * Настройка вебхука (после деплоя):
 *   curl "https://api.telegram.org/bot<ТОКЕН>/setWebhook?url=<SITE_URL>/api/tg&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
 *
 * Логика бота — в lib/bot/bot.ts (общая с long-polling режимом).
 */

import { webhookCallback } from "grammy";
import { createBot } from "@/lib/bot/bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

export async function POST(request: Request): Promise<Response> {
  if (!token) {
    return new Response("Telegram bot not configured (TELEGRAM_BOT_TOKEN)", { status: 503 });
  }
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const bot = createBot(token);
  const handler = webhookCallback(bot, "std/http", secret ? { secretToken: secret } : {});
  return handler(request);
}

export async function GET(): Promise<Response> {
  return new Response(token ? "Telegram bot webhook is configured" : "TELEGRAM_BOT_TOKEN is not set", {
    status: token ? 200 : 503,
  });
}
