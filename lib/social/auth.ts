/**
 * Защита служебных endpoint'ов.
 *
 * Если задан SYNC_TOKEN — нужен заголовок `x-sync-token` или `?token=`.
 * Если токена нет, запросы принимаются только с этой же машины: так работает
 * планировщик на локальном сервере, а из интернета endpoint закрыт.
 */

const LOOPBACK_HOSTS = /^(127\.0\.0\.1|localhost|\[::1\]|::1)(:\d+)?$/;

function isLoopbackClient(value: string): boolean {
  const client = value.replace(/^\[|\]$/g, "");
  return (
    client === "::1" ||
    client === "localhost" ||
    /^127\./.test(client) ||
    /^::ffff:127\./.test(client)
  );
}

export function isSyncAllowed(request: Request): boolean {
  const token = process.env.SYNC_TOKEN?.trim();

  if (token) {
    const header = request.headers.get("x-sync-token");
    const query = new URL(request.url).searchParams.get("token");
    return header === token || query === token;
  }

  // Next.js сам добавляет x-forwarded-* — учитываем и их, и обычный Host.
  const forwardHost = firstValue(request.headers.get("x-forwarded-host"));
  const host = (forwardHost || firstValue(request.headers.get("host"))).toLowerCase();

  if (!LOOPBACK_HOSTS.test(host)) {
    logRejected(request, host);
    return false;
  }

  const client = firstValue(request.headers.get("x-forwarded-for"));
  if (client && !isLoopbackClient(client)) {
    logRejected(request, host, client);
    return false;
  }

  return true;
}

function firstValue(value: string | null): string {
  return (value ?? "").split(",")[0].trim();
}

function logRejected(request: Request, host: string, client?: string): void {
  console.warn(
    "[sync] отклонён запрос без токена:",
    request.method,
    "host=",
    host || "(пусто)",
    client ? `client=${client}` : "",
  );
}
