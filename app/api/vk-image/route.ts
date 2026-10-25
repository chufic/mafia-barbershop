/**
 * Прокси изображений ВКонтакте.
 *
 * Часть картинок VK отдаёт только с заголовком `Referer: https://vk.com/`
 * (без него — 404), поэтому напрямую в `<img>` они не грузятся. Здесь мы
 * запрашиваем их с сервера, кэшируем на диск и отдаём с сайта.
 *
 * Разрешены только домены `*.userapi.com` и `vk.com` — иначе прокси стал бы
 * открытым релеем.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_DIR = path.join(process.cwd(), "data", "vk-images");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function imageResponse(bytes: Uint8Array, type: string): Response {
  return new Response(new Blob([bytes as unknown as BlobPart], { type }), {
    headers: {
      "content-length": String(bytes.byteLength),
      "cache-control": "public, max-age=2592000, immutable",
    },
  });
}

function notFound(): Response {
  return new Response("Image unavailable", {
    status: 404,
    headers: { "cache-control": "no-store" },
  });
}

function toTarget(raw: string | null): URL | null {
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (!/(^|\.)(userapi\.com|vk\.com)$/i.test(url.hostname)) return null;

  return url;
}

export async function GET(request: Request) {
  const target = toTarget(new URL(request.url).searchParams.get("u"));
  if (!target) {
    return new Response("Bad request", { status: 400 });
  }

  const key = createHash("sha256").update(target.toString()).digest("hex");
  const file = path.join(CACHE_DIR, key);
  const metaFile = `${file}.json`;

  try {
    const [bytes, meta] = await Promise.all([readFile(file), readFile(metaFile, "utf8")]);
    const cached = JSON.parse(meta) as { type?: string; at?: number };

    if (cached.type && typeof cached.at === "number" && Date.now() - cached.at < CACHE_TTL_MS) {
      return imageResponse(bytes, cached.type);
    }
  } catch {
    // кэша ещё нет или он битый — идём в VK
  }

  const upstream = await fetch(target, {
    headers: {
      "user-agent": USER_AGENT,
      referer: "https://vk.com/",
      accept: "image/avif,image/webp,image/*,*/*;q=0.8",
    },
    cache: "no-store",
  }).catch(() => null);

  if (!upstream?.ok) return notFound();

  const type = upstream.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return notFound();

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  if (bytes.byteLength === 0) return notFound();

  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await Promise.all([
      writeFile(file, bytes),
      writeFile(metaFile, JSON.stringify({ type, at: Date.now() })),
    ]);
  } catch {
    // не смогли закэшировать (например, read-only ФС на serverless) — не страшно
  }

  return imageResponse(bytes, type);
}
