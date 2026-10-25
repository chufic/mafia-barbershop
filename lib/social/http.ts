/** HTTP-обёртка для синхронизации: таймаут, браузерный User-Agent, разбор HTML. */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_TIMEOUT_MS = 20_000;

export type FetchOptions = {
  timeoutMs?: number;
  headers?: Record<string, string>;
};

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        "accept-language": "ru-RU,ru;q=0.9,en;q=0.8",
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} для ${new URL(url).host}`);
    }

    // VK отдаёт виджет и страницу группы в windows-1251, Яндекс и 2ГИС — в UTF-8.
    // response.text() всегда декодирует как UTF-8, поэтому читаем байты сами.
    const bytes = await response.arrayBuffer();
    const charset = /charset=([\w-]+)/i.exec(response.headers.get("content-type") ?? "")?.[1];

    if (charset && !/^utf-?8$/i.test(charset)) {
      try {
        return new TextDecoder(charset).decode(bytes);
      } catch {
        // неизвестная кодировка — падаем обратно на UTF-8
      }
    }

    return new TextDecoder("utf-8").decode(bytes);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("источник не ответил за 20 секунд");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const text = await fetchText(url, {
    ...options,
    headers: { accept: "application/json", ...options.headers },
  });

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("источник вернул не JSON");
  }
}

/** Достаёт JSON-массив, который начинается с `"key":[`, с учётом вложенности. */
export function extractJsonArray(html: string, key: string): unknown[] | null {
  const marker = `"${key}":[`;
  const start = html.indexOf(marker);
  if (start === -1) return null;

  const arrayStart = start + marker.length - 1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = arrayStart; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(arrayStart, index + 1)) as unknown[];
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

/** Убирает теги и HTML-сущности из текста поста. */
export function htmlToText(value: string): string {
  return value
    .replace(/<button[\s\S]*?<\/button>/gi, "") // кнопка «Показать ещё» внутри текста
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, (_, alt: string) => decodeEntities(alt))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => safeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => safeCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** Приводит любую дату к UTC ISO; при ошибке возвращает `fallback`. */
export function toIso(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 1e12 ? value : value * 1000;
    return new Date(milliseconds).toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return fallback;
}

export function cleanText(value: unknown, maxLength = 1200): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** 4.400000095367432 → 4.4 */
export function roundRating(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed === null ? null : Math.round(parsed * 10) / 10;
}
