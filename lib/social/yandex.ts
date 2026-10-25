/**
 * Яндекс Карты.
 *
 * Публичного API отзывов у Яндекса нет: страница карточки отдаёт состояние
 * приложения прямо в HTML (JSON внутри <script>). Оттуда берём рейтинг,
 * количество оценок и отзывов, а также сами отзывы с авторами и датами.
 * Если Яндекс покажет капчу — источник помечается ошибкой, а на сайте
 * остаются данные прошлой успешной синхронизации.
 */

import { socialConfig } from "../../data/social";
import { asNumber, cleanText, extractJsonArray, fetchText, roundRating, toIso } from "./http";
import type { SocialReview, SyncResult } from "./types";

type YandexReview = {
  reviewId?: string;
  text?: string | null;
  rating?: number | null;
  updatedTime?: string;
  author?: { name?: string | null } | null;
};

export async function syncYandex(): Promise<SyncResult> {
  const { reviewsUrl, cardUrl } = socialConfig.yandex;
  const html = await fetchText(reviewsUrl);

  if (html.length < 5000 || /showcaptcha/i.test(html)) {
    throw new Error("Яндекс показал капчу — повторим при следующей синхронизации");
  }

  const ratingMatch = html.match(
    /"ratingData":\{"ratingCount":(\d+),"ratingValue":([\d.]+),"reviewCount":(\d+)\}/,
  );

  const stats = ratingMatch
    ? {
        ratingsCount: asNumber(ratingMatch[1]),
        rating: roundRating(ratingMatch[2]),
        reviewsCount: asNumber(ratingMatch[3]),
      }
    : {};

  const rawReviews = extractJsonArray(html, "reviews");
  if (!rawReviews) {
    throw new Error("не удалось разобрать отзывы на странице Яндекс Карт");
  }

  const reviews: SocialReview[] = [];

  for (const raw of rawReviews) {
    const item = raw as YandexReview;
    const externalId = cleanText(item.reviewId, 120);
    const text = cleanText(item.text);
    if (!externalId || !text) continue;

    reviews.push({
      id: `yandex:${externalId}`,
      source: "yandex",
      externalId,
      author: cleanText(item.author?.name, 80) || "Гость Яндекс Карт",
      rating: asNumber(item.rating),
      text,
      publishedAt: toIso(item.updatedTime),
      url: `${cardUrl}reviews/`,
      answer: null,
    });
  }

  return { source: "yandex", status: "ok", stats, reviews };
}
