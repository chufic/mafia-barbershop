/** Уведомления в Telegram. Токен живёт только на сервере. */

import { connect } from "node:net";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { site } from "../data/site";
import type { BookingRecord } from "./bookings";
import { formatDuration, formatPrice } from "./format";
import { formatDateTimeRange, toZoned } from "./time";

const TELEGRAM_API = "https://api.telegram.org";

/** С этой машины api.telegram.org доступен только через локальный прокси (ByeDPI). */
let cachedProxy: string | null | undefined;

function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    socket.setTimeout(400);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function detectProxy(): Promise<string | null> {
  if (cachedProxy !== undefined) return cachedProxy;
  const explicit = process.env.TELEGRAM_PROXY || process.env.HTTPS_PROXY;
  if (explicit) {
    cachedProxy = explicit;
    return explicit;
  }
  cachedProxy = (await isPortOpen("127.0.0.1", 20809)) ? "http://127.0.0.1:20809" : null;
  return cachedProxy;
}

/** fetch к Telegram: через локальный прокси, если он доступен, иначе напрямую. */
async function telegramFetch(url: string, init: RequestInit): Promise<Response> {
  const proxy = await detectProxy();
  if (!proxy) return fetch(url, init);
  return undiciFetch(url, {
    ...init,
    dispatcher: new ProxyAgent(proxy),
  } as unknown as Parameters<typeof undiciFetch>[1]) as unknown as Response;
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim());
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildBookingMessage(booking: BookingRecord): string {
  const services = booking.services
    .map((service) => `${escapeHtml(service.name)} — ${formatPrice(service.price)}`)
    .join("; ");

  const lines = [
    "🔥 <b>Новая заявка — Мафия</b>",
    `<b>Имя:</b> ${escapeHtml(booking.name)}`,
    `<b>Телефон:</b> ${escapeHtml(booking.phone)}`,
    `<b>Услуги:</b> ${services}`,
    `<b>Итого:</b> ${formatPrice(booking.totalPrice)} · ${formatDuration(booking.durationMin)}`,
    `<b>Мастер:</b> ${escapeHtml(booking.masterName)}`,
    `<b>Когда:</b> ${escapeHtml(formatDateTimeRange(booking.startsAt, booking.endsAt))}`,
  ];

  if (booking.comment) lines.push(`<b>Комментарий:</b> ${escapeHtml(booking.comment)}`);
  lines.push(`<b>Заявка:</b> ${escapeHtml(booking.publicId)}`);

  return lines.join("\n");
}

export function buildCancellationMessage(booking: BookingRecord): string {
  const moment = toZoned(booking.startsAt);
  return [
    "❌ <b>Заявка отменена — Мафия</b>",
    `<b>Заявка:</b> ${escapeHtml(booking.publicId)}`,
    `<b>Имя:</b> ${escapeHtml(booking.name)}`,
    `<b>Телефон:</b> ${escapeHtml(booking.phone)}`,
    `<b>Когда:</b> ${escapeHtml(formatDateTimeRange(booking.startsAt, booking.endsAt))}`,
    `<b>Мастер:</b> ${escapeHtml(booking.masterName)}`,
    `<b>Дата визита:</b> ${moment.dateStr}`,
  ].join("\n");
}

export function buildFeedbackMessage(feedback: {
  name: string | null;
  phone: string | null;
  text: string;
}): string {
  return [
    "💬 <b>Пожелание с сайта — Мафия</b>",
    `<b>Имя:</b> ${escapeHtml(feedback.name ?? "не указано")}`,
    `<b>Телефон:</b> ${feedback.phone ? escapeHtml(feedback.phone) : "не указан"}`,
    `<b>Текст:</b> ${escapeHtml(feedback.text)}`,
    `<b>Сайт:</b> ${escapeHtml(site.url)}`,
  ].join("\n");
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    console.warn(
      "[telegram] TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы — сообщение не отправлено.",
    );
    console.warn("[telegram] Текст сообщения:\n" + text.replace(/<[^>]+>/g, ""));
    return false;
  }

  try {
    const response = await telegramFetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error("[telegram] sendMessage failed:", response.status, details.slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[telegram] sendMessage error:", error);
    return false;
  }
}

export async function notifyNewBooking(booking: BookingRecord): Promise<boolean> {
  return sendTelegramMessage(buildBookingMessage(booking));
}

export async function notifyCancellation(booking: BookingRecord): Promise<boolean> {
  return sendTelegramMessage(buildCancellationMessage(booking));
}
