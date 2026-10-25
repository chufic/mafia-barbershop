"use client";

import { useEffect, useState } from "react";
import { getOpenStatus, type OpenStatus } from "./time";

/**
 * Живой статус «Открыто / Закрыто». Считается по тюменскому времени и
 * обновляется раз в минуту. null на первом рендере — чтобы не было
 * расхождения гидратации: страница может быть статической.
 */
export function useOpenStatus(): OpenStatus | null {
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    const update = () => setStatus(getOpenStatus(new Date()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return status;
}
