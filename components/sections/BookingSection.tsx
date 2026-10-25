"use client";

import { site } from "@/data/site";
import { priceRange } from "@/data/services";
import { useCart } from "@/components/providers/CartProvider";
import { useModal } from "@/components/providers/ModalProvider";
import { Icon } from "@/components/ui/Icon";
import { MaxLogo } from "@/components/ui/MaxLogo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatDuration, formatPrice, servicesCountLabel } from "@/lib/format";
import { bookingMessage, telegramLink, whatsappLink } from "@/lib/links";

const steps = [
  { title: "Услуги", text: "Выберите до четырёх услуг — сумма посчитается сразу." },
  { title: "Мастер", text: "Конкретный барбер или любой свободный в это время." },
  { title: "Время", text: "Реальные слоты по 30 минут на 30 дней вперёд." },
  { title: "Контакты", text: "Имя и телефон — заявка сразу уходит администратору." },
];

export function BookingSection() {
  const { open } = useModal();
  const { count, services, total, durationMin, clearWithConfirm } = useCart();
  const message = bookingMessage(services.map((service) => service.name));

  return (
    <section id="booking" className="section scroll-mt-24">
      <div className="container-x grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div>
          <SectionHeading
            kicker="Онлайн-запись"
            index="02"
            title={
              <>
                Выберите время — <span className="text-brass">мы подтвердим</span>
              </>
            }
            description="Запись занимает пару минут. Свободное время показываем по графикам мастеров, без звонков и переписок."
          />

          <ol className="mt-6 space-y-3">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brass/40 bg-brass/10 font-display text-sm text-brass">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{step.title}</p>
                  <p className="text-sm leading-relaxed text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => open({ kind: "booking" })}
            >
              <Icon name="calendar" size={17} />
              Записаться онлайн
            </button>
            <a
              href={whatsappLink(message)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <Icon name="whatsapp" size={17} /> WhatsApp
            </a>
            <a
              href={telegramLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <Icon name="telegram" size={17} /> Telegram
            </a>
            <a
              href={site.links.max || site.phoneHref}
              target={site.links.max ? "_blank" : undefined}
              rel={site.links.max ? "noopener noreferrer" : undefined}
              className="btn btn-secondary"
            >
              <MaxLogo size={17} /> MAX
            </a>
          </div>

          <p className="mt-3 text-xs text-muted">
            {site.hours.days} с {site.hours.open} до {site.hours.close}. Телефон:{" "}
            <a href={site.phoneHref} className="text-ink underline decoration-brass/40 underline-offset-4">
              {site.phoneDisplay}
            </a>
            .
          </p>
        </div>

        <aside className="card p-5">
          {count > 0 ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-lg uppercase text-ink">Ваша запись</p>
                <span className="rounded-full border border-brass/40 bg-brass/10 px-2.5 py-1 text-xs text-brass">
                  {servicesCountLabel(count)}
                </span>
              </div>

              <ul className="mt-3 divide-y divide-line">
                {services.map((service) => (
                  <li key={service.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm leading-snug text-ink">{service.name}</p>
                      <p className="text-xs text-muted">{formatDuration(service.durationMin)}</p>
                    </div>
                    <span className="whitespace-nowrap font-display text-base text-ink">
                      {formatPrice(service.price)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-base/50 px-3.5 py-3">
                <span className="text-xs text-muted">{formatDuration(durationMin)}</span>
                <span className="font-display text-xl text-ink">{formatPrice(total)}</span>
              </div>

              <button
                type="button"
                className="btn btn-primary mt-3 w-full"
                onClick={() => open({ kind: "booking", screen: "wizard" })}
              >
                Продолжить запись
                <Icon name="arrow" size={16} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-1 w-full text-xs"
                onClick={clearWithConfirm}
              >
                Очистить выбор
              </button>
            </>
          ) : (
            <>
              <p className="font-display text-lg uppercase text-ink">С чего начать</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Выберите услуги в каталоге — сумма и длительность появятся внизу экрана. Или
                откройте запись и выберите всё на месте.
              </p>

              <div className="mt-4 space-y-3 rounded-xl border border-line bg-base/40 p-4 text-sm">
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted">Стрижки</span>
                  <span className="text-ink">от {formatPrice(700)}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted">Борода и бритьё</span>
                  <span className="text-ink">от {formatPrice(700)}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted">Комплексы на двоих</span>
                  <span className="text-ink">{formatPrice(1800)}</span>
                </p>
                <div className="h-px bg-line" />
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted">Весь прайс</span>
                  <span className="text-ink">
                    {formatPrice(priceRange.min)}–{formatPrice(priceRange.max)}
                  </span>
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary mt-3 w-full"
                onClick={() => open({ kind: "booking" })}
              >
                Записаться
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-2 w-full"
                onClick={() => open({ kind: "services" })}
              >
                Посмотреть прайс списком
              </button>

              <p className="mt-3 text-xs leading-relaxed text-muted">
                Онлайн-запись открыта на 30 дней вперёд. Сегодня можно выбрать время не раньше чем
                через час.
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
