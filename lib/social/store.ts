/** Чтение и запись данных площадок в SQLite. */

import { getDb, num, str } from "../db";
import { reviews as manualReviews } from "../../data/reviews";
import {
  snapshotStats,
  snapshotReviews,
  snapshotPosts,
} from "../../data/social-snapshot";
import type {
  SocialOverview,
  SocialPost,
  SocialReview,
  SocialStats,
  SourceId,
  SourceStatus,
  SyncResult,
} from "./types";

const SOURCES: SourceId[] = ["2gis", "yandex", "vk"];

export function saveSyncResults(results: SyncResult[], durationMs: number): void {
  const db = getDb();
  const now = new Date().toISOString();

  const upsertStats = db.prepare(`
    INSERT INTO social_stats (source, rating, ratings_count, reviews_count, followers, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(source) DO UPDATE SET
      rating = COALESCE(excluded.rating, social_stats.rating),
      ratings_count = COALESCE(excluded.ratings_count, social_stats.ratings_count),
      reviews_count = COALESCE(excluded.reviews_count, social_stats.reviews_count),
      followers = COALESCE(excluded.followers, social_stats.followers),
      updated_at = excluded.updated_at
  `);

  const upsertReview = db.prepare(`
    INSERT INTO social_reviews
      (id, source, external_id, author, rating, text, published_at, url, answer, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      author = excluded.author,
      rating = excluded.rating,
      text = excluded.text,
      published_at = excluded.published_at,
      url = excluded.url,
      answer = excluded.answer,
      fetched_at = excluded.fetched_at
  `);

  const upsertPost = db.prepare(`
    INSERT INTO social_posts
      (id, source, external_id, text, published_at, url, image_url, is_pinned, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      text = excluded.text,
      published_at = excluded.published_at,
      url = excluded.url,
      image_url = excluded.image_url,
      is_pinned = excluded.is_pinned,
      fetched_at = excluded.fetched_at
  `);

  const upsertSync = db.prepare(`
    INSERT INTO social_sync (source, status, message, items, duration_ms, finished_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(source) DO UPDATE SET
      status = excluded.status,
      message = excluded.message,
      items = excluded.items,
      duration_ms = excluded.duration_ms,
      finished_at = excluded.finished_at
  `);

  db.exec("BEGIN");
  try {
    for (const result of results) {
      const items = (result.reviews?.length ?? 0) + (result.posts?.length ?? 0);

      if (result.status === "ok" && result.stats) {
        upsertStats.run(
          result.source,
          result.stats.rating ?? null,
          result.stats.ratingsCount ?? null,
          result.stats.reviewsCount ?? null,
          result.stats.followers ?? null,
          now,
        );
      }

      for (const review of result.reviews ?? []) {
        upsertReview.run(
          review.id,
          review.source,
          review.externalId,
          review.author,
          review.rating,
          review.text,
          review.publishedAt,
          review.url,
          review.answer,
          now,
        );
      }

      for (const post of result.posts ?? []) {
        upsertPost.run(
          post.id,
          post.source,
          post.externalId,
          post.text,
          post.publishedAt,
          post.url,
          post.imageUrl,
          post.pinned ? 1 : 0,
          now,
        );
      }

      upsertSync.run(
        result.source,
        result.status,
        result.message ?? null,
        items,
        durationMs,
        now,
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  pruneHistory();
}

/** Не даём базе расти бесконечно: на источник — 200 отзывов и 30 постов. */
function pruneHistory(): void {
  const db = getDb();

  db.exec(`
    DELETE FROM social_reviews
    WHERE id NOT IN (
      SELECT id FROM social_reviews ORDER BY published_at DESC LIMIT 400
    )
  `);

  db.exec(`
    DELETE FROM social_posts
    WHERE id NOT IN (
      SELECT id FROM social_posts ORDER BY published_at DESC LIMIT 60
    )
  `);
}

export function getSocialOverview(): SocialOverview {
  const db = getDb();

  const stats: Record<SourceId, SocialStats | null> = { "2gis": null, yandex: null, vk: null };
  for (const row of db.prepare("SELECT * FROM social_stats").all()) {
    const source = str(row.source) as SourceId;
    if (!SOURCES.includes(source)) continue;
    stats[source] = {
      source,
      rating: row.rating === null || row.rating === undefined ? null : num(row.rating),
      ratingsCount: row.ratings_count === null ? null : num(row.ratings_count),
      reviewsCount: row.reviews_count === null ? null : num(row.reviews_count),
      followers: row.followers === null ? null : num(row.followers),
      updatedAt: str(row.updated_at),
    };
  }

  const reviews: SocialReview[] = db
    .prepare(
      `SELECT * FROM social_reviews
       WHERE length(trim(text)) > 0
       ORDER BY published_at DESC
       LIMIT 60`,
    )
    .all()
    .map((row) => ({
      id: str(row.id),
      source: str(row.source) as SourceId,
      externalId: str(row.external_id),
      author: str(row.author, "Гость"),
      rating: row.rating === null ? null : num(row.rating),
      text: str(row.text),
      publishedAt: str(row.published_at),
      url: str(row.url) || null,
      answer: str(row.answer) || null,
    }));

  // Ручные отзывы из data/reviews.ts — на случай, если гость разрешил опубликовать
  // свой отзыв, которого нет на площадках. Пока массив пуст.
  for (const manual of manualReviews) {
    reviews.push({
      id: `manual:${manual.id}`,
      source: manual.platform,
      externalId: manual.id,
      author: manual.author,
      rating: manual.rating,
      text: manual.text,
      publishedAt: `${manual.date}T00:00:00.000Z`,
      url: manual.url ?? null,
      answer: null,
    });
  }

  // Fallback: на serverless-хостинге (Netlify/Vercel) живой базы нет, поэтому
  // подставляем закоммиченный снимок, чтобы отзывы и посты показывались.
  if (reviews.length === 0) reviews.push(...snapshotReviews);

  reviews.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));

  const posts: SocialPost[] = db
    .prepare(
      `SELECT * FROM social_posts
       ORDER BY is_pinned DESC, published_at DESC
       LIMIT 12`,
    )
    .all()
    .map((row) => ({
      id: str(row.id),
      source: str(row.source) as SourceId,
      externalId: str(row.external_id),
      text: str(row.text),
      publishedAt: str(row.published_at),
      url: str(row.url),
      imageUrl: str(row.image_url) || null,
      pinned: num(row.is_pinned) === 1,
    }));

  if (posts.length === 0) posts.push(...snapshotPosts);

  const sources: Record<SourceId, SourceStatus | null> = { "2gis": null, yandex: null, vk: null };
  let updatedAt: string | null = null;

  for (const row of db.prepare("SELECT * FROM social_sync").all()) {
    const source = str(row.source) as SourceId;
    if (!SOURCES.includes(source)) continue;

    sources[source] = {
      source,
      status: str(row.status, "skipped") as SourceStatus["status"],
      message: str(row.message) || null,
      finishedAt: str(row.finished_at) || null,
      items: num(row.items),
    };

    if (str(row.status) === "ok") {
      const finishedAt = str(row.finished_at);
      if (!updatedAt || finishedAt > updatedAt) updatedAt = finishedAt;
    }
  }

  // Fallback на снимок: если база пустая (serverless), берём статистику оттуда.
  if (!Object.values(stats).some((item) => item !== null)) {
    for (const source of SOURCES) stats[source] = snapshotStats[source] ?? null;
    if (!updatedAt) {
      const times = Object.values(snapshotStats)
        .map((item) => item?.updatedAt)
        .filter((t): t is string => Boolean(t));
      updatedAt = times.length ? [...times].sort().at(-1)! : null;
    }
  }

  return {
    stats,
    reviews,
    posts,
    sources,
    updatedAt,
    configured: Object.values(stats).some((item) => item !== null),
  };
}
