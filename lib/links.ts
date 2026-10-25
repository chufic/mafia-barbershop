import { site } from "../data/site";

export function isLink(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const BOOKING_MESSAGE_PREFIX = "Здравствуйте! Хочу записаться в барбершоп «Мафия»";

/** Готовый текст для мессенджеров. */
export function bookingMessage(serviceNames: string[] = []): string {
  if (serviceNames.length === 0) return `${BOOKING_MESSAGE_PREFIX}.`;
  return `${BOOKING_MESSAGE_PREFIX}: ${serviceNames.join(", ")}.`;
}

export function whatsappLink(text?: string): string {
  const phone = site.phoneRaw.replace(/\D+/g, "");
  const base = `https://wa.me/${phone}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * Telegram не поддерживает подстановку текста в чат с человеком, поэтому
 * ссылка ведёт в чат, а подготовленный текст копируется в буфер обмена.
 */
export function telegramLink(): string {
  if (isLink(site.links.telegram)) return site.links.telegram;
  return `https://t.me/+${site.phoneRaw.replace(/\D+/g, "")}`;
}

/** MAX: ссылка появится, когда владелец её даст. Пустая строка = нет ссылки. */
export function maxLink(): string {
  return site.links.max;
}

export function mapTarget(): string {
  return site.coordinates
    ? `${site.coordinates.lat},${site.coordinates.lng}`
    : site.addressFull;
}

export function yandexRouteLink(): string {
  return `https://yandex.ru/maps/?rtext=~${encodeURIComponent(mapTarget())}&rtt=auto`;
}

export function yandexMapLink(): string {
  return `https://yandex.ru/maps/?text=${encodeURIComponent(site.addressFull)}`;
}

export function yandexMapWidgetLink(): string {
  return `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(
    site.addressFull,
  )}&z=17&lang=ru_RU`;
}

export function twogisLink(): string {
  return isLink(site.links.twogis) ? site.links.twogis : "";
}

export function vkLink(): string {
  return isLink(site.links.vk) ? site.links.vk : "";
}

export function yandexMapsCardLink(): string {
  return isLink(site.links.yandexMaps) ? site.links.yandexMaps : "";
}

/**
 * Ссылки «посмотреть отзывы». Если владелец ещё не дал ссылку на карточку,
 * ведём на поиск по адресу — это рабочая ссылка, а не выдуманный адрес.
 * Как только в data/site.ts появятся точные ссылки, они подхватятся сами.
 */
export function twogisReviewsLink(): string {
  if (isLink(site.links.twogis)) return site.links.twogis;
  return `https://2gis.ru/tyumen/search/${encodeURIComponent("Широтная 124 барбершоп Мафия")}`;
}

export function yandexReviewsLink(): string {
  if (isLink(site.links.yandexMaps)) return site.links.yandexMaps;
  return `https://yandex.ru/maps/?text=${encodeURIComponent(
    "Тюмень Широтная 124 барбершоп Мафия",
  )}`;
}
