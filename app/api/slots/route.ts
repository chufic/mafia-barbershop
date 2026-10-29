import { NextResponse } from "next/server";
import { getActiveMasters, getMasterById, type Master } from "@/data/masters";
import type {
  MasterAvailabilityDto,
  NearestSlotDto,
  SlotsResponse,
} from "@/lib/api-types";
import { listBusyBetween } from "@/lib/bookings";
import { buildDayAvailability, type MergedSlot } from "@/lib/slots";
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  todayDateStr,
  toZoned,
} from "@/lib/time";
import { parseSlotsParams } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEAREST_DAYS = 14;
const NEAREST_LIMIT = 3;

/**
 * GET /api/slots?masterId=any&date=YYYY-MM-DD&duration=60
 * Время считается по Тюмени и не зависит от часового пояса посетителя.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = parseSlotsParams(params);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const now = new Date();
  const today = todayDateStr(now);
  const lastDate = addDays(today, BOOKING_HORIZON_DAYS - 1);

  if (parsed.date < today) {
    return NextResponse.json(
      { error: "Дата уже прошла. Выберите сегодня или позже." },
      { status: 400 },
    );
  }
  if (parsed.date > lastDate) {
    return NextResponse.json(
      { error: `Онлайн-запись открыта на ${BOOKING_HORIZON_DAYS} дней вперёд.` },
      { status: 400 },
    );
  }

  const selectedMasters =
    parsed.masterId === "any"
      ? getActiveMasters()
      : getActiveMasters().filter((master) => master.id === parsed.masterId);

  const dailyBusy = await listBusyBetween(parsed.date, parsed.date);
  const day = buildDayAvailability({
    date: parsed.date,
    durationMin: parsed.durationMin,
    masters: selectedMasters,
    busy: dailyBusy,
    now,
  });

  const masterNameById = new Map(selectedMasters.map((master) => [master.id, master.name]));

  let nearest: NearestSlotDto[] = [];
  if (day.slots.length === 0 && selectedMasters.length > 0) {
    nearest = await findNearest({
      fromDate: parsed.date,
      durationMin: parsed.durationMin,
      masters: selectedMasters,
      now,
    });
  }

  const masters: MasterAvailabilityDto[] = day.masters.map((availability) => ({
    id: availability.masterId,
    name: masterNameById.get(availability.masterId) ?? "Мастер",
    isWorking: availability.isWorking,
    slots: availability.slots,
  }));

  const payload: SlotsResponse = {
    date: parsed.date,
    durationMin: parsed.durationMin,
    masterId: parsed.masterId,
    masters,
    slots: day.slots,
    nearest,
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}

async function findNearest(input: {
  fromDate: string;
  durationMin: number;
  masters: Master[];
  now: Date;
}): Promise<NearestSlotDto[]> {
  const masters = input.masters;
  const lastDate = addDays(input.fromDate, NEAREST_DAYS);
  const extendedBusy = await listBusyBetween(input.fromDate, lastDate);
  const collected: MergedSlot[] = [];

  for (let offset = 1; offset <= NEAREST_DAYS && collected.length < NEAREST_LIMIT; offset += 1) {
    const date = addDays(input.fromDate, offset);
    const day = buildDayAvailability({
      date,
      durationMin: input.durationMin,
      masters,
      busy: extendedBusy,
      now: input.now,
    });

    for (const slot of day.slots) {
      collected.push(slot);
      if (collected.length >= NEAREST_LIMIT) break;
    }
  }

  return collected.slice(0, NEAREST_LIMIT).map((slot) => {
    const masterId = slot.masterIds[0] ?? masters[0]?.id ?? "any";
    const master = getMasterById(masterId);
    return {
      date: toZoned(slot.startsAt).dateStr,
      time: slot.time,
      startsAt: slot.startsAt,
      masterId,
      masterName: master?.name ?? "Мастер",
    };
  });
}
