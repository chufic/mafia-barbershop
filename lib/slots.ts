/**
 * Чистый расчёт свободных слотов. Не зависит от БД и Next — это позволяет
 * покрыть правила тестами и переиспользовать логику в API.
 */

import type { Master } from "../data/masters";
import {
  CLOSE_TIME,
  LEAD_MINUTES,
  OPEN_TIME,
  SLOT_STEP_MIN,
  minutesToTime,
  timeToMinutes,
  weekdayOfDate,
  zonedToUtc,
} from "./time";

export type Slot = {
  /** Локальное время начала, «14:30». */
  time: string;
  /** UTC-инстант начала в ISO. */
  startsAt: string;
  /** UTC-инстант окончания в ISO. */
  endsAt: string;
};

export type MasterAvailability = {
  masterId: string;
  isWorking: boolean;
  slots: Slot[];
};

export type BusyInterval = {
  masterId: string;
  startsAt: string;
  endsAt: string;
};

export type SlotRules = {
  openTime: string;
  closeTime: string;
  stepMin: number;
  leadMin: number;
};

export const DEFAULT_SLOT_RULES: SlotRules = {
  openTime: OPEN_TIME,
  closeTime: CLOSE_TIME,
  stepMin: SLOT_STEP_MIN,
  leadMin: LEAD_MINUTES,
};

export type MergedSlot = Slot & { masterIds: string[] };

function overlaps(startMs: number, endMs: number, busy: BusyInterval): boolean {
  const busyStart = new Date(busy.startsAt).getTime();
  const busyEnd = new Date(busy.endsAt).getTime();
  return startMs < busyEnd && endMs > busyStart;
}

/**
 * Свободные слоты одного мастера на дату.
 * Учитывает рабочие дни, границы смены и салона, длительность услуги,
 * занятость и правило «сегодня не раньше чем через час».
 */
export function computeMasterAvailability(params: {
  date: string;
  durationMin: number;
  master: Master;
  busy: BusyInterval[];
  now: Date;
  rules?: Partial<SlotRules>;
}): MasterAvailability {
  const { date, durationMin, master, busy, now } = params;
  const rules: SlotRules = { ...DEFAULT_SLOT_RULES, ...params.rules };
  const empty = (isWorking: boolean): MasterAvailability => ({
    masterId: master.id,
    isWorking,
    slots: [],
  });

  if (!master.isActive) return empty(false);
  if (!Number.isFinite(durationMin) || durationMin <= 0) return empty(false);

  const weekday = weekdayOfDate(date);
  if (!master.workDays.includes(weekday)) return empty(false);

  const shiftStart = Math.max(timeToMinutes(rules.openTime), timeToMinutes(master.startTime));
  const shiftEnd = Math.min(timeToMinutes(rules.closeTime), timeToMinutes(master.endTime));
  if (shiftEnd - shiftStart < durationMin) return empty(true);

  const earliestMs = now.getTime() + rules.leadMin * 60_000;
  const masterBusy = busy.filter((interval) => interval.masterId === master.id);
  const slots: Slot[] = [];

  for (let cursor = shiftStart; cursor + durationMin <= shiftEnd; cursor += rules.stepMin) {
    const startsAt = zonedToUtc(date, minutesToTime(cursor));
    const startMs = startsAt.getTime();
    const endMs = startMs + durationMin * 60_000;

    if (startMs < earliestMs) continue;
    if (masterBusy.some((interval) => overlaps(startMs, endMs, interval))) continue;

    slots.push({
      time: minutesToTime(cursor),
      startsAt: startsAt.toISOString(),
      endsAt: new Date(endMs).toISOString(),
    });
  }

  return { masterId: master.id, isWorking: true, slots };
}

/** Объединение слотов нескольких мастеров: время + список свободных мастеров. */
export function mergeAvailability(availability: MasterAvailability[]): MergedSlot[] {
  const byStart = new Map<string, MergedSlot>();

  for (const master of availability) {
    for (const slot of master.slots) {
      const existing = byStart.get(slot.startsAt);
      if (existing) {
        existing.masterIds.push(master.masterId);
      } else {
        byStart.set(slot.startsAt, { ...slot, masterIds: [master.masterId] });
      }
    }
  }

  return [...byStart.values()].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export function buildDayAvailability(params: {
  date: string;
  durationMin: number;
  masters: Master[];
  busy: BusyInterval[];
  now: Date;
  rules?: Partial<SlotRules>;
}): { masters: MasterAvailability[]; slots: MergedSlot[] } {
  const masters = params.masters.map((master) =>
    computeMasterAvailability({ ...params, master }),
  );
  return { masters, slots: mergeAvailability(masters) };
}

/** Слот существует и свободен у конкретного мастера. */
export function hasSlot(availability: MasterAvailability, startsAtIso: string): boolean {
  return availability.slots.some((slot) => slot.startsAt === startsAtIso);
}
