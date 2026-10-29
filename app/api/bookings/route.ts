import { NextResponse } from "next/server";
import type { ApiErrorResponse, BookingsListResponse, CreateBookingResponse } from "@/lib/api-types";
import {
  bookingToDto,
  createBooking,
  getBookingsByPhone,
} from "@/lib/bookings";
import { normalizePhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { notifyNewBooking } from "@/lib/telegram";
import { validateBookingPayload } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_000;

/** GET /api/bookings?phone=+79123980880 — заявки по номеру. */
export async function GET(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`bookings-get:${ip}`, 15, 60_000).allowed) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Слишком много запросов. Попробуйте через минуту." },
      { status: 429 },
    );
  }

  const rawPhone = new URL(request.url).searchParams.get("phone") ?? "";
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Введите телефон в формате +7 912 000-00-00." },
      { status: 400 },
    );
  }

  const bookings = (await getBookingsByPhone(phone)).map((booking) => bookingToDto(booking));
  return NextResponse.json<BookingsListResponse>(
    { bookings },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST /api/bookings — создание заявки. */
export async function POST(request: Request) {
  const ip = clientIp(request);

  const limit = rateLimit(`booking-post:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json<ApiErrorResponse>(
      {
        error: `Слишком много попыток. Подождите ${limit.retryAfterSec} с и попробуйте снова.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json<ApiErrorResponse>({ error: "Слишком большой запрос." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Некорректный формат запроса." },
      { status: 400 },
    );
  }

  // honeypot: скрытое поле, которое заполняют только боты
  const honeypot =
    body && typeof body === "object" ? (body as { company?: unknown }).company : undefined;
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Не удалось отправить заявку. Попробуйте ещё раз." },
      { status: 400 },
    );
  }

  const parsed = validateBookingPayload(body);
  if (!parsed.ok) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Проверьте данные формы.", errors: parsed.errors, code: "validation" },
      { status: 422 },
    );
  }

  const result = await createBooking({
    name: parsed.value.name,
    phone: parsed.value.phone,
    comment: parsed.value.comment,
    masterId: parsed.value.masterId,
    serviceIds: parsed.value.serviceIds,
    startsAt: parsed.value.startsAt,
    requestKey: parsed.value.requestKey,
    source: parsed.value.source,
  });

  if (!result.ok) {
    const status = result.code === "slot_taken" ? 409 : result.code === "invalid" ? 422 : 500;
    return NextResponse.json<ApiErrorResponse>(
      { error: result.message, code: result.code },
      { status },
    );
  }

  let telegramSent = false;
  if (!result.duplicate) {
    telegramSent = await notifyNewBooking(result.booking);
  }

  const payload: CreateBookingResponse = {
    booking: bookingToDto(result.booking),
    duplicate: result.duplicate,
    telegramSent,
  };

  return NextResponse.json(payload, {
    status: result.duplicate ? 200 : 201,
    headers: { "Cache-Control": "no-store" },
  });
}
