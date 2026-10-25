"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PlatformLinks } from "@/components/reviews/PlatformLinks";
import { ReviewShot } from "@/components/reviews/ReviewShot";
import { AllReviewsButton } from "@/components/reviews/ReviewButtons";
import { CountUp } from "@/components/ui/CountUp";
import { pluralRu } from "@/lib/format";
import { sourceLabels, sourceOrder } from "@/lib/social/labels";
import type { SourceId } from "@/lib/social/types";

export type ReviewCard = {
  id: string;
  author: string;
  rating: number | null;
  text: string;
  /** YYYY-MM-DD */
  date: string;
  source: SourceId;
  url: string | null;
  answer: string | null;
};

export type ReviewsSummary = {
  primaryRating: number;
  primaryCount: number | null;
  primarySource: string;
  twogis: { rating: number | null; count: number | null };
  yandex: { rating: number | null; count: number | null };
  vkFollowers: number | null;
  updatedAt: string | null;
  hasErrors: boolean;
};

type Tab = "all" | SourceId;

const VISIBLE_LIMIT = 6;

export function ReviewsPanel({
  reviews,
  summary,
}: {
  reviews: ReviewCard[];
  summary: ReviewsSummary;
}) {
  const [tab, setTab] = useState<Tab>("all");

  // На сайте показываем только отзывы на 5 звёзд: витрина не должна
  // портиться разовым негативом. Полный список — на самих площадках.
  const fiveStar = useMemo(() => reviews.filter((review) => (review.rating ?? 0) >= 5), [reviews]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "all", label: "Все" },
    ...sourceOrder
      .filter((source) => fiveStar.some((review) => review.source === source))
      .map((source) => ({ id: source as Tab, label: sourceLabels[source] })),
  ];

  const visible = useMemo(() => {
    const filtered = tab === "all" ? fiveStar : fiveStar.filter((review) => review.source === tab);
    return filtered.slice(0, VISIBLE_LIMIT);
  }, [fiveStar, tab]);

  return (
    <div className="mt-8">
      <div className="rounded-card border border-line bg-surface/40 p-5">
        <div className="flex items-end gap-3">
          <span className="font-display text-6xl leading-none text-ink">
            <CountUp value={summary.primaryRating} decimals={1} />
          </span>
          <span className="pb-1">
            <span className="flex gap-0.5 text-brass" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <Icon key={index} name="star" size={16} />
              ))}
            </span>
            <span className="mt-1 block text-sm text-muted">
              {summary.primaryCount === null ? (
                `на ${summary.primarySource}`
              ) : (
                <>
                  <CountUp value={summary.primaryCount} />{" "}
                  {pluralRu(summary.primaryCount, ["отзыв", "отзыва", "отзывов"])} на{" "}
                  {summary.primarySource}
                </>
              )}
            </span>
          </span>
        </div>

        <div className="mt-5">
          <PlatformLinks
            notes={{
              "2gis": "Все отзывы",
              yandex: "Рейтинг и отзывы",
              vk: "Новости и акции",
            }}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {tabs.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр отзывов по площадке">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-pressed={tab === item.id}
                className="chip !min-h-[40px] text-xs"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        <AllReviewsButton />
      </div>

      {visible.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((review, index) => (
            <ReviewShot
              key={review.id}
              review={review}
              fluid
              tilt={index % 2 ? "right" : "left"}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface/30 px-5 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-brass">
            <Icon name="star" size={22} />
          </span>
          <p className="mt-4 font-display text-lg uppercase text-ink">Отзывов пока нет</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Как только на площадках появятся новые отзывы, они появятся здесь автоматически.
          </p>
        </div>
      )}
    </div>
  );
}
