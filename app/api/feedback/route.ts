import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/lib/api-types";
import { getDb } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendTelegramMessage, buildFeedbackMessage } from "@/lib/telegram";
import { validateFeedbackPayload } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/feedback — пожелание с сайта (уходит в Telegram). */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`feedback:${ip}`, 3, 60_000).allowed) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Слишком много сообщений. Попробуйте через минуту." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>({ error: "Некорректный запрос." }, { status: 400 });
  }

  const honeypot =
    body && typeof body === "object" ? (body as { company?: unknown }).company : undefined;
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return NextResponse.json<ApiErrorResponse>({ error: "Сообщение отклонено." }, { status: 400 });
  }

  const parsed = validateFeedbackPayload(body);
  if (!parsed.ok) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Проверьте сообщение.", errors: parsed.errors },
      { status: 422 },
    );
  }

  const db = getDb();
  db.prepare("INSERT INTO feedback (id, name, phone, text, created_at) VALUES (?, ?, ?, ?, ?)").run(
    randomUUID(),
    parsed.value.name,
    parsed.value.phone,
    parsed.value.text,
    new Date().toISOString(),
  );

  const sent = await sendTelegramMessage(buildFeedbackMessage(parsed.value));

  return NextResponse.json(
    { ok: true, telegramSent: sent },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
