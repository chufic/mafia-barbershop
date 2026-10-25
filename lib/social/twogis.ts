/**
 * 2ГИС.
 *
 * Официального открытого API отзывов у 2ГИС нет, поэтому используется тот же
 * публичный endpoint, что и на сайте 2gis.ru: он отдаёт рейтинг карточки,
 * количество отзывов и сами отзывы с ответами организации.
 */

import { socialConfig } from "../../data/social";
import { asNumber, cleanText, fetchJson, roundRating, toIso } from "./http";
import type { SocialReview, SyncResult } from "./types";

const REVIEWS_ENDPOINT = "https://public-api.reviews.2gis.com/2.0/branches";

type TwogisResponse = {
  meta?: {
    code?: number;
    branch_rating?: number | null;
    branch_reviews_count?: number | null;
  };
  reviews?: Array<{
    id?: string | number;
    rating?: number | null;
    text?: string | null;
    date_created?: string;
    is_hidden?: boolean;
    user?: { name?: string | null } | null;
    official_answer?: { text?: string | null } | null;
  }>;
};

export async function syncTwogis(): Promise<SyncResult> {
  const { branchId, reviewsKey, cardUrl } = socialConfig.twogis;
  const reviewsUrl = `${cardUrl}/tab/reviews`;

  const query = new URLSearchParams({
    limit: String(socialConfig.limits.reviews),
    is_advertiser: "false",
    fields: "meta.providers,meta.branch_rating,meta.branch_reviews_count",
    without_my_first_review: "false",
    rated: "true",
    sort_by: "date_edited",
    key: reviewsKey,
  });

  const payload = await fetchJson<TwogisResponse>(
    `${REVIEWS_ENDPOINT}/${encodeURIComponent(branchId)}/reviews?${query.toString()}`,
  );

  const code = payload.meta?.code;
  if (code !== 200) {
    throw new Error(`2ГИС вернул код ${code ?? "без кода"} — возможно, сменился ключ отзывов`);
  }

  const reviews: SocialReview[] = [];

  for (const item of payload.reviews ?? []) {
    if (item.is_hidden) continue;

    const text = cleanText(item.text);
    if (!text) continue;

    const externalId = String(item.id ?? "").trim();
    if (!externalId) continue;

    reviews.push({
      id: `2gis:${externalId}`,
      source: "2gis",
      externalId,
      author: cleanText(item.user?.name, 80) || "Гость 2ГИС",
      rating: asNumber(item.rating),
      text,
      publishedAt: toIso(item.date_created),
      url: reviewsUrl,
      answer: cleanText(item.official_answer?.text, 600) || null,
    });
  }

  return {
    source: "2gis",
    status: "ok",
    stats: {
      rating: roundRating(payload.meta?.branch_rating),
      reviewsCount: asNumber(payload.meta?.branch_reviews_count),
    },
    reviews,
  };
}
