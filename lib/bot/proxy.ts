/**
 * Локальный SNI-обход для Telegram.
 *
 * С этой машины api.telegram.org доступен только через локальный прокси
 * (WinINET `127.0.0.1:20809`). grammY по умолчанию использует node-fetch,
 * который системный прокси не наследует, поэтому подкладываем ему прокси-agent.
 * На serverless-деплое (Netlify) прокси не нужен — Telegram там доступен напрямую.
 */

import { HttpsProxyAgent } from "https-proxy-agent";

export function createProxyAgent(): HttpsProxyAgent<string> {
  const proxy = process.env.TELEGRAM_PROXY || process.env.HTTPS_PROXY || "http://127.0.0.1:20809";
  return new HttpsProxyAgent(proxy);
}
