"use client";

import Image from "next/image";
import {
  featuredServices,
  services,
  type Service,
  type ServiceCategory,
} from "@/data/services";
import { site } from "@/data/site";
import { useCart } from "@/components/providers/CartProvider";
import { useModal } from "@/components/providers/ModalProvider";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { formatDuration, formatPrice, servicesCountLabel } from "@/lib/format";
import { bookingMessage, whatsappLink } from "@/lib/links";

const artStyles: Record<ServiceCategory, string> = {
  Стрижки:
    "radial-gradient(120% 110% at 15% 0%, rgba(201,162,39,0.24), transparent 58%), linear-gradient(160deg,#24201a 0%,#141416 62%,#0d0d0f 100%)",
  "Борода и бритьё":
    "radial-gradient(120% 110% at 80% 0%, rgba(150,152,165,0.2), transparent 58%), linear-gradient(160deg,#1e2024 0%,#121316 62%,#0d0d0f 100%)",
  "Уход и окрашивание":
    "radial-gradient(120% 110% at 20% 10%, rgba(176,141,90,0.22), transparent 58%), linear-gradient(160deg,#221d18 0%,#131214 62%,#0d0d0f 100%)",
  "Вдвоём и комплексы":
    "radial-gradient(120% 110% at 80% 0%, rgba(201,162,39,0.18), transparent 58%), linear-gradient(160deg,#201e19 0%,#121214 62%,#0d0d0f 100%)",
};

function FeaturedCard({ service, index }: { service: Service; index: number }) {
  const { has, toggle } = useCart();
  const selected = has(service.id);

  return (
    <article
      className={`card group flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-0.5 hover:rotate-0 ${
        index % 2 ? "sm:rotate-[1.1deg]" : "sm:-rotate-[1.1deg]"
      }`}
    >
      <div className="relative aspect-[16/11] overflow-hidden">
        {service.image ? (
          <Image
            src={service.image}
            alt={`${service.name} — барбершоп «Мафия»`}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: artStyles[service.category] }}
            aria-hidden="true"
          >
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[0.62rem] uppercase tracking-wider text-white/70 backdrop-blur-sm">
                  {service.category}
                </span>
                {service.badge && (
                  <span className="rounded-full bg-brass px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-[#16130a]">
                    {service.badge}
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between gap-3">
                <span className="font-display text-6xl leading-none text-white/15">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon name="scissors" size={26} className="shrink-0 text-white/25" />
              </div>
            </div>
          </div>
        )}

        {service.image && service.badge && (
          <span className="absolute right-3 top-3 rounded-full bg-brass px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-[#16130a]">
            {service.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl uppercase leading-tight text-ink sm:text-2xl">
          {service.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{service.short}</p>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-2">
            <span className="font-display text-2xl text-ink">{formatPrice(service.price)}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Icon name="clock" size={14} />
              {formatDuration(service.durationMin)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => toggle(service.id)}
            aria-pressed={selected}
            aria-label={
              selected ? `Убрать «${service.name}» из корзины` : `Выбрать «${service.name}»`
            }
            className={`btn mt-4 w-full ${selected ? "btn-secondary" : "btn-primary"}`}
          >
            {selected ? (
              <>
                <Icon name="check" size={17} /> В корзине
              </>
            ) : (
              "Выбрать"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ServicesSection() {
  const { open } = useModal();
  const { count, durationMin, total } = useCart();
  const message = bookingMessage();

  return (
    <section id="services" className="section scroll-mt-24">
      <div className="container-x">
        <SectionHeading
          kicker="Услуги и цены"
          index="01"
          title={
            <>
              Четыре услуги, <span className="text-brass">за которыми приходят</span>
            </>
          }
          description="Стрижка, борода и бритьё — основной набор. Выберите услугу и добавьте в запись; полный прайс со всеми 13 позициями — по кнопке ниже."
          action={
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => open({ kind: "services" })}
            >
              Все услуги и цены
              <Icon name="arrow" size={15} />
            </button>
          }
        />

        <Reveal delay={60}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {featuredServices.map((service, index) => (
              <FeaturedCard key={service.id} service={service} index={index} />
            ))}
          </div>
        </Reveal>

        {count > 0 && (
          <div className="mt-4 flex flex-col gap-3 rounded-card border border-brass/30 bg-[#17150f] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brass/15 text-brass">
                <Icon name="scissors" size={20} />
              </span>
              <div>
                <p className="text-xs text-muted">
                  {servicesCountLabel(count)} · {formatDuration(durationMin)}
                </p>
                <p className="font-display text-xl leading-tight text-ink">
                  Итого {formatPrice(total)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => open({ kind: "booking", screen: "wizard" })}
              className="btn btn-primary btn-sm shrink-0"
            >
              Записаться
              <Icon name="arrow" size={16} />
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4 rounded-card border border-line bg-surface/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-display text-lg uppercase leading-tight text-ink">
              Есть ещё {services.length - featuredServices.length} услуг
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Детская и машинкой, тонирование, камуфляж седины, «отец + сын» и «друг + друг» —
              весь прайс с ценами и длительностью.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => open({ kind: "services" })}
            >
              Открыть прайс
              <Icon name="arrow" size={15} />
            </button>
            <a
              href={whatsappLink(message)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              <Icon name="whatsapp" size={15} /> Спросить
            </a>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">
          {site.hours.days} с {site.hours.open} до {site.hours.close} · {site.address}
        </p>
      </div>
    </section>
  );
}
