/** Чтение и запись данных площадок в Turso/libSQL. */

import { getDb, num, str, rowObject } from "../db";
import { reviews as manualReviews } from "../../data/reviews";
import { snapshotStats, snapshotReviews, snapshotPosts } from "../../data/social-snapshot";
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

export async function saveSyncResults(results: SyncResult[], durationMs: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const statements: Array<{ sql: string; args: Array<string | number | null> }> = [];

  for (const result of results) {
    const items = (result.reviews?.length ?? 0) + (result.posts?.length ?? 0);

    if (result.status === "ok" && result.stats) {
      statements.push({
        sql: `INSERT INTO social_stats (source, rating, ratings_count, reviews_count, followers, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(source) DO UPDATE SET
                rating = COALESCE(excluded.rating, social_stats.rating),
                ratings_count = COALESCE(excluded.ratings_count, social_stats.ratings_count),
                reviews_count = COALESCE(excluded.reviews_count, social_stats.reviews_count),
                followers = COALESCE(excluded.followers, social_stats.followers),
                updated_at = excluded.updated_at`,
        args: [
          result.source,
          result.stats.rating ?? null,
          result.stats.ratingsCount ?? null,
          result.stats.reviewsCount ?? null,
          result.stats.followers ?? null,
          now,
        ],
      });
    }

    for (const review of result.reviews ?? []) {
      statements.push({
        sql: `INSERT INTO social_reviews
                (id, source, external_id, author, rating, text, published_at, url, answer, fetched_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET author=excluded.author, rating=excluded.rating,
                text=excluded.text, published_at=excluded.published_at, url=excluded.url,
                answer=excluded.answer, fetched_at=excluded.fetched_at`,
        args: [
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
        ],
      });
    }

    for (const post of result.posts ?? []) {
      statements.push({
        sql: `INSERT INTO social_posts
                (id, source, external_id, text, published_at, url, image_url, is_pinned, fetched_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET text=excluded.text, published_at=excluded.published_at,
                url=excluded.url, image_url=excluded.image_url, is_pinned=excluded.is_pinned,
                fetched_at=excluded.fetched_at`,
        args: [
          post.id,
          post.source,
          post.externalId,
          post.text,
          post.publishedAt,
          post.url,
          post.imageUrl,
          post.pinned ? 1 : 0,
          now,
        ],
      });
    }

    statements.push({
      sql: `INSERT INTO social_sync (source, status, message, items, duration_ms, finished_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(source) DO UPDATE SET status=excluded.status, message=excluded.message,
              items=excluded.items, duration_ms=excluded.duration_ms, finished_at=excluded.finished_at`,
      args: [result.source, result.status, result.message ?? null, items, durationMs, now],
    });
  }

  if (statements.length) await db.batch(statements, "write");
  await pruneHistory();
}

/** Не даём базе расти бесконечно: 400 последних отзывов и 60 постов. */
async function pruneHistory(): Promise<void> {
  const db = await getDb();
  await db.batch(
    [
      `DELETE FROM social_reviews WHERE id NOT IN
       (SELECT id FROM social_reviews ORDER BY published_at DESC LIMIT 400)`,
      `DELETE FROM social_posts WHERE id NOT IN
       (SELECT id FROM social_posts ORDER BY published_at DESC LIMIT 60)`,
    ],
    "write",
  );
}

export async function getSocialOverview(): Promise<SocialOverview> {
  const db = await getDb();
  const [statResult, reviewResult, postResult, syncResult] = await Promise.all([
    db.execute("SELECT * FROM social_stats"),
    db.execute(
      `SELECT * FROM social_reviews WHERE length(trim(text)) > 0
       ORDER BY published_at DESC LIMIT 60`,
    ),
    db.execute(`SELECT * FROM social_posts ORDER BY is_pinned DESC, published_at DESC LIMIT 12`),
    db.execute("SELECT * FROM social_sync"),
  ]);

  const stats: Record<SourceId, SocialStats | null> = { "2gis": null, yandex: null, vk: null };
  for (const raw of statResult.rows) {
    const row = rowObject(raw);
    const source = str(row.source) as SourceId;
    if (!SOURCES.includes(source)) continue;
    stats[source] = {
      source,
      rating: row.rating === null || row.rating === undefined ? null : num(row.rating),
      ratingsCount: row.ratings_count === null || row.ratings_count === undefined ? null : num(row.ratings_count),
      reviewsCount: row.reviews_count === null || row.reviews_count === undefined ? null : num(row.reviews_count),
      followers: row.followers === null || row.followers === undefined ? null : num(row.followers),
      updatedAt: str(row.updated_at),
    };
  }

  const reviews: SocialReview[] = reviewResult.rows.map((raw) => {
    const row = rowObject(raw);
    return {
      id: str(row.id),
      source: str(row.source) as SourceId,
      externalId: str(row.external_id),
      author: str(row.author, "Гость"),
      rating: row.rating === null || row.rating === undefined ? null : num(row.rating),
      text: str(row.text),
      publishedAt: str(row.published_at),
      url: str(row.url) || null,
      answer: str(row.answer) || null,
    };
  });

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

  if (reviews.length === 0) reviews.push(...snapshotReviews);
  reviews.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));

  const posts: SocialPost[] = postResult.rows.map((raw) => {
    const row = rowObject(raw);
    return {
      id: str(row.id),
      source: str(row.source) as SourceId,
      externalId: str(row.external_id),
      text: str(row.text),
      publishedAt: str(row.published_at),
      url: str(row.url),
      imageUrl: str(row.image_url) || null,
      pinned: num(row.is_pinned) === 1,
    };
  });
  if (posts.length === 0) posts.push(...snapshotPosts);

  const sources: Record<SourceId, SourceStatus | null> = { "2gis": null, yandex: null, vk: null };
  let updatedAt: string | null = null;
  for (const raw of syncResult.rows) {
    const row = rowObject(raw);
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

  if (!Object.values(stats).some((item) => item !== null)) {
    for (const source of SOURCES) stats[source] = snapshotStats[source] ?? null;
    if (!updatedAt) {
      const times = Object.values(snapshotStats)
        .map((item) => item?.updatedAt)
        .filter((time): time is string => Boolean(time));
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
