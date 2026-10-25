"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CART_STORAGE_KEY,
  cartTotals,
  parseStoredCart,
  removeFromCart,
  serializeCart,
  toggleCart,
  type CartItem,
  type CartTotals,
} from "@/lib/cart";
type CartContextValue = CartTotals & {
  ready: boolean;
  has: (id: string) => boolean;
  add: (id: string) => string | null;
  remove: (id: string) => void;
  toggle: (id: string) => boolean;
  clear: () => void;
  clearWithConfirm: () => void;
  notice: string | null;
  dismissNotice: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const itemsRef = useRef<CartItem[]>([]);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    const stored = parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
    itemsRef.current = stored;
    setItems(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(items));
  }, [items, ready]);

  // синхронизация между вкладками
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CART_STORAGE_KEY) return;
      const next = parseStoredCart(event.newValue);
      itemsRef.current = next;
      setItems(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const dismissNotice = useCallback(() => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice(null);
  }, []);

  const notify = useCallback(
    (message: string) => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      setNotice(message);
      noticeTimer.current = window.setTimeout(() => setNotice(null), 4500);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const result = toggleCart(itemsRef.current, id);
      if (result.error) {
        notify(result.error);
        return false;
      }
      itemsRef.current = result.items;
      setItems(result.items);
      return result.added;
    },
    [notify],
  );

  const add = useCallback(
    (id: string) => {
      if (itemsRef.current.some((item) => item.id === id)) return null;
      const result = toggleCart(itemsRef.current, id);
      if (result.error) {
        notify(result.error);
        return result.error;
      }
      itemsRef.current = result.items;
      setItems(result.items);
      return null;
    },
    [notify],
  );

  const remove = useCallback((id: string) => {
    const next = removeFromCart(itemsRef.current, id);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
    setNotice(null);
  }, []);

  const clearWithConfirm = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.confirm("Очистить корзину? Выбранные услуги удалятся.")) clear();
  }, [clear]);

  const totals = useMemo(() => cartTotals(items), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      ...totals,
      ready,
      has: (id: string) => items.some((item) => item.id === id),
      add,
      remove,
      toggle,
      clear,
      clearWithConfirm,
      notice,
      dismissNotice,
    }),
    [totals, ready, items, add, remove, toggle, clear, clearWithConfirm, notice, dismissNotice],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart должен использоваться внутри CartProvider");
  return context;
}
