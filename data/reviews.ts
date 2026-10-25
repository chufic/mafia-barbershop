/**
 * Ручные отзывы.
 *
 * Основной поток отзывов приходит автоматически с 2ГИС, Яндекс Карт и VK
 * (lib/social/*). Этот массив нужен для редкого случая, когда гость разрешил
 * опубликовать отзыв, которого нет на площадках: такой отзыв попадёт на сайт
 * вместе с остальными.
 *
 * Формат записи:
 *
 * {
 *   id: "2gis-1",
 *   author: "Имя",
 *   rating: 5,
 *   date: "2026-09-14",
 *   text: "Текст отзыва.",
 *   platform: "2gis",
 *   url: "https://2gis.ru/...",
 * }
 */

export type ReviewPlatform = "2gis" | "yandex" | "vk";

export type Review = {
  id: string;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Дата отзыва YYYY-MM-DD. */
  date: string;
  text: string;
  platform: ReviewPlatform;
  url?: string;
};

export const reviews: Review[] = [];

export const reviewPlatformLabels: Record<ReviewPlatform, string> = {
  "2gis": "2ГИС",
  yandex: "Яндекс Карты",
  vk: "ВКонтакте",
};
