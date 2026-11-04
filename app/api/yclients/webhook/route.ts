import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendTelegramMessage } from "@/lib/telegram";
import { buildYclientsMessage } from "@/lib/yclients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Больше этого YCLIENTS не присылает; всё остальное — не наш запрос. */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * Секрет из настроек YCLIENTS может прийти только как часть адреса:
 * `https://mafia72.ru/api/yclients/webhook?token=...`. Заголовок тоже принимаем,
 * если он когда-нибудь появится. Пока переменная не задана, адрес открыт — так
 * проще поймать первое событие и увидеть его формат в Telegram.
 */
function isAuthorized(request: Request): boolean {
  const expected = process.env.YCLIENTS_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  const fromQuery = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const fromHeader =
    request.headers.get("x-yclients-token")?.trim() ||
    request.headers.get("x-webhook-token")?.trim() ||
    "";
  return fromQuery === expected || fromHeader === expected;
}

/** GET — проверка адреса: в настройках YCLIENTS достаточно увидеть ok. */
export async function GET() {
  return NextResponse.json(
    { ok: true, service: "yclients-webhook", accepts: "POST" },
    { headers: { "cache-control": "no-store" } },
  );
}

/** POST /api/yclients/webhook — событие из журнала YCLIENTS. */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const ip = clientIp(request);
  if (!rateLimit(`yclients:${ip}`, 120, 60_000).allowed) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 413 });
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = null;
  }

  const summary = buildYclientsMessage(payload, rawBody);

  // Сначала сохраняем: даже если Telegram недоступен, событие не потеряется.
  try {
    const db = await getDb();
    await db.execute({
      sql: "INSERT INTO yclients_events (id, received_at, body) VALUES (?, ?, ?)",
      args: [randomUUID(), new Date().toISOString(), rawBody.slice(0, MAX_BODY_BYTES)],
    });
  } catch (error) {
    console.error("[yclients] не удалось сохранить событие:", error);
  }

  const telegramSent = await sendTelegramMessage(summary);

  return NextResponse.json(
    { ok: true, telegramSent },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
