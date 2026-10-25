import Link from "next/link";
import { site } from "@/data/site";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { isLink, twogisReviewsLink, yandexReviewsLink } from "@/lib/links";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-[#08080a]">
      <div className="container-x py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Мужские стрижки, борода и бритьё в Тюмени. Ежедневно с 10:00 до 21:00, без выходных.
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href={site.phoneHref}
                className="icon-btn"
                aria-label={`Позвонить: ${site.phoneDisplay}`}
              >
                <Icon name="phone" size={18} />
              </a>
              <Link href="/my" className="icon-btn" aria-label="Мои заявки">
                <Icon name="calendar" size={18} />
              </Link>
            </div>
          </div>

          <nav aria-label="Навигация в подвале">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">
              Навигация
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/#services" className="text-muted transition-colors hover:text-ink">
                  Услуги и цены
                </Link>
              </li>
              <li>
                <Link href="/#masters" className="text-muted transition-colors hover:text-ink">
                  Мастера
                </Link>
              </li>
              <li>
                <Link href="/#promo" className="text-muted transition-colors hover:text-ink">
                  Акции
                </Link>
              </li>
              <li>
                <Link href="/#reviews" className="text-muted transition-colors hover:text-ink">
                  Отзывы
                </Link>
              </li>
              <li>
                <Link href="/#booking" className="text-muted transition-colors hover:text-ink">
                  Онлайн-запись
                </Link>
              </li>
              <li>
                <Link href="/my" className="text-muted transition-colors hover:text-ink">
                  Мои заявки
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">
              Контакты
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href={site.phoneHref} className="text-ink transition-colors hover:text-brass">
                  {site.phoneDisplay}
                </a>
              </li>
              <li className="text-muted">
                {site.city}, {site.address}
              </li>
              <li className="text-muted">
                {site.hours.days} {site.hours.open}–{site.hours.close}
              </li>
              <li>
                <Link href="/#contacts" className="text-muted transition-colors hover:text-ink">
                  Как добраться
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">
              Мы на площадках
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={twogisReviewsLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted transition-colors hover:text-ink"
                >
                  2ГИС · {site.rating.count} отзывов
                </a>
              </li>
              <li>
                <a
                  href={yandexReviewsLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted transition-colors hover:text-ink"
                >
                  Яндекс Карты
                </a>
              </li>
              {isLink(site.links.vk) ? (
                <li>
                  <a
                    href={site.links.vk}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted transition-colors hover:text-ink"
                  >
                    ВКонтакте · {site.vkFollowers}
                  </a>
                </li>
              ) : (
                <li className="text-muted">
                  ВКонтакте{" "}
                  <span className="text-[0.65rem] uppercase text-muted">— ссылка скоро</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Барбершоп «Мафия». Тюмень, {site.address}.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Политика конфиденциальности
            </Link>
            <span className="hidden h-3 w-px bg-line sm:block" />
            <span>Информация на сайте не является публичной офертой</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
