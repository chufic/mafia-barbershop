"use client";

import { useMemo } from "react";
import { SERVICE_CATEGORIES, services } from "@/data/services";
import { useCart } from "@/components/providers/CartProvider";
import { useModal } from "@/components/providers/ModalProvider";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { formatDuration, formatPrice, servicesCountLabel } from "@/lib/format";

export function ServicesModal({ onClose }: { onClose: () => void }) {
  const { has, toggle, count, durationMin, total } = useCart();
  const { open } = useModal();

  const groups = useMemo(
    () =>
      SERVICE_CATEGORIES.map((category) => ({
        category,
        items: services.filter((service) => service.category === category),
      })).filter((group) => group.items.length > 0),
    [],
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Услуги и цены"
      eyebrow="Прайс-лист"
      description="Полный список услуг барбершопа. Выберите нужное — услуги попадут в запись."
      size="lg"
      footer={
        count > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted">
                {servicesCountLabel(count)} · {formatDuration(durationMin)}
              </p>
              <p className="font-display text-xl leading-tight text-ink">
                Итого {formatPrice(total)}
              </p>
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
        ) : (
          <p className="text-xs text-muted">
            Цены указаны в рублях. Длительность — ориентир для записи, точное время уточнит мастер.
          </p>
        )
      }
    >
      <div className="space-y-7">
        {groups.map((group) => (
          <section key={group.category} aria-labelledby={`modal-cat-${group.category}`}>
            <h3
              id={`modal-cat-${group.category}`}
              className="mb-2 font-display text-sm uppercase tracking-[0.18em] text-brass"
            >
              {group.category}
            </h3>
            <ul className="divide-y divide-line">
              {group.items.map((service) => {
                const selected = has(service.id);
                return (
                  <li key={service.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5">
                    <div className="min-w-0 flex-1 basis-full sm:basis-0">
                      <p className="text-[0.95rem] font-medium leading-snug text-ink">
                        {service.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        <Icon name="clock" size={13} />
                        {formatDuration(service.durationMin)}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-display text-lg text-ink">
                      {formatPrice(service.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(service.id)}
                      aria-pressed={selected}
                      className={`btn btn-sm ml-auto sm:ml-0 ${
                        selected ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      {selected ? (
                        <>
                          <Icon name="check" size={15} /> В корзине
                        </>
                      ) : (
                        "Выбрать"
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
