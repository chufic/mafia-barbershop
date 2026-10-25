"use client";

import { site } from "@/data/site";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/components/providers/CartProvider";
import { useModal } from "@/components/providers/ModalProvider";
import { OpenStatusBadge } from "@/components/contacts/OpenStatusBadge";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { CountUp } from "@/components/ui/CountUp";

const advantages = [
  {
    title: "Работаем каждый день",
    text: "10:00–21:00 без выходных — можно зайти до работы или после.",
  },
  {
    title: "Понятные цены",
    text: "От 200 ₽: у каждой услуги указана цена и длительность.",
  },
  {
    title: "Запись без звонков",
    text: "Свободное время видно онлайн, выбранный слот закрепляется за вами.",
  },
  {
    title: "Можно вдвоём",
    text: "«Отец + сын» и «друг + друг» — одна запись на двоих.",
  },
  {
    title: "Всё в одном месте",
    text: "Стрижка, борода и уход — на Широтной, 124, без поездок по городу.",
  },
];

export function Hero() {
  const { open } = useModal();
  const { count, total } = useCart();

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 hidden select-none font-display text-[16rem] leading-none text-white/[0.02] lg:block"
      >
        МАФИЯ
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ken-burns absolute left-[-30%] top-[-25%] h-[75%] w-[160%] rounded-full bg-[radial-gradient(circle_at_center,rgba(201,162,39,0.13),transparent_62%)] blur-3xl" />
      </div>

      <div className="container-x relative grid gap-10 py-10 sm:py-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-14 lg:py-20">
        <Reveal>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="kicker">{site.city} · {site.address}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Icon name="star" size={13} className="text-brass" />
              <CountUp value={site.rating.value} decimals={1} /> ·{" "}
              <CountUp value={site.rating.count} /> отзывов на {site.rating.source}
            </span>
            <span className="stamp hidden md:inline-flex">Ежедневно · 10:00–21:00</span>
          </div>

          <h1 className="h-hero mt-5 text-ink">
            Барбершоп <span className="text-brass">«Мафия»</span>{" "}
            <span className="text-outline">в&nbsp;Тюмени</span>
          </h1>

          <p className="lead mt-5 max-w-xl">
            Мужские стрижки и оформление бороды. Ежедневно с 10:00 до 21:00, Широтная, 124.
            Выберите услугу и свободное время онлайн — без звонков и ожидания.
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => open({ kind: "booking" })}
            >
              <Icon name="calendar" size={18} />
              Записаться онлайн
            </button>
            <a href={site.phoneHref} className="btn btn-secondary btn-lg">
              <Icon name="phone" size={18} />
              Позвонить
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
            <span>Цены от {formatPrice(200)}</span>
            <span className="hidden h-1 w-1 rounded-full bg-line sm:block" />
            <span>Онлайн-запись 24/7</span>
            <span className="hidden h-1 w-1 rounded-full bg-line sm:block" />
            <span>Широтная, 124</span>
          </div>

          {count > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-brass/30 bg-brass/10 px-3 py-2 text-sm">
              <span className="text-brass">В корзине: {count}</span>
              <span className="text-muted">на {formatPrice(total)}</span>
            </div>
          )}
        </Reveal>

        <Reveal as="aside" delay={120} className="card relative overflow-hidden p-5 sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brass/10 blur-2xl"
          />

          <p className="kicker">Почему именно мы</p>
          <h2 className="mt-3 font-display text-2xl uppercase leading-tight text-ink sm:text-3xl">
            Мужской зал, где всё по делу
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Не нужно объяснять, что вы хотите: покажем варианты, подберём форму под тип волос и
            доведём до результата. Приходите в свой слот — ждать в очереди не придётся.
          </p>

          <ul className="mt-5 space-y-3">
            {advantages.map((advantage) => (
              <li key={advantage.title} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brass/40 bg-brass/10 text-brass">
                  <Icon name="check" size={12} />
                </span>
                <span>
                  <span className="block text-sm font-medium leading-snug text-ink">
                    {advantage.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {advantage.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-xl border border-line bg-base/50 p-3.5">
            <OpenStatusBadge />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
