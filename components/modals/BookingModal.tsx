"use client";

import { useState } from "react";
import { site } from "@/data/site";
import { getServicesByIds } from "@/data/services";
import { formatDuration, formatPrice } from "@/lib/format";
import { bookingMessage, telegramLink, whatsappLink, isLink } from "@/lib/links";
import { useCart } from "@/components/providers/CartProvider";
import { Modal } from "@/components/ui/Modal";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MaxLogo } from "@/components/ui/MaxLogo";
import { BookingWizard } from "@/components/booking/BookingWizard";

type Messengers = {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  href: string | null;
  action?: "copy-telegram";
};

export function BookingModal({
  onClose,
  initialMasterId,
  initialServiceIds,
  initialScreen,
}: {
  onClose: () => void;
  initialMasterId?: string;
  initialServiceIds?: string[];
  initialScreen?: "choice" | "wizard";
}) {
  const [screen, setScreen] = useState<"choice" | "wizard">(initialScreen ?? "choice");

  if (screen === "wizard") {
    return (
      <BookingWizard
        onClose={onClose}
        initialMasterId={initialMasterId}
        initialServiceIds={initialServiceIds}
      />
    );
  }

  return (
    <BookingChoice
      onClose={onClose}
      onSite={() => setScreen("wizard")}
      serviceIds={initialServiceIds}
    />
  );
}

function BookingChoice({
  onClose,
  onSite,
  serviceIds,
}: {
  onClose: () => void;
  onSite: () => void;
  serviceIds?: string[];
}) {
  const { services: cartServices } = useCart();
  const [copied, setCopied] = useState(false);

  const chosen =
    serviceIds && serviceIds.length > 0
      ? getServicesByIds(serviceIds)
      : cartServices;

  const names = chosen.map((service) => service.name);

  const message = bookingMessage(names);
  const total = chosen.reduce((sum, service) => sum + service.price, 0);
  const duration = chosen.reduce((sum, service) => sum + service.durationMin, 0);

  const telegramHref = telegramLink();

  const options: Messengers[] = [
    {
      id: "site",
      label: "На сайте",
      description: "Выбрать услугу, мастера и точное время",
      icon: "calendar",
      href: null,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      description: "Откроется чат с готовым сообщением",
      icon: "whatsapp",
      href: whatsappLink(message),
    },
    {
      id: "telegram",
      label: "Telegram",
      description: "Откроется чат, текст скопируем в буфер",
      icon: "telegram",
      href: telegramHref,
      action: "copy-telegram",
    },
    {
      id: "max",
      label: "MAX",
      description: isLink(site.links.max)
        ? "Откроется чат с готовым сообщением"
        : "Ссылка появится позже — пока позвоните нам",
      icon: "max",
      href: isLink(site.links.max) ? site.links.max : site.phoneHref,
    },
  ];

  async function handleTelegram() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3500);
    } catch {
      // буфер обмена недоступен — просто открываем чат
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Как вам удобнее записаться?"
      eyebrow="Запись"
      description="Онлайн-запись показывает реальные свободные слоты. В мессенджере ответит администратор."
      footer={
        <p className="text-xs leading-relaxed text-muted">
          Если не открывается мессенджер — позвоните:{" "}
          <a href={site.phoneHref} className="text-ink underline decoration-brass/50 underline-offset-4">
            {site.phoneDisplay}
          </a>
          . {site.hours.days} с {site.hours.open} до {site.hours.close}.
        </p>
      }
    >
      <div className="space-y-4">
        {cartServices.length > 0 && (
          <div className="rounded-xl border border-line bg-base/50 p-3.5">
            <p className="text-xs uppercase tracking-wider text-muted">В корзине</p>
            <p className="mt-1 text-sm leading-snug text-ink">
              {cartServices.map((service) => service.name).join(", ")}
            </p>
            <p className="mt-1 text-sm text-brass">
              {formatPrice(total)} · {formatDuration(duration)}
            </p>
          </div>
        )}

        <ul className="space-y-2">
          {options.map((option) => {
            const content = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-base/60 text-brass">
                  {option.id === "max" ? <MaxLogo size={19} /> : <Icon name={option.icon} size={19} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.95rem] font-semibold text-ink">{option.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">
                    {option.description}
                  </span>
                </span>
                <Icon name="arrow" size={18} className="shrink-0 text-muted" />
              </>
            );

            if (option.id === "site") {
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={onSite}
                    className="flex w-full items-center gap-3 rounded-xl border border-brass/40 bg-brass/10 p-3.5 text-left transition-colors hover:bg-brass/15"
                    data-autofocus
                  >
                    {content}
                  </button>
                </li>
              );
            }

            return (
              <li key={option.id}>
                <a
                  href={option.href ?? "#"}
                  target={option.href?.startsWith("http") ? "_blank" : undefined}
                  rel={option.href?.startsWith("http") ? "noopener noreferrer" : undefined}
                  onClick={option.action === "copy-telegram" ? handleTelegram : undefined}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-base/40 p-3.5 text-left transition-colors hover:border-[#3d3d44] hover:bg-base/70"
                >
                  {content}
                </a>
              </li>
            );
          })}
        </ul>

        {copied && (
          <p role="status" className="rounded-lg border border-brass/30 bg-brass/10 px-3 py-2 text-sm">
            Текст сообщения скопирован — вставьте его в чат.
          </p>
        )}
      </div>
    </Modal>
  );
}
