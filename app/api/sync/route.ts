/**
 * POST /api/sync — обновить данные 2ГИС, Яндекс Карт и VK.
 * GET  /api/sync — состояние последней синхронизации.
 *
 * Вызывается планировщиком (scripts/sync.ps1) и вручную. Доступ — по
 * SYNC_TOKEN или только с локальной машины (см. lib/social/auth.ts).
 */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isSyncAllowed } from "@/lib/social/auth";
import { getSocialOverview } from "@/lib/social/store";
import { isSyncRunning, runSync } from "@/lib/social/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET(request: Request) {
  if (!isSyncAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
  }

  const overview = getSocialOverview();

  return NextResponse.json(
    {
      ok: true,
      running: isSyncRunning(),
      updatedAt: overview.updatedAt,
      sources: overview.sources,
      stats: overview.stats,
      counts: {
        reviews: overview.reviews.length,
        posts: overview.posts.length,
      },
    },
    { headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  if (!isSyncAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
  }

  try {
    const summary = await runSync();

    // Страница собрана статически с revalidate — просим пересобрать её сразу.
    revalidatePath("/");

    return NextResponse.json(
      {
        ok: summary.results.every((result) => result.status === "ok"),
        finishedAt: summary.finishedAt,
        durationMs: summary.durationMs,
        results: summary.results.map((result) => ({
          source: result.source,
          status: result.status,
          message: result.message ?? null,
          reviews: result.reviews?.length ?? 0,
          posts: result.posts?.length ?? 0,
        })),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "не удалось запустить синхронизацию",
      },
      { status: 409, headers: NO_STORE },
    );
  }
}
