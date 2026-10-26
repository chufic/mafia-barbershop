"use client";

import { getActiveMasters, formatWorkDays } from "@/data/masters";
import { useModal } from "@/components/providers/ModalProvider";
import { MasterAvatar } from "@/components/masters/MasterAvatar";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function MastersSection() {
  const { open } = useModal();
  const masters = getActiveMasters();

  return (
    <section id="masters" className="section scroll-mt-24">
      <div className="container-x">
        <SectionHeading
          kicker="Мастера"
          index="03"
          title={
            <>
              Кто будет <span className="text-brass">стричь</span>
            </>
          }
          description="Выберите мастера заранее или запишитесь к любому свободному — время подберём под ваш график."
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {masters.map((master, index) => (
            <article
              key={master.id}
              className={`card flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-0.5 ${
                index % 2 ? "hover:rotate-[1.1deg]" : "hover:-rotate-[1.1deg]"
              }`}
            >
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-line bg-[linear-gradient(160deg,#211d17_0%,#121214_70%)]">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-brass/10 blur-2xl"
                />
                <MasterAvatar name={master.name} photo={master.photo} size={92} />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[0.62rem] uppercase tracking-wider text-white/70 backdrop-blur-sm">
                  <Icon name="calendar" size={11} />
                  {formatWorkDays(master.workDays)}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-xl uppercase text-ink">{master.name}</h3>
                  <span className="text-xs text-muted">{master.role}</span>
                </div>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <Icon name="clock" size={13} />
                  {formatWorkDays(master.workDays)}, {master.startTime}–{master.endTime}
                </p>

                <p className="mt-2.5 text-sm leading-relaxed text-muted">{master.about}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {master.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full border border-line px-2.5 py-1 text-[0.68rem] text-muted"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    open({ kind: "booking", screen: "wizard", masterId: master.id })
                  }
                  className="btn btn-secondary btn-sm mt-4 w-full"
                >
                  Записаться к мастеру
                </button>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted">
          График указан для онлайн-записи. Если нужного времени нет — позвоните, поищем вариант.
        </p>
      </div>
    </section>
  );
}
