"use client";

import { useEffect, useMemo, useState } from "react";
import { site } from "@/data/site";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { formatRating, reviewsCountLabel } from "@/lib/format";
import { PlatformLinks } from "@/components/reviews/PlatformLinks";
import { ReviewShot } from "@/components/reviews/ReviewShot";
import { useModal } from "@/components/providers/ModalProvider";
import type { SourceId } from "@/lib/social/types";

type ApiReview = {
  id: string;
  author: string;
  rating: number | null;
  text: string;
  publishedAt: string;
  url: string | null;
  answer: string | null;
  source: SourceId;
};

type ApiResponse = {
  reviews: ApiReview[];
  total: number;
  updatedAt: string | null;
};

export function ReviewsModal({ onClose }: { onClose: () => void }) {
  const { open } = useModal();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/reviews?limit=60", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("HTTP"))))
      .then((payload: ApiResponse) => setData(payload))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });

    return () => controller.abort();
  }, []);

  const notes = useMemo(
    () => ({
      "2gis": "Все отзывы",
      yandex: "Рейтинг и отзывы",
      vk: "Новости и акции",
    }),
    [],
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Отзывы"
      eyebrow="2ГИС · Яндекс · ВК"
      description={`${formatRating(site.rating.value)} из 5 на ${site.rating.source} — ${reviewsCountLabel(
        site.rating.count,
      )}. Данные площадок обновляются автоматически.`}
      footer={
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => open({ kind: "review-form" })}
        >
          Оставить отзыв
        </button>
      }
    >
      <div className="space-y-5">
        <PlatformLinks notes={notes} />

        {failed && (
          <div className="rounded-xl border border-dashed border-line bg-base/40 p-5 text-center">
            <p className="text-sm text-ink">Не удалось загрузить отзывы</p>
            <p className="mt-2 text-sm text-muted">
              Проверьте связь и откройте отзывы на площадках — ссылки выше.
            </p>
          </div>
        )}

        {!failed && !data && (
          <div className="space-y-3" aria-busy="true" aria-label="Загружаем отзывы">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl border border-line bg-base/40" />
            ))}
          </div>
        )}

        {data && data.reviews.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.reviews.map((review, index) => (
              <ReviewShot
                key={review.id}
                fluid
                tilt={index % 2 ? "right" : "left"}
                review={{
                  id: review.id,
                  author: review.author,
                  rating: review.rating,
                  text: review.text,
                  date: review.publishedAt.slice(0, 10),
                  source: review.source,
                  url: review.url,
                }}
              />
            ))}
          </div>
        )}

        {data && data.reviews.length === 0 && (
          <div className="rounded-xl border border-dashed border-line bg-base/40 p-5 text-center">
            <p className="text-sm text-ink">Отзывов пока нет</p>
            <p className="mt-2 text-sm text-muted">
              Как только гости напишут на 2ГИС, Яндекс Картах или в группе ВКонтакте, отзывы появятся
              здесь автоматически.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-line bg-base/40 p-4 text-sm text-muted">
          <p className="flex items-center gap-2 text-ink">
            <Icon name="star" size={15} className="text-brass" />
            {formatRating(site.rating.value)} из 5 · {site.rating.count} отзывов на 2ГИС
          </p>
          <p className="mt-1.5">
            Отзывы публикуются с указанием площадки и автора. Рейтинги не накручиваем и не округляем.
          </p>
        </div>
      </div>
    </Modal>
  );
}
