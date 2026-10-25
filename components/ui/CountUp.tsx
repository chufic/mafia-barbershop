"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Число, которое «накручивается» при попадании в кадр.
 * Чистый requestAnimationFrame + IntersectionObserver, без библиотек.
 */
export function CountUp({
  value,
  decimals = 0,
  duration = 1400,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(() => format(0, decimals));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let fallbackTimer = 0;
    let started = false;
    let cancelled = false;

    const finish = () => setDisplay(format(value, decimals));

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        setDisplay(format(value * eased, decimals));
        if (t < 1) raf = requestAnimationFrame(tick);
        else finish();
      };
      raf = requestAnimationFrame(tick);
      // Страховка: если rAF по какой-то причине не тикает, всё равно показываем итог.
      fallbackTimer = window.setTimeout(() => {
        if (!cancelled) finish();
      }, duration + 150);
    };

    const cleanup = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(fallbackTimer);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return cleanup;
    }

    // Если элемент уже виден при загрузке — запускаем сразу.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      started = true;
      run();
      return cleanup;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (!started && entries.some((entry) => entry.isIntersecting)) {
          started = true;
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => {
      cleanup();
      io.disconnect();
    };
  }, [value, decimals, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

function format(n: number, decimals: number): string {
  return n.toFixed(decimals).replace(".", ",");
}
