"use client";

import { site } from "@/data/site";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";

export function SoonModal({
  title,
  message,
  onClose,
  onBooking,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onBooking: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      eyebrow="Скоро"
      footer={
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn btn-primary" onClick={onBooking}>
            Записаться онлайн
          </button>
          <a href={site.phoneHref} className="btn btn-secondary">
            <Icon name="phone" size={17} /> Позвонить
          </a>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brass/30 bg-brass/10 text-brass">
          <Icon name="clock" size={22} />
        </div>
        <p className="text-sm leading-relaxed text-muted">{message}</p>
        <p className="text-sm leading-relaxed text-muted">
          Адрес: {site.addressFull}. {site.hours.days} с {site.hours.open} до {site.hours.close}.
        </p>
      </div>
    </Modal>
  );
}
