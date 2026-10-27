/**
 * Каталог услуг. Чтобы добавить услугу — добавьте один объект в массив.
 * Цены и длительности правятся здесь же; карточки, фильтры, корзина,
 * модалка «Услуги» и визард записи читают данные отсюда.
 *
 * ВАЖНО: длительности — редактируемые значения по умолчанию
 * (владелец их не присылал). Проверьте их перед запуском.
 */

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
  /** Цена в целых рублях. */
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
};

export const services: Service[] = [
  {
    id: "waxing",
    slug: "udalenie-volos-voskom",
    name: "Удаление волос воском",
    category: "Уход и окрашивание",
    price: 300,
    durationMin: 15,
    short: "Лицо, шея, уши — тёплым воском.",
    description:
      "Убираем лишние волосы на лице, шее и ушах. Процедура занимает около 15 минут и хорошо сочетается со стрижкой.",
    image: null,
  },
  {
    id: "brows",
    slug: "korrekciya-brovej",
    name: "Коррекция бровей",
    category: "Уход и окрашивание",
    price: 200,
    durationMin: 15,
    short: "Форма и чистота линий.",
    description:
      "Подравниваем брови по естественной форме лица и убираем лишние волосы. Можно сделать отдельно или вместе со стрижкой.",
    image: null,
  },
  {
    id: "styling",
    slug: "ukladka-volos",
    name: "Укладка волос",
    category: "Уход и окрашивание",
    price: 400,
    durationMin: 20,
    short: "Укладка на выход.",
    description:
      "Укладываем волосы на 1–2 дня: объём, направление, фиксация. Подходит перед встречей, съёмкой или праздником.",
    image: null,
  },
  {
    id: "beard-tint",
    slug: "tonirovanie-borody",
    name: "Тонирование бороды",
    category: "Борода и бритьё",
    price: 800,
    durationMin: 30,
    short: "Цвет бороды — ровнее тон.",
    description:
      "Тонирование выравнивает цвет бороды и перекрывает седину. Держится несколько недель — срок зависит от структуры волоса.",
    image: null,
  },
  {
    id: "hair-tint",
    slug: "tonirovanie-volos",
    name: "Тонирование волос",
    category: "Уход и окрашивание",
    price: 1000,
    durationMin: 60,
    short: "Тон и блеск без осветления.",
    description:
      "Тонирование по длине: обновляет цвет, добавляет глубину и блеск. Волосы не осветляются.",
    image: null,
  },
  {
    id: "duo-friends",
    slug: "strizhka-drug-drug",
    name: "Стрижка «друг + друг»",
    category: "Вдвоём и комплексы",
    price: 1800,
    durationMin: 120,
    short: "Два стула рядом, два часа.",
    description:
      "Приходите с другом: стрижём двоих подряд в удобное время. Цена указана за двоих.",
    image: null,
  },
  {
    id: "duo-family",
    slug: "strizhka-otec-syn",
    name: "Стрижка «отец + сын»",
    category: "Вдвоём и комплексы",
    price: 1800,
    durationMin: 90,
    short: "Отец и сын за один визит.",
    description:
      "Одна запись на двоих: взрослая и детская стрижка подряд. Цена указана за двоих.",
    image: null,
  },
  {
    id: "haircut-beard",
    slug: "strizhka-i-boroda",
    name: "Мужская стрижка + оформление бороды",
    category: "Вдвоём и комплексы",
    price: 1700,
    durationMin: 90,
    short: "Стрижка и борода за один заход.",
    description:
      "Полный образ за один визит: стрижка головы и оформление бороды. Не нужно приезжать дважды.",
    image: "/images/services/haircut-beard.jpg?v=20261027",
  },
  {
    id: "clipper-cut",
    slug: "strizhka-mashinkoj",
    name: "Стрижка машинкой",
    category: "Стрижки",
    price: 700,
    durationMin: 30,
    short: "Одна длина или короткий переход.",
    description:
      "Стрижка машинкой без ножниц: короткая форма и ровные переходы. Быстро и аккуратно.",
    image: null,
  },
  {
    id: "royal-shave",
    slug: "korolevskoe-brityo",
    name: "Королевское бритьё «с опаской»",
    category: "Борода и бритьё",
    price: 1200,
    durationMin: 60,
    short: "Бритьё опасной бритвой.",
    description:
      "Классическое бритьё опасной бритвой — целый час с вниманием к коже и контуру.",
    image: "/images/services/royal-shave.jpg?v=20261027",
  },
  {
    id: "beard-shape",
    slug: "oformlenie-borody",
    name: "Оформление бороды",
    category: "Борода и бритьё",
    price: 700,
    durationMin: 30,
    short: "Контур, длина, форма.",
    description:
      "Придаём форму бороде и усам, выбриваем контур. Поддерживает опрятный вид между стрижками.",
    image: "/images/services/beard-shape.jpg?v=20261027",
  },
  {
    id: "kids-cut",
    slug: "detskaya-strizhka",
    name: "Детская стрижка",
    category: "Стрижки",
    price: 800,
    durationMin: 45,
    short: "Первая и не только стрижка.",
    description:
      "Стрижка для детей: спокойно, без спешки и с понятным результатом. Длительность — 45 минут.",
    image: null,
  },
  {
    id: "mens-cut",
    slug: "muzhskaya-strizhka",
    name: "Мужская стрижка",
    category: "Стрижки",
    price: 1000,
    durationMin: 60,
    short: "Классическая мужская стрижка.",
    description:
      "Стрижка ножницами и машинкой с учётом формы головы и типа волос. 60 минут спокойной работы.",
    image: "/images/services/mens-cut.jpg?v=20261027",
    badge: "хит",
    popular: true,
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
export const FEATURED_SERVICE_IDS = ["mens-cut", "haircut-beard", "beard-shape", "royal-shave"] as const;

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
