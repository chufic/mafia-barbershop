/** Общие типы синхронизации с площадками. Без серверных зависимостей —
 *  файл можно импортировать и в клиентские компоненты. */

export type SourceId = "2gis" | "yandex" | "vk";

export type SyncStatus = "ok" | "error" | "skipped";

export type SocialReview = {
  /** Внутренний id: `<source>:<externalId>`. */
  id: string;
  source: SourceId;
  externalId: string;
  author: string;
  rating: number | null;
  text: string;
  /** UTC ISO, чтобы сортировка строк в SQLite была корректной. */
  publishedAt: string;
  /** Ссылка на первоисточник (карточка или пост). */
  url: string | null;
  /** Ответ организации, если площадка его отдаёт (2ГИС). */
  answer: string | null;
};

export type SocialPost = {
  id: string;
  source: SourceId;
  externalId: string;
  text: string;
  publishedAt: string;
  url: string;
  imageUrl: string | null;
  pinned: boolean;
};

export type SocialStats = {
  source: SourceId;
  rating: number | null;
  ratingsCount: number | null;
  reviewsCount: number | null;
  followers: number | null;
  updatedAt: string;
};

export type SourceStatus = {
  source: SourceId;
  status: SyncStatus;
  message: string | null;
  finishedAt: string | null;
  items: number;
};

export type SocialOverview = {
  stats: Record<SourceId, SocialStats | null>;
  reviews: SocialReview[];
  posts: SocialPost[];
  /** Время последнего успешного обновления любого источника. */
  updatedAt: string | null;
  sources: Record<SourceId, SourceStatus | null>;
  /** Удалось ли хоть раз что-то загрузить (иначе показываем прежний текст). */
  configured: boolean;
};

export type SyncResult = {
  source: SourceId;
  status: SyncStatus;
  message?: string;
  stats?: Partial<Pick<SocialStats, "rating" | "ratingsCount" | "reviewsCount" | "followers">>;
  reviews?: SocialReview[];
  posts?: SocialPost[];
};
