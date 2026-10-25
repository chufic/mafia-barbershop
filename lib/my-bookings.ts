/** Память браузера для страницы «Мои заявки» — только телефон и номера заявок. */

export const PHONE_STORAGE_KEY = "mafia.phone.v1";
export const BOOKING_IDS_KEY = "mafia.bookings.v1";

export function rememberPhone(phone: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PHONE_STORAGE_KEY, phone);
  } catch {
    // приватный режим — просто не запоминаем
  }
}

export function readRememberedPhone(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PHONE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberBooking(publicId: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readRememberedBookingIds();
    if (existing.includes(publicId)) return;
    const next = [publicId, ...existing].slice(0, 50);
    window.localStorage.setItem(BOOKING_IDS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function readRememberedBookingIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKING_IDS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
