"use client";

import { useState } from "react";
import { site } from "@/data/site";
import { OpenStatusBadge } from "@/components/contacts/OpenStatusBadge";
import { Icon } from "@/components/ui/Icon";
import { MaxLogo } from "@/components/ui/MaxLogo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  bookingMessage,
  telegramLink,
  whatsappLink,
  yandexMapLink,
  yandexMapWidgetLink,
  yandexRouteLink,
} from "@/lib/links";

export function ContactsSection() {
  const [mapVisible, setMapVisible] = useState(false);
  const message = bookingMessage();

  return (
    <section id="contacts" className="section scroll-mt-24">
      <div className="container-x">
        <SectionHeading
          kicker="Контакты"
          index="05"
          title={
            <>
              Широтная, 124 — <span className="text-brass">Тюмень</span>
            </>
          }
          description="Если не нашли вход или нужен ориентир — позвоните, подскажем. Мы на Широтной, 124."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brass/30 bg-brass/10 text-brass">
                <Icon name="pin" size={20} />
              </span>
              <div>
                <p className="font-display text-xl uppercase leading-tight text-ink">
                  {site.address}
                </p>
                <p className="mt-1 text-sm text-muted">{site.city}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <a
                href={yandexRouteLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <Icon name="map" size={16} /> Маршрут
              </a>
              <a
                href={yandexMapLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <Icon name="external" size={15} /> На карте
              </a>
            </div>

            <div className="my-5 h-px bg-line" />

            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-ink">
                <Icon name="clock" size={16} className="text-brass" />
                {site.hours.days} с {site.hours.open} до {site.hours.close}
              </p>
              <OpenStatusBadge />
            </div>

            <div className="my-5 h-px bg-line" />

            <a
              href={site.phoneHref}
              className="flex min-h-[52px] items-center gap-3 rounded-xl border border-line bg-base/50 px-4 text-ink transition-colors hover:border-brass/40"
            >
              <Icon name="phone" size={18} className="text-brass" />
              <span className="font-display text-xl">{site.phoneDisplay}</span>
            </a>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <a
                href={whatsappLink(message)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border border-line bg-base/40 py-2 text-[0.68rem] text-muted transition-colors hover:border-brass/40 hover:text-ink"
              >
                <Icon name="whatsapp" size={19} className="text-brass" />
                WhatsApp
              </a>
              <a
                href={telegramLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border border-line bg-base/40 py-2 text-[0.68rem] text-muted transition-colors hover:border-brass/40 hover:text-ink"
              >
                <Icon name="telegram" size={19} className="text-brass" />
                Telegram
              </a>
              <a
                href={site.links.max || site.phoneHref}
                target={site.links.max ? "_blank" : undefined}
                rel={site.links.max ? "noopener noreferrer" : undefined}
                className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border border-line bg-base/40 py-2 text-[0.68rem] text-muted transition-colors hover:border-brass/40 hover:text-ink"
              >
                <MaxLogo size={19} className="text-brass" />
                MAX
              </a>
            </div>

            {!site.links.max && (
              <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">
                MAX пока по телефону: {site.phoneDisplay}. Ссылку на профиль добавим, когда она
                появится.
              </p>
            )}
          </div>

          <div className="relative min-h-[340px] overflow-hidden rounded-card border border-line bg-surface">
            {mapVisible ? (
              <>
                <iframe
                  src={yandexMapWidgetLink()}
                  title={`Карта: ${site.addressFull}`}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <a
                  href={yandexMapLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 rounded-lg border border-line bg-base/90 px-3 py-2 text-xs text-ink backdrop-blur-sm"
                >
                  Открыть в Яндекс Картах
                </a>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMapVisible(true)}
                className="flex h-full min-h-[340px] w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(80%_80%_at_50%_0%,rgba(201,162,39,0.1),transparent_70%),linear-gradient(160deg,#17171a,#101012)] p-6 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-brass/30 bg-brass/10 text-brass">
                  <Icon name="map" size={26} />
                </span>
                <span className="font-display text-lg uppercase text-ink">Показать карту</span>
                <span className="max-w-xs text-xs leading-relaxed text-muted">
                  Карта Яндекса загрузится только после нажатия — чтобы не тормозить страницу.
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-xs text-brass">
                  {site.address} <Icon name="arrow" size={13} />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
