"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatWorkDays, getActiveMasters, getMasterById } from "@/data/masters";
import { SERVICE_CATEGORIES, getServicesByIds, services } from "@/data/services";
import { MasterAvatar } from "@/components/masters/MasterAvatar";
import { useCart } from "@/components/providers/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import type {
  ApiErrorResponse,
  BookingDto,
  CreateBookingResponse,
  MergedSlotDto,
  SlotsResponse,
} from "@/lib/api-types";
import { MAX_CART_SERVICES, MAX_CART_DURATION_MIN } from "@/lib/cart";
import { formatDuration, formatPrice } from "@/lib/format";
import { bookingMessage, telegramLink, whatsappLink } from "@/lib/links";
import { rememberBooking, rememberPhone } from "@/lib/my-bookings";
import { maskPhoneInput, normalizePhone } from "@/lib/phone";
import {
  BOOKING_HORIZON_DAYS,
  bookingDates,
  formatDateRu,
  formatWeekdayShort,
  parseDate,
  toZoned,
  todayDateStr,
} from "@/lib/time";

const MONTH_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

const STEP_TITLES = ["Услуги", "Мастер", "Дата и время", "Контакты"];

type SlotChoice = { startsAt: string; time: string; masterId: string };

export function BookingWizard({
  onClose,
  initialMasterId,
  initialServiceIds,
}: {
  onClose: () => void;
  initialMasterId?: string;
  initialServiceIds?: string[];
}) {
  const { services: cartServices, clear: clearCart } = useCart();

  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const fromProp = (initialServiceIds ?? []).filter((id) => Boolean(getServicesByIds([id]).length));
    const base = fromProp.length > 0 ? fromProp : cartServices.map((service) => service.id);
    return [...new Set(base)].slice(0, MAX_CART_SERVICES);
  });
  const [masterId, setMasterId] = useState(() =>
    initialMasterId && getMasterById(initialMasterId) ? initialMasterId : "any",
  );
  const [date, setDate] = useState(() => todayDateStr());
  const [slot, setSlot] = useState<SlotChoice | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", comment: "", consent: false });
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingDto | null>(null);

  const [slotsData, setSlotsData] = useState<SlotsResponse | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const cacheRef = useRef(new Map<string, SlotsResponse>());
  const requestKeyRef = useRef<string>(createRequestKey());
  const dates = useMemo(() => bookingDates(new Date(), BOOKING_HORIZON_DAYS), []);

  const selectedServices = useMemo(() => getServicesByIds(selectedIds), [selectedIds]);
  const duration = selectedServices.reduce((sum, service) => sum + service.durationMin, 0);
  const total = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const resolvedMaster = slot?.masterId ?? (masterId === "any" ? null : masterId);
  const resolvedMasterName = resolvedMaster
    ? (getMasterById(resolvedMaster)?.name ?? "Мастер")
    : "Любой свободный";

  // если набор услуг изменился — выбранное время могло перестать подходить
  const durationRef = useRef(duration);
  useEffect(() => {
    if (durationRef.current === duration) return;
    durationRef.current = duration;
    setSlot(null);
    cacheRef.current.clear();
  }, [duration]);

  useEffect(() => {
    if (step !== 3 || duration <= 0) return;

    const key = `${date}|${duration}|${masterId}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setSlotsData(cached);
      setSlotsLoading(false);
      setSlotsError(null);
      return;
    }

    const controller = new AbortController();
    setSlotsLoading(true);
    setSlotsError(null);

    const params = new URLSearchParams({
      date,
      duration: String(duration),
      masterId,
    });

    fetch(`/api/slots?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as
          | SlotsResponse
          | ApiErrorResponse;
        if (!response.ok) {
          throw new Error("error" in payload ? payload.error : "Не удалось загрузить время.");
        }
        return payload as SlotsResponse;
      })
      .then((payload) => {
        cacheRef.current.set(key, payload);
        setSlotsData(payload);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSlotsError(
          error instanceof Error ? error.message : "Не удалось загрузить свободное время.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setSlotsLoading(false);
      });

    return () => controller.abort();
  }, [step, date, duration, masterId]);

  function toggleService(id: string) {
    setErrors({});
    const exists = selectedIds.includes(id);
    const next = exists ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];

    if (!exists && next.length > MAX_CART_SERVICES) {
      setErrors({ services: `В одну запись — не больше ${MAX_CART_SERVICES} услуг.` });
      return;
    }
    if (!exists) {
      const nextDuration = getServicesByIds(next).reduce(
        (sum, service) => sum + service.durationMin,
        0,
      );
      if (nextDuration > MAX_CART_DURATION_MIN) {
        setErrors({ services: "Одна запись — не больше 4 часов." });
        return;
      }
    }

    setSelectedIds(next);
    setSlot(null);
  }

  function selectMaster(nextMasterId: string) {
    setMasterId(nextMasterId);
    setSlot(null);
  }

  function selectDate(nextDate: string) {
    setDate(nextDate);
    setSlot(null);
  }

  function selectSlot(next: MergedSlotDto) {
    setSlot({
      startsAt: next.startsAt,
      time: next.time,
      masterId: masterId === "any" ? (next.masterIds[0] ?? "any") : masterId,
    });
  }

  function pickNearest(item: SlotsResponse["nearest"][number]) {
    setMasterId(item.masterId);
    setDate(item.date);
    setSlot({ startsAt: item.startsAt, time: item.time, masterId: item.masterId });
  }

  function goNext() {
    setFormError(null);
    if (step === 1) {
      if (selectedIds.length === 0) {
        setErrors({ services: "Выберите хотя бы одну услугу." });
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!slot) {
        setErrors({ slot: "Выберите время из свободных слотов." });
        return;
      }
      setErrors({});
      setStep(4);
      return;
    }
    if (step === 4) {
      void submit();
    }
  }

  function goBack() {
    setErrors({});
    setFormError(null);
    setStep((current) => Math.max(1, current - 1));
  }

  function validateContacts(): boolean {
    const nextErrors: Record<string, string> = {};
    const name = form.name.trim();
    if (name.length < 2) nextErrors.name = "Напишите имя — минимум 2 символа.";
    else if (name.length > 40) nextErrors.name = "Имя — до 40 символов.";
    if (!normalizePhone(form.phone)) nextErrors.phone = "Телефон в формате +7 912 000-00-00.";
    if (!form.consent) nextErrors.consent = "Без согласия на обработку данных записать нельзя.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit() {
    if (!slot || submitting) return;
    if (!validateContacts()) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          comment: form.comment,
          consent: true,
          masterId: slot.masterId,
          serviceIds: selectedIds,
          startsAt: slot.startsAt,
          requestKey: requestKeyRef.current,
          company,
          source: "site",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | CreateBookingResponse
        | ApiErrorResponse;

      if (!response.ok) {
        if ("errors" in payload && payload.errors) setErrors(payload.errors);
        if (response.status === 409) {
          cacheRef.current.clear();
          setSlot(null);
          setStep(3);
        }
        setFormError("error" in payload ? payload.error : "Не удалось создать заявку.");
        return;
      }

      const booking = (payload as CreateBookingResponse).booking;
      setResult(booking);
      setStep(5);
      clearCart();
      rememberPhone(booking.phone);
      rememberBooking(booking.publicId);
    } catch {
      setFormError("Нет связи с сервером. Проверьте интернет и попробуйте снова.");
    } finally {
      setSubmitting(false);
    }
  }

  const title = step === 5 ? "Заявка принята" : "Запись на визит";
  const eyebrow =
    step === 5 ? (result?.publicId ?? "Готово") : `Шаг ${step} из 4 · ${STEP_TITLES[step - 1]}`;

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      eyebrow={eyebrow}
      description={
        step === 5
          ? undefined
          : "Свободное время показываем по графику мастеров. Заявка сразу попадает администратору."
      }
      size="lg"
      footer={renderFooter()}
    >
      {step <= 4 && (
        <div className="mb-5" aria-hidden="true">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((number) => (
              <span
                key={number}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  number <= step ? "bg-brass" : "bg-line"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <StepServices
          selectedIds={selectedIds}
          onToggle={toggleService}
          error={errors.services}
          duration={duration}
          total={total}
        />
      )}

      {step === 2 && (
        <StepMaster masterId={masterId} onSelect={selectMaster} />
      )}

      {step === 3 && (
        <StepSchedule
          dates={dates}
          date={date}
          onSelectDate={selectDate}
          slotsData={slotsData}
          loading={slotsLoading}
          error={slotsError}
          slot={slot}
          masterId={masterId}
          onSelectSlot={selectSlot}
          onSelectMaster={selectMaster}
          onPickNearest={pickNearest}
          errorMessage={errors.slot}
        />
      )}

      {step === 4 && (
        <StepContacts
          form={form}
          setForm={setForm}
          errors={errors}
          formError={formError}
          slot={slot}
          services={selectedServices}
          masterName={resolvedMasterName}
          total={total}
          duration={duration}
        />
      )}

      {step === 5 && result && (
        <StepDone result={result} onClose={onClose} />
      )}

      <Honeypot value={company} onChange={setCompany} />
    </Modal>
  );

  function renderFooter() {
    if (step === 5) {
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/my" className="btn btn-secondary" onClick={onClose}>
            Мои заявки
          </Link>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {step > 1 && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={goBack}
            disabled={submitting}
          >
            <Icon name="arrow-left" size={17} />
            Назад
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary flex-1"
          onClick={goNext}
          disabled={submitting || (step === 3 && slotsLoading)}
        >
          {step === 4 ? (
            submitting ? (
              <>
                <span className="spinner" aria-hidden="true" /> Отправляем…
              </>
            ) : (
              "Записаться"
            )
          ) : (
            "Далее"
          )}
        </button>
      </div>
    );
  }
}

function StepServices({
  selectedIds,
  onToggle,
  error,
  duration,
  total,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
  error?: string;
  duration: number;
  total: number;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Отметьте услуги — можно выбрать до {MAX_CART_SERVICES}. Сумма и длительность посчитаются
        сами.
      </p>

      <div className="space-y-5">
        {SERVICE_CATEGORIES.map((category) => {
          const items = services.filter((service) => service.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category}>
              <h3 className="mb-2 font-display text-xs uppercase tracking-[0.18em] text-brass">
                {category}
              </h3>
              <ul className="space-y-1.5">
                {items.map((service) => {
                  const checked = selectedIds.includes(service.id);
                  return (
                    <li key={service.id}>
                      <button
                        type="button"
                        onClick={() => onToggle(service.id)}
                        aria-pressed={checked}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          checked
                            ? "border-brass/60 bg-brass/10"
                            : "border-line bg-base/40 hover:border-[#3d3d44]"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? "border-brass bg-brass text-[#16130a]"
                              : "border-[#3f3f47] text-transparent"
                          }`}
                          aria-hidden="true"
                        >
                          <Icon name="check" size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-snug text-ink">
                            {service.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                            <Icon name="clock" size={12} />
                            {formatDuration(service.durationMin)}
                          </span>
                        </span>
                        <span className="whitespace-nowrap font-display text-base text-ink">
                          {formatPrice(service.price)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-base/50 px-3.5 py-3">
        <span className="text-sm text-muted">
          {selectedIds.length > 0
            ? `${selectedIds.length} услуг · ${formatDuration(duration)}`
            : "Пока ничего не выбрано"}
        </span>
        <span className="font-display text-xl text-ink">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

function StepMaster({
  masterId,
  onSelect,
}: {
  masterId: string;
  onSelect: (id: string) => void;
}) {
  const masters = getActiveMasters();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Можно выбрать конкретного мастера или доверить выбор нам — покажем время, когда свободен
        кто-то из команды.
      </p>

      <ul className="space-y-2">
        <li>
          <button
            type="button"
            onClick={() => onSelect("any")}
            aria-pressed={masterId === "any"}
            className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
              masterId === "any"
                ? "border-brass/60 bg-brass/10"
                : "border-line bg-base/40 hover:border-[#3d3d44]"
            }`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brass/25 bg-base text-brass">
              <Icon name="user" size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">Любой свободный</span>
              <span className="mt-0.5 block text-xs text-muted">
                Подберём мастера под выбранное время
              </span>
            </span>
            {masterId === "any" && <Icon name="check" size={18} className="text-brass" />}
          </button>
        </li>

        {masters.map((master) => {
          const active = masterId === master.id;
          return (
            <li key={master.id}>
              <button
                type="button"
                onClick={() => onSelect(master.id)}
                aria-pressed={active}
                className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-brass/60 bg-brass/10"
                    : "border-line bg-base/40 hover:border-[#3d3d44]"
                }`}
              >
                <MasterAvatar name={master.name} photo={master.photo} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{master.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {master.role} · {formatWorkDays(master.workDays)}, {master.startTime}–
                    {master.endTime}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {master.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="rounded-full border border-line px-2 py-0.5 text-[0.65rem] text-muted"
                      >
                        {specialty}
                      </span>
                    ))}
                  </span>
                </span>
                {active && <Icon name="check" size={18} className="mt-1 shrink-0 text-brass" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StepSchedule({
  dates,
  date,
  onSelectDate,
  slotsData,
  loading,
  error,
  slot,
  masterId,
  onSelectSlot,
  onSelectMaster,
  onPickNearest,
  errorMessage,
}: {
  dates: string[];
  date: string;
  onSelectDate: (date: string) => void;
  slotsData: SlotsResponse | null;
  loading: boolean;
  error: string | null;
  slot: SlotChoice | null;
  masterId: string;
  onSelectSlot: (slot: MergedSlotDto) => void;
  onSelectMaster: (id: string) => void;
  onPickNearest: (item: SlotsResponse["nearest"][number]) => void;
  errorMessage?: string;
}) {
  const timestamp = new Date();
  const today = todayDateStr(timestamp);
  const selectedMaster = masterId === "any" ? null : getMasterById(masterId);
  const masterAvailability = slotsData?.masters.find((master) => master.id === masterId);
  const isDayOff = selectedMaster ? masterAvailability?.isWorking === false : false;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Дата визита</p>
        <div
          className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Дата визита"
        >
          {dates.map((day) => {
            const parts = parseDate(day);
            const active = day === date;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDate(day)}
                aria-pressed={active}
                aria-label={formatDateRu(day)}
                className={`flex min-h-[66px] w-[62px] shrink-0 flex-col items-center justify-center rounded-xl border transition-colors ${
                  active
                    ? "border-brass bg-brass/15 text-ink"
                    : "border-line bg-base/40 text-muted hover:border-[#3d3d44] hover:text-ink"
                }`}
              >
                <span className="text-[0.65rem] uppercase tracking-wider">
                  {day === today ? "сегодня" : formatWeekdayShort(day)}
                </span>
                <span className="font-display text-lg leading-none">{parts?.day ?? ""}</span>
                <span className="text-[0.6rem] leading-none text-muted">
                  {parts ? MONTH_SHORT[parts.month - 1] : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink">{formatDateRu(date)}</p>
        <p className="text-xs text-muted">
          {selectedMaster ? selectedMaster.name : "Любой свободный мастер"}
        </p>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {loading && (
          <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse rounded-lg border border-line bg-base/60"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">
            <p>{error}</p>
            <p className="mt-1 text-xs text-muted">
              Попробуйте выбрать другую дату или позвоните нам.
            </p>
          </div>
        )}

        {!loading && !error && !isDayOff && slotsData && slotsData.slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4">
            {slotsData.slots.map((item) => {
              const active = slot?.startsAt === item.startsAt;
              return (
                <button
                  key={item.startsAt}
                  type="button"
                  onClick={() => onSelectSlot(item)}
                  aria-pressed={active}
                  className={`min-h-[44px] rounded-lg border text-sm font-medium transition-colors ${
                    active
                      ? "border-brass bg-brass text-[#16130a]"
                      : "border-line bg-base/40 text-ink hover:border-brass/50 hover:bg-base/70"
                  }`}
                >
                  {item.time}
                </button>
              );
            })}
          </div>
        )}

        {!loading && !error && (isDayOff || (slotsData && slotsData.slots.length === 0)) && (
          <NoSlots
            isDayOff={isDayOff}
            masterId={masterId}
            nearest={slotsData?.nearest ?? []}
            onPickNearest={onPickNearest}
            onAnyMaster={() => onSelectMaster("any")}
          />
        )}
      </div>

      {slot && (
        <div className="rounded-xl border border-brass/30 bg-brass/10 px-3.5 py-2.5 text-sm">
          Выбрано: <span className="font-semibold">{slot.time}</span>,{" "}
          {getMasterById(slot.masterId)?.name ?? "мастер"}
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="field-error">
          {errorMessage}
        </p>
      )}

      <p className="text-xs text-muted">
        Слоты по 30 минут. Сегодня доступно время не раньше чем через час; последняя запись
        заканчивается в 21:00.
      </p>
    </div>
  );
}

function NoSlots({
  isDayOff,
  masterId,
  nearest,
  onPickNearest,
  onAnyMaster,
}: {
  isDayOff: boolean;
  masterId: string;
  nearest: SlotsResponse["nearest"];
  onPickNearest: (item: SlotsResponse["nearest"][number]) => void;
  onAnyMaster: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-base/40 p-4">
      <p className="text-sm text-ink">
        {isDayOff ? "У этого мастера выходной в выбранный день." : "На эту дату свободного времени нет."}
      </p>

      {isDayOff && masterId !== "any" && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAnyMaster}>
          Показать всех мастеров
        </button>
      )}

      {nearest.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Ближайшие варианты</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {nearest.map((item) => (
              <button
                key={`${item.startsAt}-${item.masterId}`}
                type="button"
                onClick={() => onPickNearest(item)}
                className="btn btn-secondary btn-sm"
              >
                <Icon name="calendar" size={15} />
                {formatDateRu(item.date)}, {item.time}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        Можно выбрать другую дату в календаре или позвонить — подскажем свободное время.
      </p>
    </div>
  );
}

function StepContacts({
  form,
  setForm,
  errors,
  formError,
  slot,
  services: selected,
  masterName,
  total,
  duration,
}: {
  form: { name: string; phone: string; comment: string; consent: boolean };
  setForm: React.Dispatch<
    React.SetStateAction<{ name: string; phone: string; comment: string; consent: boolean }>
  >;
  errors: Record<string, string>;
  formError: string | null;
  slot: SlotChoice | null;
  services: ReturnType<typeof getServicesByIds>;
  masterName: string;
  total: number;
  duration: number;
}) {
  return (
    <div className="space-y-5">
      {slot && (
        <div className="rounded-xl border border-line bg-base/50 p-3.5 text-sm">
          <p className="font-medium text-ink">
            {formatDateRu(toZoned(slot.startsAt).dateStr)}, {slot.time} · {masterName}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {selected.map((service) => service.name).join(", ")}
          </p>
          <p className="mt-1 text-sm text-brass">
            {formatPrice(total)} · {formatDuration(duration)}
          </p>
        </div>
      )}

      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div>
          <label htmlFor="booking-name" className="label">
            Имя <span className="text-brass">*</span>
          </label>
          <input
            id="booking-name"
            className="field"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            autoComplete="name"
            maxLength={40}
            placeholder="Как к вам обращаться"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "booking-name-error" : undefined}
            data-autofocus
          />
          {errors.name && (
            <p id="booking-name-error" className="field-error mt-1.5">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="booking-phone" className="label">
            Телефон <span className="text-brass">*</span>
          </label>
          <input
            id="booking-phone"
            className="field"
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: maskPhoneInput(event.target.value) }))
            }
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 912 000-00-00"
            maxLength={18}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "booking-phone-error" : "booking-phone-hint"}
          />
          {errors.phone ? (
            <p id="booking-phone-error" className="field-error mt-1.5">
              {errors.phone}
            </p>
          ) : (
            <p id="booking-phone-hint" className="mt-1.5 text-xs text-muted">
              Нужен, чтобы администратор подтвердил визит.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="booking-comment" className="label">
            Комментарий
          </label>
          <textarea
            id="booking-comment"
            className="field resize-y"
            rows={3}
            maxLength={500}
            value={form.comment}
            onChange={(event) =>
              setForm((current) => ({ ...current, comment: event.target.value }))
            }
            placeholder="Например: первый раз, нужна консультация"
            aria-invalid={Boolean(errors.comment)}
          />
          {errors.comment && <p className="field-error mt-1.5">{errors.comment}</p>}
          <p className="mt-1 text-right text-[0.7rem] text-muted">{form.comment.length}/500</p>
        </div>

        <div>
          <label className="flex items-start gap-3 text-sm leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(event) =>
                setForm((current) => ({ ...current, consent: event.target.checked }))
              }
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#c9a227]"
              aria-invalid={Boolean(errors.consent)}
              aria-describedby={errors.consent ? "booking-consent-error" : undefined}
            />
            <span>
              Согласен на обработку персональных данных и принимаю{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="link-muted"
              >
                политику конфиденциальности
              </a>
              .
            </span>
          </label>
          {errors.consent && (
            <p id="booking-consent-error" className="field-error mt-1.5">
              {errors.consent}
            </p>
          )}
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm"
          >
            {formError}
          </p>
        )}
      </form>
    </div>
  );
}

function StepDone({ result, onClose }: { result: BookingDto; onClose: () => void }) {
  const moment = toZoned(result.startsAt);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success-soft">
          <Icon name="check" size={30} />
        </div>
        <p className="mt-4 text-lg font-semibold text-ink">Заявка принята</p>
        <p className="mt-1 text-sm text-muted">
          Номер заявки: <span className="font-medium text-ink">{result.publicId}</span>
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-line bg-base/50 p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted">Дата</span>
          <span className="text-right text-ink">
            {formatDateRu(moment.dateStr)}, {result.time}–{result.endTime}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted">Мастер</span>
          <span className="text-right text-ink">{result.masterName}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted">Услуги</span>
          <span className="text-right text-ink">
            {result.services.map((service) => service.name).join(", ")}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted">Итого</span>
          <span className="text-right text-brass">
            {formatPrice(result.totalPrice)} · {formatDuration(result.durationMin)}
          </span>
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted">
        Заявка сохранена. Если планы изменятся, отмените запись на странице «Мои заявки» — не
        позднее чем за 2 часа до визита.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={whatsappLink(bookingMessage(result.services.map((service) => service.name)))}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          <Icon name="whatsapp" size={16} /> Написать в WhatsApp
        </a>
        <a
          href={telegramLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          <Icon name="telegram" size={16} /> Telegram
        </a>
      </div>

      <button type="button" className="sr-only" onClick={onClose}>
        Закрыть
      </button>
    </div>
  );
}

function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="hidden" aria-hidden="true">
      <label htmlFor="honeypot-page">Не заполняйте это поле</label>
      <input
        id="honeypot-page"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function createRequestKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
