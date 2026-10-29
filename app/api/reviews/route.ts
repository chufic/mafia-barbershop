/** Отзывы площадок — для модального окна «Отзывы». */

import { NextResponse } from "next/server";
import { getSocialOverview } from "@/lib/social/store";
import type { SourceId } from "@/lib/social/types";

export const dynamic = "force-dynamic";

const SOURCES: SourceId[] = ["2gis", "yandex", "vk"];

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limitParam = Number(params.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 60) : 40;
  const source = params.get("source") as SourceId | null;

  const overview = await getSocialOverview();
  const filtered =
    source && SOURCES.includes(source)
      ? overview.reviews.filter((review) => review.source === source)
      : overview.reviews;

  return NextResponse.json(
    {
      reviews: filtered.slice(0, limit),
      total: filtered.length,
      stats: overview.stats,
      updatedAt: overview.updatedAt,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
