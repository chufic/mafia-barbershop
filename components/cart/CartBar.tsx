"use client";

import { useCart } from "@/components/providers/CartProvider";
import { useModal } from "@/components/providers/ModalProvider";
import { Icon } from "@/components/ui/Icon";
import { formatDuration, formatPrice, servicesCountLabel } from "@/lib/format";

export function CartBar() {
  const { ready, count, durationMin, total, clearWithConfirm, notice, dismissNotice } = useCart();
  const { open } = useModal();

  if (!ready) return null;

  return (
    <>
      {notice && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[112px] z-50 mx-auto max-w-md rounded-xl border border-brass/40 bg-[#1a1810] px-4 py-3 text-sm shadow-modal sm:inset-x-auto sm:right-6 sm:w-[380px]"
        >
          <div className="flex items-start gap-3">
            <Icon name="shield" size={17} className="mt-0.5 shrink-0 text-brass" />
            <p className="flex-1 leading-snug">{notice}</p>
            <button
              type="button"
              onClick={dismissNotice}
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:text-ink"
              aria-label="Скрыть сообщение"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}

      {count > 0 && (
        <>
          <div aria-hidden="true" className="h-[104px]" />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#0e0e10]/95 backdrop-blur-md">
            <div className="container-x flex items-center gap-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted">
                  {servicesCountLabel(count)} · {formatDuration(durationMin)}
                </p>
                <p className="font-display text-xl leading-tight text-ink">
                  Итого {formatPrice(total)}
                </p>
              </div>

              <button
                type="button"
                onClick={clearWithConfirm}
                className="btn btn-ghost btn-sm hidden px-2 text-xs sm:inline-flex"
                aria-label="Очистить корзину"
              >
                Очистить
              </button>

              <button
                type="button"
                onClick={() => open({ kind: "booking", screen: "wizard" })}
                className="btn btn-primary btn-sm shrink-0"
              >
                Записаться
                <Icon name="arrow" size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
