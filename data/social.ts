/**
 * Настройки источников: 2ГИС, Яндекс Карты, ВКонтакте.
 *
 * Идентификаторы найдены по карточкам организации (телефон +7 912 398-08-80,
 * Тюмень, Широтная 124). Любое значение можно переопределить переменной
 * окружения — это нужно, если карточку пересоздадут или у группы сменится адрес.
 */

export const socialConfig = {
  twogis: {
    /** 2ГИС: «Мафия, барбершоп», Широтная 124. */
    branchId: process.env.TWOGIS_BRANCH_ID || "70000001089574253",
    /**
     * Публичный ключ веб-клиента 2ГИС для отзывов. Официального открытого
     * Reviews API у 2ГИС нет, поэтому ключ может смениться — тогда задайте
     * свой через TWOGIS_REVIEWS_KEY.
     */
    reviewsKey: process.env.TWOGIS_REVIEWS_KEY || "6e7e1929-4ea9-4a5d-8c05-d601860389bd",
    cardUrl: "https://2gis.ru/tyumen/firm/70000001089574253",
  },
  yandex: {
    /** Яндекс Карты: организация «Мафия», Широтная 124. */
    orgId: process.env.YANDEX_ORG_ID || "83250055703",
    cardUrl: "https://yandex.ru/maps/org/mafiya/83250055703/",
    reviewsUrl: "https://yandex.ru/maps/org/mafiya/83250055703/reviews/",
  },
  vk: {
    /** Публичная группа «Барбершоп Мафия». */
    group: process.env.VK_GROUP || "barbershopmafia2024",
    groupId: process.env.VK_GROUP_ID || "227010056",
    /**
     * Сервисный ключ VK (необязателен). С ним посты берутся через официальный
     * API wall.get; без него — через публичный виджет сообщества.
     */
    token: process.env.VK_TOKEN?.trim() || "",
    cardUrl: "https://vk.com/barbershopmafia2024",
  },
  limits: {
    /** Сколько отзывов запрашивать у площадок за один прогон. */
    reviews: 50,
    /** Сколько постов VK хранить и показывать. */
    posts: 10,
  },
} as const;
