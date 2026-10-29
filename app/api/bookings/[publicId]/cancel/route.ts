import { NextResponse } from "next/server";
import type { ApiErrorResponse, CancelBookingResponse } from "@/lib/api-types";
import { bookingToDto, cancelBooking, getBookingByPublicId } from "@/lib/bookings";
import { normalizePhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { notifyCancellation } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/bookings/:publicId/cancel — отмена не позднее чем за 2 часа. */
export async function POST(
  request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  const ip = clientIp(request);
  if (!rateLimit(`cancel:${ip}`, 10, 60_000).allowed) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Слишком много запросов. Попробуйте через минуту." },
      { status: 429 },
    );
  }

  const { publicId } = await context.params;
  if (!publicId || publicId.length > 32) {
    return NextResponse.json<ApiErrorResponse>({ error: "Заявка не найдена." }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const rawPhone =
    body && typeof body === "object" ? (body as { phone?: unknown }).phone : undefined;
  const phone = typeof rawPhone === "string" ? normalizePhone(rawPhone) : null;
  if (!phone) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Укажите телефон, на который оформлена запись.", code: "phone" },
      { status: 400 },
    );
  }

  const before = await getBookingByPublicId(publicId);
  const result = await cancelBooking(publicId, phone);

  if (!result.ok) {
    const status =
      result.code === "not_found" ? 404 : result.code === "forbidden" ? 403 : 409;
    return NextResponse.json<ApiErrorResponse>(
      { error: result.message, code: result.code },
      { status },
    );
  }

  if (before?.status === "new" && result.booking.status === "cancelled") {
    await notifyCancellation(result.booking);
  }

  return NextResponse.json<CancelBookingResponse>(
    { booking: bookingToDto(result.booking) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
