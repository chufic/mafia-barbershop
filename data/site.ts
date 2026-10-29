/**
 * Единая точка правды для контактных данных, ссылок и цифр бизнеса.
 *
 * Всё, что помечено TODO, нужно уточнить у владельца. Пустая строка означает
 * «ссылки пока нет»: интерфейс в этом случае не ведёт на битый адрес, а
 * показывает аккуратную заглушку.
 */

export const site = {
  name: "Мафия",
  nameFull: "Барбершоп «Мафия»",
  tagline: "Мужские стрижки, борода и бритьё",
  city: "Тюмень",
  address: "ул. Широтная, 124",
  addressFull: "г. Тюмень, ул. Широтная, 124",
  postalCode: "625046",
  phoneDisplay: "+7 912 398-08-80",
  phoneRaw: "+79123980880",
  phoneHref: "tel:+79123980880",
  email: "", // TODO: e-mail для связи, если появится

  hours: {
    open: "10:00",
    close: "21:00",
    days: "Ежедневно",
  },
  timeZone: "Asia/Yekaterinburg",
  timeZoneLabel: "Тюмень, UTC+5",

  /** Рейтинг на 2ГИС — единственная подтверждённая цифра. */
  rating: {
    value: 4.9,
    count: 77,
    source: "2ГИС",
  },
  vkFollowers: 107,

  /**
   * Ссылки на карточки организации и соцсети. Взяты из карточек 2ГИС и
   * Яндекс Карт (телефон +7 912 398-08-80, Тюмень, Широтная 124).
   */
  links: {
    vk: "https://vk.com/barbershopmafia2024",
    twogis: "https://2gis.ru/tyumen/firm/70000001089574253",
    yandexMaps: "https://yandex.ru/maps/org/mafiya/83250055703/",
    appStore: "", // TODO: ссылка на App Store, когда приложение выйдет
    googlePlay: "", // TODO: ссылка на Google Play
    max: "https://max.ru/u/f9LHodD0cOL6gGkOWXsKgvGCW5F-hjWJfsmu7Qp0hO8h2KeHuklP2JSzKE0",
    telegram: "https://t.me/mafia_barber72_bot",
  },

  /** Координаты из карточки Яндекс Карт. */
  coordinates: { lat: 57.105955, lng: 65.58996 } as null | { lat: number; lng: number },

  /** Реквизиты оператора персональных данных для /privacy. */
  legal: {
    operator: "TODO: ИП / ООО, ФИО",
    inn: "TODO: ИНН",
    ogrn: "TODO: ОГРН / ОГРНИП",
    address: "TODO: юридический адрес",
    email: "TODO: e-mail для обращений по персональным данным",
    phone: "+7 912 398-08-80",
  },

  /** Базовый адрес сайта — нужен для canonical, sitemap, OG. */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://mafia-barbershop.ru",
  /** TODO: заменить на настоящий домен после покупки/привязки. */
} as const;

export const workingHoursText = "Ежедневно 10:00–21:00";
