import { Icon } from "@/components/ui/Icon";
import { formatRating } from "@/lib/format";
import { MONTH_GENITIVE } from "@/lib/time";
import type { SourceId } from "@/lib/social/types";

export type ReviewShotData = {
  id: string;
  author: string;
  rating: number | null;
  text: string;
  /** Дата в формате YYYY-MM-DD. */
  date: string;
  source: SourceId;
  url: string | null;
};

const brands: Record<SourceId, { label: string; short: string }> = {
  "2gis": { label: "2ГИС", short: "2ГИС" },
  yandex: { label: "Яндекс Карты", short: "Яндекс Картах" },
  vk: { label: "ВКонтакте", short: "ВКонтакте" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return letters || "Г";
}

function formatShotDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return `${day} ${MONTH_GENITIVE[month - 1]} ${year}`;
}

/**
 * Отзыв, оформленный как карточка-скриншот площадки: автор, звёзды, дата
 * и текст. Показываем реальные данные синхронизации, без ответов барбершопа.
 * Оформление — в палитре сайта: тёмная карточка, латунные акценты.
 */
export function ReviewShot({
  review,
  fluid = false,
  className = "",
  tilt,
}: {
  review: ReviewShotData;
  /** Растянуть карточку на всю ширину сетки (для «стены» отзывов). */
  fluid?: boolean;
  className?: string;
  /** Лёгкий наклон карточки для «коллажного» вида. */
  tilt?: "left" | "right";
}) {
  const brand = brands[review.source];
  const rating = review.rating;
  const filled = rating === null ? 0 : Math.max(0, Math.min(5, Math.round(rating)));
  const tiltClass =
    tilt === "left"
      ? "hover:-rotate-[0.9deg]"
      : tilt === "right"
        ? "hover:rotate-[0.9deg]"
        : "";

  return (
    <figure
      className={`flex flex-col overflow-hidden rounded-[24px] border border-line bg-[linear-gradient(160deg,#191a20_0%,#121216_58%,#0c0c0f_100%)] p-4 text-left shadow-[0_26px_60px_-42px_rgba(0,0,0,1)] transition-transform duration-300 ${
        fluid ? "w-full" : "w-[278px] shrink-0 sm:w-[302px]"
      } ${tiltClass} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-md border border-brass/25 bg-brass/10 px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-brass">
          {brand.label}
        </span>
        <span className="text-[0.62rem] text-white/35">{formatShotDate(review.date)}</span>
      </div>

      <div className="mt-3.5 flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brass/25 bg-[#1b1915] text-[0.7rem] font-semibold text-brass"
          aria-hidden="true"
        >
          {initials(review.author)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[0.85rem] font-semibold text-white/90">{review.author}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="flex gap-0.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <Icon
                  key={index}
                  name="star"
                  size={11}
                  className={index < filled ? "text-brass" : "text-white/15"}
                />
              ))}
            </span>
            {rating !== null && (
              <span className="text-[0.65rem] text-white/45">{formatRating(rating)}</span>
            )}
          </div>
        </div>
      </div>

      <blockquote className="mt-3 line-clamp-6 text-[0.83rem] leading-relaxed text-white/70">
        {review.text}
      </blockquote>

      <figcaption className="mt-auto flex items-center justify-between gap-2 pt-4 text-[0.6rem] uppercase tracking-[0.1em] text-white/30">
        <span>Отзыв на {brand.short}</span>
        {review.url && (
          <a
            href={review.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 normal-case tracking-normal text-brass/80 transition-colors hover:text-brass"
          >
            оригинал
            <Icon name="external" size={11} />
          </a>
        )}
      </figcaption>
    </figure>
  );
}
