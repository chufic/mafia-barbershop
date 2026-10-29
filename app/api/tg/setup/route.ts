import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tg/setup — one-time protected Telegram webhook registration.
 * Authorization: Bearer <TELEGRAM_WEBHOOK_SECRET>
 * The target URL is always the configured public site; callers cannot point
 * the bot at an arbitrary URL.
 */
export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!token || !secret || !siteUrl) {
    return NextResponse.json({ ok: false, error: "Telegram webhook environment is incomplete." }, { status: 503 });
  }

  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const webhookUrl = new URL("/api/tg", siteUrl).toString();
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    const payload = (await response.json()) as { ok?: boolean; description?: string; result?: boolean };
    if (!response.ok || !payload.ok) {
      return NextResponse.json(
        { ok: false, error: payload.description ?? "Telegram rejected setWebhook." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, webhookUrl }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Telegram connection failed." },
      { status: 502 },
    );
  }
}
