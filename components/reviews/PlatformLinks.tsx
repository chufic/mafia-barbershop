"use client";

import { site } from "@/data/site";
import { Icon } from "@/components/ui/Icon";
import { useModal } from "@/components/providers/ModalProvider";
import { formatRating, reviewsCountLabel } from "@/lib/format";
import { isLink, twogisReviewsLink, yandexReviewsLink } from "@/lib/links";

export type Platform = "2gis" | "yandex" | "vk";

const defaultNotes: Record<Platform, string> = {
  "2gis": `${reviewsCountLabel(site.rating.count)} · ${formatRating(site.rating.value)} из 5`,
  yandex: "Карточка организации",
  vk: `${site.vkFollowers} подписчиков`,
};

export function PlatformLinks({
  compact = false,
  notes,
}: {
  compact?: boolean;
  notes?: Partial<Record<Platform, string | undefined>>;
}) {
  const { open } = useModal();

  const platforms: Array<{ id: Platform; label: string; url: string; note: string }> = [
    { id: "2gis", label: "2ГИС", url: twogisReviewsLink(), note: notes?.["2gis"] ?? defaultNotes["2gis"] },
    {
      id: "yandex",
      label: "Яндекс Карты",
      url: yandexReviewsLink(),
      note: notes?.yandex ?? defaultNotes.yandex,
    },
    { id: "vk", label: "ВКонтакте", url: site.links.vk, note: notes?.vk ?? defaultNotes.vk },
  ];

  return (
    <ul className={`grid gap-2 ${compact ? "" : "sm:grid-cols-3"}`}>
      {platforms.map((platform) => (
        <li key={platform.id}>
          {isLink(platform.url) ? (
            <a
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary w-full justify-between gap-2 !px-4 text-left"
            >
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold">{platform.label}</span>
                <span className="text-[0.7rem] font-normal text-muted">{platform.note}</span>
              </span>
              <Icon name="external" size={16} className="shrink-0 text-muted" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() =>
                open({
                  kind: "soon",
                  title: `${platform.label}: ссылка скоро появится`,
                  message:
                    "Мы добавляем ссылку на карточку организации. Пока посмотрите отзывы на 2ГИС или напишите нам — подскажем свободное время.",
                })
              }
              className="btn btn-secondary w-full justify-between gap-2 !px-4 text-left"
            >
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold">{platform.label}</span>
                <span className="text-[0.7rem] font-normal text-muted">{platform.note}</span>
              </span>
              <span className="shrink-0 text-[0.65rem] uppercase tracking-wider text-muted">
                скоро
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
