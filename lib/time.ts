/**
 * Работа со временем в часовом поясе Тюмени (Asia/Yekaterinburg, UTC+5).
 * Время хранится в UTC (ISO-строки), отображается — в тюменском.
 * Переходов на летнее время в России нет, поэтому смещение фиксированное.
 */

export const TIME_ZONE = "Asia/Yekaterinburg";
export const TZ_OFFSET_MINUTES = 300;
export const TIME_ZONE_LABEL = "Тюмень, UTC+5";

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

export const OPEN_TIME = "10:00";
export const CLOSE_TIME = "21:00";
export const SLOT_STEP_MIN = 30;
/** На сегодня нельзя записаться раньше, чем через час. */
export const LEAD_MINUTES = 60;
/** Горизонт онлайн-записи, дней. */
export const BOOKING_HORIZON_DAYS = 30;
/** Отмена не позднее чем за 2 часа до визита. */
export const CANCEL_WINDOW_HOURS = 2;

export const WEEKDAY_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;
export const WEEKDAY_FULL = [
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
  "воскресенье",
] as const;
export const MONTH_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

export type ZonedMoment = {
  year: number;
  month: number; // 1–12
  day: number;
  hours: number;
  minutes: number;
  weekday: number; // 1 = понедельник … 7 = воскресенье
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
  minutesOfDay: number;
};

export type DateParts = { year: number; month: number; day: number };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

export function toZoned(input: Date | number | string): ZonedMoment {
  const instant = input instanceof Date ? input : new Date(input);
  const shifted = new Date(instant.getTime() + TZ_OFFSET_MINUTES * MINUTE_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  const rawWeekday = shifted.getUTCDay();

  return {
    year,
    month,
    day,
    hours,
    minutes,
    weekday: rawWeekday === 0 ? 7 : rawWeekday,
    dateStr: `${pad(year, 4)}-${pad(month)}-${pad(day)}`,
    timeStr: `${pad(hours)}:${pad(minutes)}`,
    minutesOfDay: hours * 60 + minutes,
  };
}

export function parseDate(dateStr: string): DateParts | null {
  const match = DATE_RE.exec(dateStr);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && parseDate(value) !== null;
}

export function isValidTimeString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = TIME_RE.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

export function timeToMinutes(value: string): number {
  const match = TIME_RE.exec(value);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

/** Локальное (тюменское) настенное время → UTC-инстант. */
export function zonedToUtc(dateStr: string, timeStr = "00:00"): Date {
  const parts = parseDate(dateStr);
  if (!parts) throw new Error(`Некорректная дата: ${dateStr}`);
  if (!isValidTimeString(timeStr)) throw new Error(`Некорректное время: ${timeStr}`);
  const minutes = timeToMinutes(timeStr);
  const wallClock = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    Math.floor(minutes / 60),
    minutes % 60,
  );
  return new Date(wallClock - TZ_OFFSET_MINUTES * MINUTE_MS);
}

export function addDays(dateStr: string, days: number): string {
  const parts = parseDate(dateStr);
  if (!parts) throw new Error(`Некорректная дата: ${dateStr}`);
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}`;
}

export function weekdayOfDate(dateStr: string): number {
  const parts = parseDate(dateStr);
  if (!parts) throw new Error(`Некорректная дата: ${dateStr}`);
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function todayDateStr(now: Date = new Date()): string {
  return toZoned(now).dateStr;
}

export function nowTimeStr(now: Date = new Date()): string {
  return toZoned(now).timeStr;
}

/** «пн, 26 октября» */
export function formatDateRu(dateStr: string): string {
  const parts = parseDate(dateStr);
  if (!parts) return dateStr;
  return `${WEEKDAY_SHORT[weekdayOfDate(dateStr) - 1]}, ${parts.day} ${
    MONTH_GENITIVE[parts.month - 1]
  }`;
}

/** «26 октября 2026» */
export function formatDateLong(dateStr: string): string {
  const parts = parseDate(dateStr);
  if (!parts) return dateStr;
  return `${parts.day} ${MONTH_GENITIVE[parts.month - 1]} ${parts.year}`;
}

/** «26.10» */
export function formatDateShort(dateStr: string): string {
  const parts = parseDate(dateStr);
  if (!parts) return dateStr;
  return `${pad(parts.day)}.${pad(parts.month)}`;
}

export function formatWeekdayShort(dateStr: string): string {
  return WEEKDAY_SHORT[weekdayOfDate(dateStr) - 1];
}

export function formatWeekdayFull(dateStr: string): string {
  return WEEKDAY_FULL[weekdayOfDate(dateStr) - 1];
}

/** «Сегодня» / «Завтра» / «пн, 26 октября» */
export function formatRelativeDate(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Сегодня";
  if (dateStr === addDays(todayStr, 1)) return "Завтра";
  return formatDateRu(dateStr);
}

export type OpenStatus = {
  isOpen: boolean;
  label: string;
  detail: string;
  timeLabel: string;
  dateLabel: string;
  minutesOfDay: number;
};

/**
 * Статус работы по тюменскому времени.
 * 10:00–20:59 — открыто; 00:00–09:59 — откроемся сегодня; 21:00–23:59 — завтра.
 */
export function getOpenStatus(now: Date = new Date()): OpenStatus {
  const moment = toZoned(now);
  const openMinutes = timeToMinutes(OPEN_TIME);
  const closeMinutes = timeToMinutes(CLOSE_TIME);

  const isOpen = moment.minutesOfDay >= openMinutes && moment.minutesOfDay < closeMinutes;
  const detail =
    moment.minutesOfDay < openMinutes
      ? `откроемся сегодня в ${OPEN_TIME}`
      : isOpen
        ? `до ${CLOSE_TIME}`
        : `откроемся завтра в ${OPEN_TIME}`;

  return {
    isOpen,
    label: isOpen ? "Сейчас открыто" : "Закрыто",
    detail,
    timeLabel: `${moment.timeStr} по Тюмени`,
    dateLabel: formatDateRu(moment.dateStr),
    minutesOfDay: moment.minutesOfDay,
  };
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const start = toZoned(startIso);
  const end = toZoned(endIso);
  return `${start.timeStr}–${end.timeStr}`;
}

/** «пн, 26 октября, 14:30–16:00» */
export function formatDateTimeRange(startIso: string, endIso: string): string {
  const start = toZoned(startIso);
  return `${formatDateRu(start.dateStr)}, ${formatTimeRange(startIso, endIso)}`;
}

/** Допустимый горизонт записи: [сегодня; сегодня + 29]. */
export function bookingDates(now: Date = new Date(), days = BOOKING_HORIZON_DAYS): string[] {
  const today = todayDateStr(now);
  return Array.from({ length: days }, (_, index) => addDays(today, index));
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}
