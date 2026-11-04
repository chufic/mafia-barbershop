/**
 * Каталог услуг. Цены и длительности — из YCLIENTS (салон 1151156),
 * проверено 3 ноября 2026; «Укладка волос» — по прайсу 2ГИС.
 *
 * ВАЖНО: чтобы добавить услугу — добавьте один объект в массив. Карточка, фильтр,
 * поиск, прайс, корзина, модалка «Услуги» и визард записи читают данные отсюда.
 *
 * Ограничение по мастеру: поле `masterIds` — id мастеров из `data/masters.ts`,
 * которым доступна услуга. Пусто/undefined — услуга доступна всем мастерам.
 */

import { getActiveMasters, getMasterById } from "./masters";

export const SERVICE_CATEGORIES = [
  "Стрижки",
  "Борода и бритьё",
  "Уход и окрашивание",
  "Вдвоём и комплексы",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export type ServiceBadge = "хит" | "новинка";

export type Service = {
  id: string;
  slug: string;
  name: string;
  category: ServiceCategory;
  /** Цена в целых рублях (минимальная, если цена «от»). */
  price: number;
  durationMin: number;
  short: string;
  description: string;
  /**
   * Путь к реальному фото (например, `/images/services/mens-cut.jpg`).
   * null = показываем локальный градиент-плейсхолдер с названием услуги.
   */
  image: string | null;
  badge?: ServiceBadge;
  popular?: boolean;
  /**
   * Кому доступна услуга. Пусто — всем активным мастерам.
   * Например, биозавивку делает только Юлия.
   */
  masterIds?: string[];
};

export const services: Service[] = [
  {
    id: "mens-cut",
    slug: "muzhskaya-strizhka",
    name: "Мужская стрижка",
    category: "Стрижки",
    price: 1200,
    durationMin: 60,
    short: "Классическая мужская стрижка.",
    description:
      "Стрижка ножницами и машинкой с учётом формы головы и типа волос. 60 минут спокойной работы.",
    image: "/images/services/mens-cut.jpg?v=20261027",
    badge: "хит",
    popular: true,
  },
  {
    id: "scissors-cut",
    slug: "strizhka-nozhnitsami",
    name: "Стрижка ножницами",
    category: "Стрижки",
    price: 1700,
    durationMin: 60,
    short: "Только ножницы, без машинки.",
    description:
      "Полностью ножничная стрижка — мягкие переходы и естественная форма. Для длинных и средних волос.",
    image: null,
  },
  {
    id: "clipper-cut",
    slug: "strizhka-mashinkoj",
    name: "Стрижка машинкой",
    category: "Стрижки",
    price: 900,
    durationMin: 60,
    short: "Одна длина или короткий переход.",
    description:
      "Стрижка машинкой под одну насадку без ножниц: короткая форма и ровные переходы.",
    image: null,
  },
  {
    id: "head-shave",
    slug: "brityo-golovy",
    name: "Бритьё головы",
    category: "Стрижки",
    price: 1000,
    durationMin: 60,
    short: "Гладко, с уходом за кожей.",
    description:
      "Бритьё головы наголо с подготовкой кожи и уходом после. Ровная линия и никаких раздражений.",
    image: null,
  },
  {
    id: "kids-cut",
    slug: "detskaya-strizhka",
    name: "Детская стрижка",
    category: "Стрижки",
    price: 1000,
    durationMin: 60,
    short: "Первая и не только стрижка.",
    description:
      "Стрижка для детей: спокойно, без спешки и с понятным результатом.",
    image: null,
  },
  {
    id: "kids-long",
    slug: "detskaya-strizhka-udlinennaya",
    name: "Детская стрижка (удлинённая)",
    category: "Стрижки",
    price: 1200,
    durationMin: 60,
    short: "Для длинных волос.",
    description:
      "Детская стрижка на длинных волосах: сохраняем длину, обновляем форму и кончики.",
    image: null,
  },
  {
    id: "women-cut",
    slug: "zhenskaya-strizhka",
    name: "Женская стрижка",
    category: "Стрижки",
    price: 1200,
    durationMin: 60,
    short: "От 1 200 ₽ — зависит от длины.",
    description:
      "Женская стрижка с укладкой. Итоговая цена — от 1 200 ₽, зависит от длины и густоты волос.",
    image: null,
    masterIds: ["yulia"],
  },
  {
    id: "biowave",
    slug: "biozavivka",
    name: "Биозавивка",
    category: "Уход и окрашивание",
    price: 2700,
    durationMin: 150,
    short: "Стойкая завивка щадящим составом.",
    description:
      "Биозавивка волос: щадящий состав даёт объём и мягкую волну на несколько месяцев. Делает только Юлия — записывайтесь к ней.",
    image: null,
    badge: "новинка",
    popular: true,
    masterIds: ["yulia"],
  },
  {
    id: "hair-tint",
    slug: "tonirovanie-volos",
    name: "Тонирование головы (камуфляж)",
    category: "Уход и окрашивание",
    price: 1200,
    durationMin: 60,
    short: "Тон и блеск без осветления.",
    description:
      "Тонирование по длине: обновляет цвет, перекрывает седину, добавляет глубину и блеск.",
    image: null,
  },
  {
    id: "melirovanie",
    slug: "muzhskoe-melirovanie",
    name: "Мужское мелирование",
    category: "Уход и окрашивание",
    price: 2200,
    durationMin: 120,
    short: "От 2 200 ₽ — по объёму работы.",
    description:
      "Мелирование или окрашивание головы. Цена — от 2 200 ₽ до 3 500 ₽ в зависимости от длины и объёма.",
    image: null,
  },
  {
    id: "scalp-care",
    slug: "uhod-za-kozhey-golovy",
    name: "Уход за кожей головы",
    category: "Уход и окрашивание",
    price: 1500,
    durationMin: 60,
    short: "Пилинг и восстановление кожи.",
    description:
      "Уход за кожей головы: очищение, пилинг и восстанавливающая маска. Помогает при сухости и перхоти.",
    image: null,
  },
  {
    id: "face-care",
    slug: "uhod-za-litsom",
    name: "Уход за лицом",
    category: "Уход и окрашивание",
    price: 1500,
    durationMin: 60,
    short: "Чистка и увлажнение.",
    description:
      "Мужской уход за лицом: очищение, тонизирование и увлажнение. Кожа выглядит свежей, без блеска.",
    image: null,
  },
  {
    id: "styling",
    slug: "ukladka-volos",
    name: "Укладка волос",
    category: "Уход и окрашивание",
    price: 500,
    durationMin: 30,
    short: "Укладка на выход.",
    description:
      "Укладываем волосы на 1–2 дня: объём, направление, фиксация. Подходит перед встречей, съёмкой или праздником.",
    image: null,
  },
  {
    id: "beard-shape",
    slug: "oformlenie-borody",
    name: "Оформление бороды",
    category: "Борода и бритьё",
    price: 1000,
    durationMin: 60,
    short: "Контур, длина, форма.",
    description:
      "Придаём форму бороде и усам, выбриваем контур. Поддерживает опрятный вид между стрижками.",
    image: "/images/services/beard-shape.jpg?v=20261027",
  },
  {
    id: "beard-tint",
    slug: "tonirovanie-borody",
    name: "Тонирование бороды (камуфляж)",
    category: "Борода и бритьё",
    price: 1000,
    durationMin: 60,
    short: "Цвет бороды — ровнее тон.",
    description:
      "Тонирование выравнивает цвет бороды и перекрывает седину. Держится несколько недель.",
    image: null,
  },
  {
    id: "waxing",
    slug: "goryachiy-vosk",
    name: "Горячий воск (уши, нос, межбровье)",
    category: "Борода и бритьё",
    price: 400,
    durationMin: 60,
    short: "Лишние волосы тёплым воском.",
    description:
      "Убираем лишние волосы на ушах, в носу и между бровями тёплым воском. Хорошо сочетается со стрижкой.",
    image: null,
  },
  {
    id: "haircut-beard",
    slug: "strizhka-i-boroda",
    name: "Мужская стрижка + оформление бороды",
    category: "Вдвоём и комплексы",
    price: 2000,
    durationMin: 120,
    short: "Стрижка и борода за один заход.",
    description:
      "Полный образ за один визит: стрижка головы и оформление бороды. Не нужно приезжать дважды.",
    image: "/images/services/haircut-beard.jpg?v=20261027",
  },
  {
    id: "duo-family",
    slug: "strizhka-otec-syn",
    name: "Стрижка «отец + сын»",
    category: "Вдвоём и комплексы",
    price: 2000,
    durationMin: 120,
    short: "Отец и сын за один визит.",
    description:
      "Одна запись на двоих: взрослая и детская стрижка подряд. Цена указана за двоих.",
    image: null,
    popular: true,
  },
  {
    id: "duo-friends",
    slug: "strizhka-drug-drug",
    name: "Стрижка «друг + друг»",
    category: "Вдвоём и комплексы",
    price: 2200,
    durationMin: 120,
    short: "Два стула рядом, два часа.",
    description:
      "Приходите с другом: стрижём двоих подряд в удобное время. Цена указана за двоих.",
    image: null,
  },
];

export const DEFAULT_SERVICE_ID = "mens-cut";

export function getServiceById(id: string): Service | undefined {
  return services.find((service) => service.id === id);
}

/**
 * Четыре главные услуги — их показываем крупно на главной.
 * Остальные доступны через кнопку «Все услуги» (полный прайс).
 */
export const FEATURED_SERVICE_IDS = [
  "mens-cut",
  "haircut-beard",
  "biowave",
  "beard-shape",
] as const;

export const featuredServices: Service[] = FEATURED_SERVICE_IDS.map((id) => getServiceById(id)).filter(
  (service): service is Service => Boolean(service),
);

export function getServicesByIds(ids: string[]): Service[] {
  return ids
    .map((id) => getServiceById(id))
    .filter((service): service is Service => Boolean(service));
}

export function servicesInCategory(category: ServiceCategory): Service[] {
  return services.filter((service) => service.category === category);
}

export const priceRange = (() => {
  const prices = services.map((service) => service.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
})();

/** Доступна ли услуга конкретному мастеру. */
export function isServiceForMaster(service: Service, masterId: string): boolean {
  return !service.masterIds || service.masterIds.length === 0
    ? true
    : service.masterIds.includes(masterId);
}

/** Может ли мастер выполнить все выбранные услуги. */
export function masterCanDoServices(masterId: string, serviceIds: string[]): boolean {
  return serviceIds.every((id) => {
    const service = getServiceById(id);
    return service ? isServiceForMaster(service, masterId) : false;
  });
}

/** Активные мастера, которые делают все выбранные услуги. */
export function mastersForServices(serviceIds: string[]) {
  const masters = getActiveMasters();
  if (serviceIds.length === 0) return masters;
  return masters.filter((master) => masterCanDoServices(master.id, serviceIds));
}

/**
 * Подсказка для интерфейса: «только Юлия», если услуга ограничена одним мастером.
 * Возвращает null, когда услугу делает вся команда.
 */
export function serviceMasterHint(service: Service): string | null {
  if (!service.masterIds || service.masterIds.length === 0) return null;

  const master = getMasterById(service.masterIds[0]);
  if (service.masterIds.length === 1) {
    return master ? `только ${master.name}` : null;
  }

  const names = service.masterIds
    .map((id) => getMasterById(id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : null;
}
