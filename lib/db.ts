/** Тонкий типизированный слой над встроенным `node:sqlite` (Node 24). */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { masters } from "../data/masters";
import { services } from "../data/services";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "mafia.db");

export const dbFilePath = process.env.MAFIA_DB_PATH
  ? path.resolve(process.cwd(), process.env.MAFIA_DB_PATH)
  : DEFAULT_DB_PATH;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS masters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  photo TEXT,
  work_days TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  duration_min INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  comment TEXT,
  master_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  services_json TEXT NOT NULL,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'cancelled', 'done')),
  created_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'site',
  request_key TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_starts ON bookings(starts_at);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

/* --- Данные площадок: 2ГИС, Яндекс Карты, ВКонтакте --- */

CREATE TABLE IF NOT EXISTS social_reviews (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  author TEXT NOT NULL,
  rating INTEGER,
  text TEXT NOT NULL,
  published_at TEXT NOT NULL,
  url TEXT,
  answer TEXT,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_social_reviews_source
  ON social_reviews(source, published_at DESC);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  text TEXT NOT NULL,
  published_at TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_social_posts_source
  ON social_posts(source, published_at DESC);

CREATE TABLE IF NOT EXISTS social_stats (
  source TEXT PRIMARY KEY,
  rating REAL,
  ratings_count INTEGER,
  reviews_count INTEGER,
  followers INTEGER,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS social_sync (
  source TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  message TEXT,
  items INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  finished_at TEXT NOT NULL
);
`;

type GlobalWithDb = typeof globalThis & { __mafiaDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  const globalStore = globalThis as GlobalWithDb;
  if (globalStore.__mafiaDb) return globalStore.__mafiaDb;

  mkdirSync(path.dirname(dbFilePath), { recursive: true });
  const db = new DatabaseSync(dbFilePath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  seedCatalog(db);

  globalStore.__mafiaDb = db;
  return db;
}

/** Каталог и мастера держим в БД синхронно с data/*.ts — это удобно для админки и отчётов. */
function seedCatalog(db: DatabaseSync): void {
  const upsertMaster = db.prepare(`
    INSERT INTO masters (id, name, role, photo, work_days, start_time, end_time, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      photo = excluded.photo,
      work_days = excluded.work_days,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      is_active = excluded.is_active
  `);

  const upsertService = db.prepare(`
    INSERT INTO services (id, slug, name, category, price, duration_min)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      name = excluded.name,
      category = excluded.category,
      price = excluded.price,
      duration_min = excluded.duration_min
  `);

  for (const master of masters) {
    upsertMaster.run(
      master.id,
      master.name,
      master.role,
      master.photo,
      JSON.stringify(master.workDays),
      master.startTime,
      master.endTime,
      master.isActive ? 1 : 0,
    );
  }

  for (const service of services) {
    upsertService.run(
      service.id,
      service.slug,
      service.name,
      service.category,
      service.price,
      service.durationMin,
    );
  }
}

export type SqlRow = Record<string, unknown>;

export function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function num(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : Number(value) || fallback;
}
