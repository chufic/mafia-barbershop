"use client";

import { useCallback, useEffect, useState } from "react";
import type { BookingDto, BookingsListResponse, ApiErrorResponse } from "@/lib/api-types";
import { useModal } from "@/components/providers/ModalProvider";
import { Icon } from "@/components/ui/Icon";
import { formatDuration, formatPrice, servicesCountLabel } from "@/lib/format";
import { readRememberedPhone, rememberPhone } from "@/lib/my-bookings";
import { formatPhoneDisplay, maskPhoneInput, normalizePhone } from "@/lib/phone";
import { formatDateRu, toZoned } from "@/lib/time";

const STATUS_LABELS: Record<BookingDto["status"], string> = {
  new: "Активна",
  cancelled: "Отменена",
  done: "Завершена",
};

export function MyBookings() {
  const { open } = useModal();
  const [phone, setPhone] = useState("");
  const [lookedUp, setLookedUp] = useState("");
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async (value: string, silent = false) => {
    const normalized = normalizePhone(value);
    if (!normalized) {
      if (!silent) setError("Введите телефон в формате +7 912 000-00-00.");
      return;
    }

    setLoading(true);
    setError(null);
    setActionError(null);

    try {
      const response = await fetch(`/api/bookings?phone=${encodeURIComponent(normalized)}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as
        | BookingsListResponse
        | ApiErrorResponse;

      if (!response.ok) {
        setError("error" in payload ? payload.error : "Не удалось загрузить заявки.");
        return;
      }

      setBookings((payload as BookingsListResponse).bookings);
      setLookedUp(normalized);
      setLoaded(true);
      rememberPhone(normalized);
      setPhone(formatPhoneDisplay(normalized));
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и попробуйте снова.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = readRememberedPhone();
    if (!stored) return;
    setPhone(formatPhoneDisplay(stored));
    void load(stored, true);
  }, [load]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await load(phone);
  }

  async function cancelBooking(booking: BookingDto) {
    if (!lookedUp) {
      setActionError("Сначала найдите заявки по телефону.");
      return;
    }
    if (!window.confirm(`Отменить заявку ${booking.publicId}?`)) return;

    setCancelling(booking.publicId);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/bookings/${encodeURIComponent(booking.publicId)}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: lookedUp }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as
        | { booking: BookingDto }
        | ApiErrorResponse;

      if (!response.ok) {
        setActionError("error" in payload ? payload.error : "Не удалось отменить заявку.");
        return;
      }

      const updated = (payload as { booking: BookingDto }).booking;
      setBookings((current) =>
        current.map((item) => (item.publicId === updated.publicId ? updated : item)),
      );
    } catch {
      setActionError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setCancelling(null);
    }
  }

  const upcoming = bookings.filter(
    (booking) => booking.status === "new" && new Date(booking.startsAt).getTime() >= Date.now(),
  );
  const others = bookings.filter((booking) => !upcoming.includes(booking));

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
      <aside className="card p-5 lg:sticky lg:top-24">
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label htmlFor="my-phone" className="label">
              Телефон
            </label>
            <input
              id="my-phone"
              className="field"
              value={phone}
              onChange={(event) => setPhone(maskPhoneInput(event.target.value))}
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 912 000-00-00"
              maxLength={18}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "my-phone-error" : "my-phone-hint"}
            />
            {error ? (
              <p id="my-phone-error" className="field-error mt-1.5" role="alert">
                {error}
              </p>
            ) : (
              <p id="my-phone-hint" className="mt-1.5 text-xs text-muted">
                Тот же номер, что указывали при записи.
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" /> Ищем заявки…
              </>
            ) : (
              "Показать заявки"
            )}
          </button>
        </form>

        <div className="my-5 h-px bg-line" />

        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={() => open({ kind: "booking" })}
        >
          <Icon name="calendar" size={16} /> Записаться
        </button>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          Заявки хранятся по номеру телефона. Если номер сменился — позвоните, найдём запись по
          имени.
        </p>
      </aside>

      <div className="min-w-0">
        {!loaded && !loading && (
          <div className="rounded-card border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-line bg-base/60 text-brass">
              <Icon name="calendar" size={22} />
            </span>
            <p className="mt-4 font-display text-lg uppercase text-ink">Пока нет данных</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Введите телефон, на который записывались, — покажем ваши записи. Если ещё не
              записывались, это можно сделать за пару минут.
            </p>
          </div>
        )}

        {loading && bookings.length === 0 && (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1].map((index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-card border border-line bg-surface/60"
              />
            ))}
          </div>
        )}

        {loaded && bookings.length === 0 && !loading && (
          <div className="rounded-card border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-line bg-base/60 text-brass">
              <Icon name="calendar" size={22} />
            </span>
            <p className="mt-4 font-display text-lg uppercase text-ink">Пока нет записей</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              На этот номер записей нет. Проверьте номер или запишитесь — свободное время видно
              сразу.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm mt-5"
              onClick={() => open({ kind: "booking" })}
            >
              Записаться
            </button>
          </div>
        )}

        {actionError && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm"
          >
            {actionError}
          </p>
        )}

        {loaded && bookings.length > 0 && (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <section aria-labelledby="upcoming-title">
                <h2
                  id="upcoming-title"
                  className="mb-3 font-display text-xs uppercase tracking-[0.18em] text-brass"
                >
                  Предстоящие визиты
                </h2>
                <ul className="space-y-3">
                  {upcoming.map((booking) => (
                    <li key={booking.publicId}>
                      <BookingCard
                        booking={booking}
                        onCancel={cancelBooking}
                        cancelling={cancelling === booking.publicId}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {others.length > 0 && (
              <section aria-labelledby="history-title">
                <h2
                  id="history-title"
                  className="mb-3 font-display text-xs uppercase tracking-[0.18em] text-muted"
                >
                  История
                </h2>
                <ul className="space-y-3">
                  {others.map((booking) => (
                    <li key={booking.publicId}>
                      <BookingCard
                        booking={booking}
                        onCancel={cancelBooking}
                        cancelling={cancelling === booking.publicId}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {lookedUp && (
              <p className="text-xs text-muted">
                Показаны заявки на {formatPhoneDisplay(lookedUp)}. Номер сохранён в этом браузере.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  cancelling,
}: {
  booking: BookingDto;
  onCancel: (booking: BookingDto) => void;
  cancelling: boolean;
}) {
  const moment = toZoned(booking.startsAt);
  const cancelled = booking.status === "cancelled";
  const done = booking.status === "done" || new Date(booking.startsAt).getTime() < Date.now();

  return (
    <article className={`card p-4 sm:p-5 ${cancelled ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl leading-tight text-ink">
            {formatDateRu(moment.dateStr)}, {booking.time}–{booking.endTime}
          </p>
          <p className="mt-1 text-xs text-muted">
            Заявка {booking.publicId} · {booking.masterName}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-wider ${
            cancelled
              ? "border-line text-muted"
              : done
                ? "border-line text-muted"
                : "border-success/40 bg-success/10 text-success-soft"
          }`}
        >
          {cancelled ? STATUS_LABELS.cancelled : done ? STATUS_LABELS.done : STATUS_LABELS.new}
        </span>
      </div>

      <div className="my-3 h-px bg-line" />

      <ul className="space-y-1.5">
        {booking.services.map((service) => (
          <li
            key={`${booking.publicId}-${service.id}`}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <span className="text-ink">{service.name}</span>
            <span className="whitespace-nowrap text-muted">{formatPrice(service.price)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {servicesCountLabel(booking.services.length)} · {formatDuration(booking.durationMin)}
        </p>
        <p className="font-display text-xl text-ink">{formatPrice(booking.totalPrice)}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a href="tel:+79123980880" className="btn btn-secondary btn-sm">
          <Icon name="phone" size={15} /> Позвонить
        </a>

        {booking.canCancel && (
          <button
            type="button"
            onClick={() => onCancel(booking)}
            disabled={cancelling}
            className="btn btn-ghost btn-sm text-danger-soft hover:text-danger-soft"
          >
            {cancelling ? (
              <>
                <span className="spinner" aria-hidden="true" /> Отменяем…
              </>
            ) : (
              "Отменить запись"
            )}
          </button>
        )}

        {!booking.canCancel && !cancelled && !done && (
          <span className="self-center text-xs text-muted">
            Отмена доступна не позднее чем за 2 часа — позвоните нам.
          </span>
        )}
      </div>

      {booking.comment && (
        <p className="mt-3 rounded-lg border border-line bg-base/40 px-3 py-2 text-xs leading-relaxed text-muted">
          Комментарий: {booking.comment}
        </p>
      )}
    </article>
  );
}
