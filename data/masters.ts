/**
 * Мастера и график.
 *
 * ВНИМАНИЕ: имена, роли и фото — заглушки, чтобы проверить слоты записи.
 * Замените их на реальных мастеров. workDays: 1 = понедельник … 7 = воскресенье.
 * Время — по Тюмени (Asia/Yekaterinburg).
 */

export type Master = {
  id: string;
  name: string;
  photo: string | null;
  role: string;
  specialties: string[];
  workDays: number[];
  startTime: string;
  endTime: string;
  about: string;
  isActive: boolean;
};

export const masters: Master[] = [
  {
    id: "alexander",
    name: "Александр",
    photo: null,
    role: "Барбер",
    specialties: ["Мужские стрижки", "Бритьё"],
    workDays: [1, 2, 3, 4, 5, 6],
    startTime: "10:00",
    endTime: "21:00",
    about: "Стрижки и бритьё. На смене с понедельника по субботу.",
    isActive: true,
  },
  {
    id: "marat",
    name: "Марат",
    photo: null,
    role: "Барбер",
    specialties: ["Стрижки", "Оформление бороды"],
    workDays: [2, 3, 4, 5, 6, 7],
    startTime: "10:00",
    endTime: "21:00",
    about: "Стрижки и работа с бородой. На смене со вторника по воскресенье.",
    isActive: true,
  },
  {
    id: "dmitry",
    name: "Дмитрий",
    photo: null,
    role: "Барбер",
    specialties: ["Стрижки машинкой", "Детские стрижки"],
    workDays: [3, 4, 5, 6, 7],
    startTime: "12:00",
    endTime: "21:00",
    about: "Короткие формы и детские стрижки. На смене со среды по воскресенье.",
    isActive: true,
  },
];

export const WEEKDAY_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;
export const WEEKDAY_FULL = [
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
  "воскресенье",
] as const;

export function getActiveMasters(): Master[] {
  return masters.filter((master) => master.isActive);
}

export function getMasterById(id: string): Master | undefined {
  return masters.find((master) => master.id === id);
}

/** «Пн–Сб», «Вт–Вс», «Пн, Ср, Пт» — компактная запись графика. */
export function formatWorkDays(workDays: number[]): string {
  const days = [...new Set(workDays)].sort((a, b) => a - b);
  if (days.length === 0) return "Нет смен";
  if (days.length === 7) return "Ежедневно";

  const isRange = days.every((day, index) => index === 0 || day === days[index - 1] + 1);
  if (isRange && days.length > 1) {
    const first = WEEKDAY_SHORT[days[0] - 1];
    const last = WEEKDAY_SHORT[days[days.length - 1] - 1];
    return `${capitalize(first)}–${capitalize(last)}`;
  }

  return days
    .map((day) => capitalize(WEEKDAY_SHORT[day - 1]))
    .join(", ");
}

export function formatMasterSchedule(master: Master): string {
  return `${formatWorkDays(master.workDays)}, ${master.startTime}–${master.endTime}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
