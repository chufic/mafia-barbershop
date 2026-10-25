/** Оркестратор синхронизации: запускает площадки параллельно и сохраняет итог. */

import { saveSyncResults } from "./store";
import { syncTwogis } from "./twogis";
import { syncVk } from "./vk";
import { syncYandex } from "./yandex";
import type { SocialOverview, SourceId, SyncResult } from "./types";
import { getSocialOverview } from "./store";

const ADAPTERS: Array<{ source: SourceId; run: () => Promise<SyncResult> }> = [
  { source: "2gis", run: syncTwogis },
  { source: "yandex", run: syncYandex },
  { source: "vk", run: syncVk },
];

export type SyncSummary = {
  durationMs: number;
  finishedAt: string;
  results: SyncResult[];
};

/** Одновременно идёт только один прогон — расписание и кнопка не мешают друг другу. */
let running = false;

export function isSyncRunning(): boolean {
  return running;
}

export async function runSync(only: SourceId[] = []): Promise<SyncSummary> {
  if (running) throw new Error("Синхронизация уже идёт");

  running = true;
  const startedAt = Date.now();

  try {
    const selected = only.length > 0 ? ADAPTERS.filter((item) => only.includes(item.source)) : ADAPTERS;

    const settled = await Promise.allSettled(selected.map((item) => item.run()));

    const results: SyncResult[] = settled.map((outcome, index) => {
      if (outcome.status === "fulfilled") return outcome.value;

      return {
        source: selected[index].source,
        status: "error",
        message: describeError(outcome.reason),
      };
    });

    const durationMs = Date.now() - startedAt;
    saveSyncResults(results, durationMs);

    return { durationMs, finishedAt: new Date().toISOString(), results };
  } finally {
    running = false;
  }
}

export function getOverview(): SocialOverview {
  return getSocialOverview();
}

function describeError(reason: unknown): string {
  if (reason instanceof Error) return reason.message.slice(0, 300);
  if (typeof reason === "string") return reason.slice(0, 300);
  return "неизвестная ошибка";
}
