"use client";

import { site } from "@/data/site";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { whatsappLink } from "@/lib/links";

export function AppSoonModal({
  store,
  onClose,
  onBooking,
}: {
  store: "apple" | "google";
  onClose: () => void;
  onBooking: () => void;
}) {
  const storeName = store === "apple" ? "App Store" : "Google Play";

  return (
    <Modal
      open
      onClose={onClose}
      title="Приложение ещё готовится"
      eyebrow={storeName}
      footer={
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn btn-primary" onClick={onBooking}>
            Записаться онлайн
          </button>
          <a
            href={whatsappLink("Здравствуйте! Хочу записаться в барбершоп «Мафия».")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Icon name="whatsapp" size={17} /> WhatsApp
          </a>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brass/30 bg-brass/10 text-brass">
          <Icon name={store === "apple" ? "apple" : "google-play"} size={22} />
        </div>
        <p className="text-sm leading-relaxed text-muted">
          {storeName} — приложение барбершопа «Мафия» пока в разработке. Записаться можно на сайте:
          свободное время видно сразу, а заявка приходит администратору.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          Или позвоните:{" "}
          <a href={site.phoneHref} className="text-ink underline decoration-brass/50 underline-offset-4">
            {site.phoneDisplay}
          </a>
          .
        </p>
      </div>
    </Modal>
  );
}
