/** Корзина: только id + количество, цены всегда пересчитываются из каталога. */

import { getServiceById } from "../data/services";
import type { Service } from "../data/services";

export const CART_STORAGE_KEY = "mafia.cart.v1";
export const MAX_CART_SERVICES = 4;
export const MAX_CART_DURATION_MIN = 240;

export const CART_ERRORS = {
  tooManyServices: `В одну запись можно добавить не больше ${MAX_CART_SERVICES} услуг.`,
  tooLong: "Одна запись — не больше 4 часов. Уберите услугу или запишитесь отдельно.",
} as const;

export type CartItem = { id: string; qty: number };

export type CartTotals = {
  items: CartItem[];
  services: Service[];
  count: number;
  durationMin: number;
  total: number;
};

type StoredShape = { v: 1; items: CartItem[] };

/** Разбирает localStorage, молча отбрасывая мусор и удалённые услуги. */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const items =
      Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as StoredShape).items)
          ? (parsed as StoredShape).items
          : [];

    const seen = new Set<string>();
    const result: CartItem[] = [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const id = (item as { id?: unknown }).id;
      if (typeof id !== "string" || seen.has(id)) continue;
      if (!getServiceById(id)) continue;
      seen.add(id);
      result.push({ id, qty: 1 });
      if (result.length >= MAX_CART_SERVICES) break;
    }
    return result;
  } catch {
    return [];
  }
}

export function serializeCart(items: CartItem[]): string {
  const payload: StoredShape = { v: 1, items: items.map((item) => ({ id: item.id, qty: 1 })) };
  return JSON.stringify(payload);
}

export function isInCart(items: CartItem[], id: string): boolean {
  return items.some((item) => item.id === id);
}

export function addToCart(
  items: CartItem[],
  id: string,
): { items: CartItem[]; error: string | null } {
  const service = getServiceById(id);
  if (!service) return { items, error: "Такая услуга больше недоступна." };
  if (isInCart(items, id)) return { items, error: null };
  if (items.length >= MAX_CART_SERVICES) {
    return { items, error: CART_ERRORS.tooManyServices };
  }

  const next = [...items, { id, qty: 1 }];
  if (cartTotals(next).durationMin > MAX_CART_DURATION_MIN) {
    return { items, error: CART_ERRORS.tooLong };
  }
  return { items: next, error: null };
}

export function removeFromCart(items: CartItem[], id: string): CartItem[] {
  return items.filter((item) => item.id !== id);
}

export function toggleCart(
  items: CartItem[],
  id: string,
): { items: CartItem[]; error: string | null; added: boolean } {
  if (isInCart(items, id)) {
    return { items: removeFromCart(items, id), error: null, added: false };
  }
  const result = addToCart(items, id);
  return { ...result, added: result.error === null };
}

export function cartTotals(items: CartItem[]): CartTotals {
  const services = items
    .map((item) => getServiceById(item.id))
    .filter((service): service is Service => Boolean(service));

  return {
    items,
    services,
    count: services.length,
    durationMin: services.reduce((sum, service) => sum + service.durationMin, 0),
    total: services.reduce((sum, service) => sum + service.price, 0),
  };
}

export function cartServiceIds(items: CartItem[]): string[] {
  return items.map((item) => item.id);
}
