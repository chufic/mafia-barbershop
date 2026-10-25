"use client";

import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

/**
 * Обёртка scroll-reveal: показывает содержимое, когда оно попадает в кадр.
 * Анимация — чистый CSS (класс `.reveal` / `.is-visible`), никаких библиотек.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  /** Задержка в мс — для стаггерного появления соседних блоков. */
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => el.classList.add("is-visible");

    if (typeof IntersectionObserver === "undefined" || typeof window === "undefined") {
      show();
      return;
    }

    // Контент, который уже виден при загрузке (выше сгиба), показываем сразу —
    // иначе герой мог бы остаться невидимым, если наблюдатель не сработает.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      show();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show();
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined;

  return createElement(as, { ref, className: `reveal ${className}`.trim(), style }, children);
}
