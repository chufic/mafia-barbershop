/** Работа с заявками: создание, выборка по телефону, отмена. */

import { randomInt, randomUUID } from "node:crypto";
import { getMasterById } from "../data/masters";
import { getServiceById } from "../data/services";
import type { BookingDto, BookingServiceDto } from "./api-types";
import { getDb, num, str, type SqlRow } from "./db";
import {
  computeMasterAvailability,
  hasSlot,
  type BusyInterval,
} from "./slots";
import { addDays, toZoned, zonedToUtc, CANCEL_WINDOW_HOURS } from "./time";

export type BookingStatus = "new" | "cancelled" | "done";

export type BookingServiceSnapshot = BookingServiceDto;

export type BookingRecord = {
  id: string;
  publicId: string;
  name: string;
  phone: string;
  comment: string | null;
  masterId: string;
  masterName: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  services: BookingServiceSnapshot[];
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  source: string;
};

export type CreateBookingInput = {
  name: string;
  phone: string;
  comment: string | null;
  masterId: string;
  serviceIds: string[];
  startsAt: string;
  requestKey: string | null;
  source: string;
};

export type CreateBookingResult =
  | { ok: true; booking: BookingRecord; duplicate: boolean }
  | { ok: false; code: "slot_taken" | "invalid" | "unknown"; message: string };

export type CancelBookingResult =
  | { ok: true; booking: BookingRecord }
  | {
      ok: false;
      code: "not_found" | "forbidden" | "too_late" | "invalid";
      message: string;
    };

const SELECT_WITH_MASTER = `
  SELECT b.*, m.name AS master_name
  FROM bookings b
  LEFT JOIN masters m ON m.id = b.master_id
`;

/** Занятые интервалы за диапазон локальных дат (включительно). */
export function listBusyBetween(
  fromDate: string,
  toDate: string,
  masterId?: string,
): BusyInterval[] {
  const db = getDb();
  const lower = zonedToUtc(fromDate, "00:00").toISOString();
  const upper = zonedToUtc(addDays(toDate, 1), "00:00").toISOString();

  const rows = masterId
    ? db
        .prepare(
          `SELECT master_id, starts_at, ends_at FROM bookings
           WHERE status != 'cancelled' AND master_id = ? AND starts_at < ? AND ends_at > ?`,
        )
        .all(masterId, upper, lower)
    : db
        .prepare(
          `SELECT master_id, starts_at, ends_at FROM bookings
           WHERE status != 'cancelled' AND starts_at < ? AND ends_at > ?`,
        )
        .all(upper, lower);

  return rows.map((row) => ({
    masterId: str(row.master_id),
    startsAt: str(row.starts_at),
    endsAt: str(row.ends_at),
  }));
}

export function listBusyForDate(date: string, masterId?: string): BusyInterval[] {
  return listBusyBetween(date, date, masterId);
}

export function createBooking(
  input: CreateBookingInput,
  now: Date = new Date(),
): CreateBookingResult {
  const db = getDb();

  if (input.requestKey) {
    const existing = findByRequestKey(input.requestKey);
    if (existing) return { ok: true, booking: existing, duplicate: true };
  }

  const uniqueIds = [...new Set(input.serviceIds)];
  const services = uniqueIds
    .map((id) => getServiceById(id))
    .filter((service): service is NonNullable<typeof service> => Boolean(service));

  if (services.length === 0 || services.length !== uniqueIds.length) {
    return { ok: false, code: "invalid", message: "Услуги не найдены в каталоге." };
  }

  const master = getMasterById(input.masterId);
  if (!master || !master.isActive) {
    return { ok: false, code: "invalid", message: "Мастер недоступен для записи." };
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, code: "invalid", message: "Некорректная дата и время." };
  }

  const durationMin = services.reduce((sum, service) => sum + service.durationMin, 0);
  const totalPrice = services.reduce((sum, service) => sum + service.price, 0);
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
  const date = toZoned(startsAt).dateStr;
  const startsAtIso = startsAt.toISOString();
  const endsAtIso = endsAt.toISOString();

  const snapshot: BookingServiceSnapshot[] = services.map((service) => ({
    id: service.id,
    name: service.name,
    price: service.price,
    durationMin: service.durationMin,
  }));

  db.exec("BEGIN IMMEDIATE");
  try {
    const busy = listBusyForDate(date);
    const availability = computeMasterAvailability({
      date,
      durationMin,
      master,
      busy,
      now,
    });

    if (!hasSlot(availability, startsAtIso)) {
      db.exec("ROLLBACK");
      return {
        ok: false,
        code: "slot_taken",
        message: "Это время уже заняли. Выберите другое.",
      };
    }

    const id = randomUUID();
    const publicId = nextPublicId(startsAt);
    const createdAt = now.toISOString();

    const insert = db.prepare(`
      INSERT INTO bookings (
        id, public_id, name, phone, comment, master_id, starts_at, ends_at,
        duration_min, services_json, total_price, status, created_at, source, request_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
    `);

    insert.run(
      id,
      publicId,
      input.name,
      input.phone,
      input.comment,
      input.masterId,
      startsAtIso,
      endsAtIso,
      durationMin,
      JSON.stringify(snapshot),
      totalPrice,
      createdAt,
      input.source,
      input.requestKey,
    );

    db.exec("COMMIT");

    const created = findByPublicId(publicId);
    if (!created) {
      return { ok: false, code: "unknown", message: "Заявка создана, но не найдена." };
    }
    return { ok: true, booking: created, duplicate: false };
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // транзакция уже закрыта
    }

    if (isUniqueViolation(error) && input.requestKey) {
      const existing = findByRequestKey(input.requestKey);
      if (existing) return { ok: true, booking: existing, duplicate: true };
    }

    console.error("[bookings] create failed:", error);
    return { ok: false, code: "unknown", message: "Не удалось сохранить заявку." };
  }
}

