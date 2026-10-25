/** Форматирование цен, длительностей и числительных. */

const NBSP = "\u00A0";

/** 1000 → «1 000 ₽» (неразрывные пробелы, одинаково на сервере и клиенте). */
export function formatPrice(value: number): string {
  const rounded = Math.round(value);
  return `${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}₽`;
}

/** 90 → «1 ч 30 мин», 60 → «1 ч», 15 → «15 мин». */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 мин";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

/** 4.9 → «4,9» */
export function formatRating(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export function pluralRu(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

/** «3 услуги», «1 услуга», «5 услуг» */
export function servicesCountLabel(count: number): string {
  return `${count} ${pluralRu(count, ["услуга", "услуги", "услуг"])}`;
}

export function reviewsCountLabel(count: number): string {
  return `${count} ${pluralRu(count, ["отзыв", "отзыва", "отзывов"])}`;
}

export function minutesLabel(count: number): string {
  return `${count} ${pluralRu(count, ["минута", "минуты", "минут"])}`;
}
