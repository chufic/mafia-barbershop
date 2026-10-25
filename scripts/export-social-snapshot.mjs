// Экспорт данных площадок (2ГИС / Яндекс / VK) из SQLite в data/social-snapshot.ts.
// Снимок нужен как fallback, когда живой базы нет (serverless: Netlify/Vercel),
// чтобы на сайте показывались отзывы и посты, а не пустота.
// Запуск из корня проекта: node scripts/export-social-snapshot.mjs
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const DB = process.env.MAFIA_DB_PATH
  ? path.resolve(root, process.env.MAFIA_DB_PATH)
  : path.join(root, "data", "mafia.db");
const OUT = path.join(root, "data", "social-snapshot.ts");

const db = new DatabaseSync(DB, { readOnly: true });

const stats = {};
for (const row of db.prepare("SELECT * FROM social_stats").all()) {
  stats[row.source] = {
    source: row.source,
    rating: row.rating ?? null,
    ratingsCount: row.ratings_count ?? null,
    reviewsCount: row.reviews_count ?? null,
    followers: row.followers ?? null,
    updatedAt: row.updated_at ?? "",
  };
}

const reviews = db
  .prepare("SELECT * FROM social_reviews WHERE length(trim(text)) > 0 ORDER BY published_at DESC LIMIT 60")
  .all()
  .map((row) => ({
    id: row.id,
    source: row.source,
    externalId: String(row.external_id),
    author: row.author,
    rating: row.rating ?? null,
    text: row.text,
    publishedAt: row.published_at,
    url: row.url || null,
    answer: row.answer || null,
  }));

const posts = db
  .prepare("SELECT * FROM social_posts ORDER BY is_pinned DESC, published_at DESC LIMIT 12")
  .all()
  .map((row) => ({
    id: row.id,
    source: row.source,
    externalId: String(row.external_id),
    text: row.text,
    publishedAt: row.published_at,
    url: row.url,
    imageUrl: row.image_url || null,
    pinned: row.is_pinned === 1,
  }));

db.close();

const header = `/**
 * Автогенерируемый снимок данных площадок (2ГИС / Яндекс Карты / ВКонтакте).
 * Используется как fallback, когда живой SQLite-базы рядом нет (serverless:
 * Netlify, Vercel) — чтобы на сайте были отзывы и посты, а не пустота.
 * Перегенерировать после новой синхронизации: node scripts/export-social-snapshot.mjs
 */
import type { SocialReview, SocialPost, SocialStats, SourceId } from "@/lib/social/types";

export const snapshotStats: Record<SourceId, SocialStats | null> = ${JSON.stringify(stats, null, 2)};

export const snapshotReviews: SocialReview[] = ${JSON.stringify(reviews, null, 2)};

export const snapshotPosts: SocialPost[] = ${JSON.stringify(posts, null, 2)};
`;

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, header, "utf8");
console.log(`stats: ${Object.keys(stats).length}, reviews: ${reviews.length}, posts: ${posts.length}`);
console.log("written:", OUT);