export function getBookingsByPhone(phone: string, now: Date = new Date()): BookingRecord[] {
  const db = getDb();
  const rows = db
    .prepare(`${SELECT_WITH_MASTER} WHERE b.phone = ? ORDER BY b.starts_at DESC LIMIT 100`)
    .all(phone);

  return rows
    .map(mapRow)
    .sort((a, b) => {
      const aUpcoming = new Date(a.startsAt).getTime() >= now.getTime();
      const bUpcoming = new Date(b.startsAt).getTime() >= now.getTime();
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      return aUpcoming
        ? new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        : new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
    });
}

export function getBookingByPublicId(publicId: string): BookingRecord | null {
  return findByPublicId(publicId);
}

export function cancelBooking(
  publicId: string,
  phone: string,
  now: Date = new Date(),
): CancelBookingResult {
  const booking = findByPublicId(publicId);
  if (!booking) return { ok: false, code: "not_found", message: "Заявка не найдена." };
  if (booking.phone !== phone) {
    return { ok: false, code: "forbidden", message: "Телефон не совпадает с заявкой." };
  }
  if (booking.status === "cancelled") return { ok: true, booking };
  if (booking.status === "done") {
    return { ok: false, code: "invalid", message: "Визит уже прошёл." };
  }

  const hoursLeft = (new Date(booking.startsAt).getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft < CANCEL_WINDOW_HOURS) {
    return {
      ok: false,
      code: "too_late",
      message: `Отменить запись можно не позднее чем за ${CANCEL_WINDOW_HOURS} часа до визита. Позвоните нам: +7 912 398-08-80.`,
    };
  }

  const db = getDb();
  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE public_id = ?").run(publicId);
  const updated = findByPublicId(publicId);
  if (!updated) return { ok: false, code: "not_found", message: "Заявка не найдена." };
  return { ok: true, booking: updated };
}

export function bookingToDto(booking: BookingRecord, now: Date = new Date()): BookingDto {
  const start = toZoned(booking.startsAt);
  const end = toZoned(booking.endsAt);
  const canCancel =
    booking.status === "new" &&
    new Date(booking.startsAt).getTime() - now.getTime() >= CANCEL_WINDOW_HOURS * 3_600_000;

  return {
    publicId: booking.publicId,
    name: booking.name,
    phone: booking.phone,
    comment: booking.comment,
    masterId: booking.masterId,
    masterName: booking.masterName,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    date: start.dateStr,
    time: start.timeStr,
    endTime: end.timeStr,
    durationMin: booking.durationMin,
    services: booking.services,
    totalPrice: booking.totalPrice,
    status: booking.status,
    createdAt: booking.createdAt,
    canCancel,
  };
}

/** MF-YYMMDD-XXXX, дата — тюменская дата визита. */
export function generatePublicId(startsAt: Date): string {
  return nextPublicId(startsAt);
}

function nextPublicId(startsAt: Date): string {
  const db = getDb();
  const moment = toZoned(startsAt);
  const datePart = `${String(moment.year).slice(2)}${String(moment.month).padStart(2, "0")}${String(
    moment.day,
  ).padStart(2, "0")}`;
  const exists = db.prepare("SELECT 1 FROM bookings WHERE public_id = ?");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `MF-${datePart}-${randomInt(1000, 10_000)}`;
    if (!exists.get(candidate)) return candidate;
  }
  return `MF-${datePart}-${randomInt(10_000, 100_000)}`;
}

function findByPublicId(publicId: string): BookingRecord | null {
  const row = getDb()
    .prepare(`${SELECT_WITH_MASTER} WHERE b.public_id = ?`)
    .get(publicId);
  return row ? mapRow(row) : null;
}

function findByRequestKey(requestKey: string): BookingRecord | null {
  const row = getDb()
    .prepare(`${SELECT_WITH_MASTER} WHERE b.request_key = ?`)
    .get(requestKey);
  return row ? mapRow(row) : null;
}

function mapRow(row: SqlRow): BookingRecord {
  return {
    id: str(row.id),
    publicId: str(row.public_id),
    name: str(row.name),
    phone: str(row.phone),
    comment: row.comment === null || row.comment === undefined ? null : str(row.comment),
    masterId: str(row.master_id),
    masterName: str(row.master_name, "Мастер"),
    startsAt: str(row.starts_at),
    endsAt: str(row.ends_at),
    durationMin: num(row.duration_min, 60),
    services: parseServices(row.services_json),
    totalPrice: num(row.total_price),
    status: (str(row.status, "new") as BookingStatus) ?? "new",
    createdAt: str(row.created_at),
    source: str(row.source, "site"),
  };
}

function parseServices(value: unknown): BookingServiceSnapshot[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        id: str(item.id),
        name: str(item.name),
        price: num(item.price),
        durationMin: num(item.durationMin, 30),
      }))
      .filter((item) => item.id !== "" && item.name !== "");
  } catch {
    return [];
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}
