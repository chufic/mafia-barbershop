/**
 * Мастера и график.
 *
 * Реальные мастера барбершопа «Мафия»: Юлия (Барбер) и Екатерина (Старший-мастер).
 * workDays: 1 = понедельник … 7 = воскресенье. Время — по Тюмени (Asia/Yekaterinburg).
 *
 * График стоит «ежедневно, 10:00–21:00» — как часы работы салона. Если у мастера
 * смены другие, поправьте workDays/startTime/endTime здесь: слоты считаются отсюда.
 *
 * yclientsStaffId — id сотрудника в YCLIENTS. Пока null: чтобы заполнить, нужен
 * доступ к API (staff_id приходит из /api/v1/staff/{companyId}).
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
  /** id сотрудника в YCLIENTS; null — интеграция ещё не настроена. */
  yclientsStaffId: number | null;
};

export const masters: Master[] = [
  {
    id: "yulia",
    name: "Юлия",
    photo: null,
    role: "Барбер",
    specialties: ["Женские и мужские стрижки", "Биозавивка", "Окрашивание"],
    workDays: [1, 2, 3, 4, 5, 6, 7],
    startTime: "10:00",
    endTime: "21:00",
    about:
      "Стрижки, окрашивание и единственный мастер по биозавивке. На смене ежедневно.",
    isActive: true,
    yclientsStaffId: null,
  },
  {
    id: "ekaterina",
    name: "Екатерина",
    photo: null,
    role: "Старший-мастер",
    specialties: ["Мужские стрижки", "Оформление бороды", "Уход за лицом"],
    workDays: [1, 2, 3, 4, 5, 6, 7],
    startTime: "10:00",
    endTime: "21:00",
    about:
      "Старший мастер: мужские стрижки, борода, уход за лицом и кожей головы. На смене ежедневно.",
    isActive: true,
    yclientsStaffId: null,
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
