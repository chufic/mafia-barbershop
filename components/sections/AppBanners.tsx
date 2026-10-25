"use client";

import { site } from "@/data/site";
import { useModal } from "@/components/providers/ModalProvider";
import { Icon } from "@/components/ui/Icon";
import { isLink } from "@/lib/links";

export function AppBanners() {
  const { open } = useModal();

  const banners = [
    {
      store: "apple" as const,
      icon: "apple" as const,
      eyebrow: "Загрузите в",
      title: "App Store",
      url: site.links.appStore,
    },
    {
      store: "google" as const,
      icon: "google-play" as const,
      eyebrow: "Доступно в",
      title: "Google Play",
      url: site.links.googlePlay,
    },
  ];

  const anyConfigured = banners.some((banner) => isLink(banner.url));

  return (
    <section aria-labelledby="app-banners-title" className="container-x pb-2 pt-4 sm:pb-4">
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface/40 p-4 md:flex-row md:items-center md:justify-between sm:p-5">
        <div className="min-w-0 max-w-md">
          <p className="text-xs uppercase tracking-[0.18em] text-brass">Приложение</p>
          <h2 id="app-banners-title" className="mt-1.5 font-display text-lg uppercase text-ink">
            {anyConfigured ? "«Мафия» в вашем телефоне" : "Приложение пока готовится"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {anyConfigured
              ? "Запись и история визитов — в приложении. Ссылки ведут в магазины приложений."
              : "Скоро можно будет записываться из приложения. Пока — на сайте или в мессенджере."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:shrink-0 md:justify-end">
          {banners.map((banner) => {
            const content = (
              <>
                <Icon name={banner.icon} size={24} className="shrink-0 text-ink" />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[0.6rem] uppercase tracking-wider text-muted">
                    {banner.eyebrow}
                  </span>
                  <span className="block font-display text-base leading-tight text-ink">
                    {banner.title}
                  </span>
                </span>
                <Icon name="arrow" size={16} className="shrink-0 text-muted" />
              </>
            );

            const className =
              "flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-[#33333a] bg-[#0c0c0e] px-3.5 py-2.5 transition-colors hover:border-[#4a4a52] hover:bg-[#121215] min-[420px]:w-[184px]";

            return isLink(banner.url) ? (
              <a
                key={banner.store}
                href={banner.url}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
                aria-label={`${banner.title} — открыть страницу приложения`}
              >
                {content}
              </a>
            ) : (
              <button
                key={banner.store}
                type="button"
                onClick={() => open({ kind: "app", store: banner.store })}
                className={className}
                aria-label={`${banner.title} — приложение скоро`}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
