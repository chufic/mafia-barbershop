/**
 * Акции. Пока массив пуст — на сайте показывается аккуратное пустое состояние.
 * Не добавляйте сюда скидки и предложения, которых нет на самом деле.
 *
 * Пример заполненной акции (раскомментируйте и замените данными):
 *
 * {
 *   id: "first-visit",
 *   title: "Скидка на первый визит",
 *   description: "10% на любую услугу при первой записи через сайт.",
 *   conditions: "Не суммируется с другими предложениями.",
 *   validUntil: "2026-12-31",
 *   badge: "Новичкам",
 * },
 */

export type Promo = {
  id: string;
  title: string;
  description: string;
  /** Условия мелким шрифтом — необязательно. */
  conditions?: string;
  /** Дата окончания в формате YYYY-MM-DD — необязательно. */
  validUntil?: string;
  badge?: string;
};

export const promos: Promo[] = [];

export const promosUpdatedAt: string | null = null; // TODO: дата обновления акций
