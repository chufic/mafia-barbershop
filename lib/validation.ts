/** Серверная валидация входящих данных. Без внешних схем — простые понятные правила. */

import { MAX_CART_DURATION_MIN, MAX_CART_SERVICES } from "./cart";
import { getMasterById } from "../data/masters";
import { getServiceById } from "../data/services";
import { normalizePhone } from "./phone";
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  isValidDateString,
  isValidTimeString,
  todayDateStr,
  toZoned,
  zonedToUtc,
} from "./time";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

export type BookingPayload = {
  name: string;
  phone: string;
  comment: string | null;
  masterId: string;
  serviceIds: string[];
  startsAt: string;
  requestKey: string | null;
  source: string;
};

export type FeedbackPayload = {
  name: string | null;
  phone: string | null;
  text: string;
};

const NAME_RE = /[\p{L}]/u;
const KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function cleanName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

export function validateBookingPayload(input: unknown): ValidationResult<BookingPayload> {
  const body = asRecord(input);
  const errors: Record<string, string> = {};

  const name = cleanName(body.name);
  if (name.length < 2) {
    errors.name = "Напишите имя — минимум 2 символа.";
  } else if (name.length > 40) {
    errors.name = "Имя слишком длинное — до 40 символов.";
  } else if (!NAME_RE.test(name)) {
    errors.name = "Имя должно содержать хотя бы одну букву.";
  }

  const rawPhone = typeof body.phone === "string" ? body.phone : "";
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    errors.phone = "Телефон в формате +7 912 000-00-00.";
  }

  let comment: string | null = null;
  if (typeof body.comment === "string" && body.comment.trim().length > 0) {
    const trimmed = body.comment.trim();
    if (trimmed.length > 500) {
      errors.comment = "Комментарий — до 500 символов.";
    } else {
      comment = trimmed;
    }
  }

  if (body.consent !== true) {
    errors.consent = "Без согласия на обработку данных записать нельзя.";
  }

  const masterId = typeof body.masterId === "string" ? body.masterId.trim() : "";
  const master = getMasterById(masterId);
  if (!master || !master.isActive) {
    errors.masterId = "Выберите мастера.";
  }

  const rawServices = Array.isArray(body.serviceIds) ? body.serviceIds : [];
  const serviceIds = [...new Set(rawServices.filter((id): id is string => typeof id === "string"))];
  if (serviceIds.length === 0) {
    errors.serviceIds = "Выберите хотя бы одну услугу.";
  } else if (serviceIds.length > MAX_CART_SERVICES) {
    errors.serviceIds = `Максимум ${MAX_CART_SERVICES} услуги в одной записи.`;
  } else if (serviceIds.some((id) => !getServiceById(id))) {
    errors.serviceIds = "Одна из услуг больше недоступна — обновите выбор.";
  } else {
    const duration = serviceIds.reduce(
      (sum, id) => sum + (getServiceById(id)?.durationMin ?? 0),
      0,
    );
    if (duration > MAX_CART_DURATION_MIN) {
      errors.serviceIds = "Суммарная длительность — не больше 4 часов.";
    }
  }

  const startsAtRaw = typeof body.startsAt === "string" ? body.startsAt.trim() : "";
  const startsAtDate = new Date(startsAtRaw);
  if (!startsAtRaw || Number.isNaN(startsAtDate.getTime())) {
    errors.startsAt = "Выберите дату и время.";
  } else if (startsAtDate.getTime() < Date.now()) {
    errors.startsAt = "Это время уже прошло — выберите другое.";
  } else {
    const localDate = toZoned(startsAtDate).dateStr;
    const lastDate = addDays(todayDateStr(), BOOKING_HORIZON_DAYS - 1);
    if (localDate > lastDate) {
      errors.startsAt = "Онлайн-запись открыта на 30 дней вперёд.";
    }
  }

  let requestKey: string | null = null;
  if (typeof body.requestKey === "string" && body.requestKey.trim().length > 0) {
    if (KEY_RE.test(body.requestKey.trim())) {
      requestKey = body.requestKey.trim();
    }
  }

  const source = body.source === "my" ? "my" : "site";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      phone: phone as string,
      comment,
      masterId,
      serviceIds,
      startsAt: startsAtDate.toISOString(),
      requestKey,
      source,
    },
  };
}

export function validateFeedbackPayload(input: unknown): ValidationResult<FeedbackPayload> {
  const body = asRecord(input);
  const errors: Record<string, string> = {};

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 5) {
    errors.text = "Напишите пожелание — минимум 5 символов.";
  } else if (text.length > 1000) {
    errors.text = "Слишком длинно — до 1000 символов.";
  }

  let name: string | null = null;
  if (typeof body.name === "string" && body.name.trim().length > 0) {
    const cleaned = cleanName(body.name);
    if (cleaned.length > 40) errors.name = "Имя — до 40 символов.";
    else name = cleaned;
  }

  let phone: string | null = null;
  if (typeof body.phone === "string" && body.phone.trim().length > 0) {
    phone = normalizePhone(body.phone);
    if (!phone) errors.phone = "Телефон в формате +7 912 000-00-00.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, phone, text } };
}

/** Параметры /api/slots. */
export function parseSlotsParams(params: URLSearchParams):
  | {
      ok: true;
      date: string;
      durationMin: number;
      masterId: string;
    }
  | { ok: false; error: string } {
  const rawDate = params.get("date") ?? "";
  if (!isValidDateString(rawDate)) {
    return { ok: false, error: "Некорректная дата. Ожидается формат YYYY-MM-DD." };
  }

  const rawDuration = Number(params.get("duration") ?? "60");
  if (!Number.isFinite(rawDuration) || rawDuration <= 0 || rawDuration > MAX_CART_DURATION_MIN) {
    return { ok: false, error: "Некорректная длительность услуги." };
  }

  const masterId = params.get("masterId") ?? "any";
  if (masterId !== "any" && !getMasterById(masterId)) {
    return { ok: false, error: "Мастер не найден." };
  }

  return { ok: true, date: rawDate, durationMin: Math.round(rawDuration), masterId };
}

export function validTimeOrNull(value: string | null): string | null {
  return value && isValidTimeString(value) ? value : null;
}

export function isoFromSlot(date: string, time: string): string {
  return zonedToUtc(date, time).toISOString();
}
