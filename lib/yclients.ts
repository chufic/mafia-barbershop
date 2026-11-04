/**
 * Уведомления YCLIENTS (Настройки → WebHook → «Событие по записям»).
 *
 * YCLIENTS присылает событие POST-запросом на наш адрес. Формат официально не
 * зафиксирован и менялся, поэтому разбор намеренно терпимый: ищем известные
 * ключи в нескольких местах, а если ничего не узнали — всё равно сохраняем
 * тело и показываем его в Telegram. Так первое же реальное событие покажет нам
 * точный формат, и разбор можно будет уточнить.
 */

type Json = Record<string, unknown>;

const EVENT_TITLES: Record<string, string> = {
  record_created: "Новая запись",
  record_updated: "Запись изменена",
  record_deleted: "Запись удалена",
  record_canceled: "Запись отменена",
  record_cancelled: "Запись отменена",
  record_confirmed: "Запись подтверждена",
};

/** Ключи, в которых YCLIENTS кладёт имя события. */
const EVENT_KEYS = ["event", "event_type", "eventType", "event_name", "type", "action"];

/** Ключи, в которых лежит полезная нагрузка. */
const DATA_KEYS = ["data", "payload", "body", "record", "object"];

function isJson(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asJson(value: unknown): Json | null {
  return isJson(value) ? value : null;
}

/** Первое непустое значение из списка вариантов пути. */
function pick(root: Json, keys: string[]): unknown {
  for (const key of keys) {
    const value = root[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function pickString(root: Json, keys: string[]): string {
  const value = pick(root, keys);
  return typeof value === "string" ? value.trim() : "";
}

function pickNumber(root: Json, keys: string[]): number | null {
  const value = pick(root, keys);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  return null;
}

/** Находим вложенный объект с данными: сначала по известным ключам, затем «самый rich». */
function findPayload(root: Json): Json {
  for (const key of DATA_KEYS) {
    const nested = asJson(root[key]);
    if (nested) return nested;
  }
  // Иногда данные лежат прямо в корне вместе с именем события.
  const nested = Object.values(root).filter(isJson);
  if (nested.length === 1) return nested[0];
  return root;
}

function parseServices(payload: Json): string[] {
  const raw = pick(payload, ["services", "goods", "service", "records"]);
  const list = Array.isArray(raw) ? raw : [];
  const names: string[] = [];
  for (const item of list) {
    const row = asJson(item);
    if (!row) continue;
    const title = pickString(row, ["title", "name", "service_title", "good_title"]);
    if (title) names.push(title);
  }
  if (!names.length) {
    const single = pickString(payload, ["service_title", "service", "service_name"]);
    if (single) names.push(single);
  }
  return names;
}

function staffName(payload: Json): string {
  const staff = asJson(pick(payload, ["staff", "master", "employee"]));
  if (staff) {
    const name = pickString(staff, ["name", "title", "short_name"]);
    if (name) return name;
  }
  return pickString(payload, ["staff_name", "master_name", "staff_title"]);
}

function clientInfo(payload: Json): { name: string; phone: string } {
  const client = asJson(pick(payload, ["client", "customer"]));
  if (client) {
    return {
      name: pickString(client, ["name", "fio", "display_name"]),
      phone: pickString(client, ["phone", "phone_number"]),
    };
  }
  return {
    name: pickString(payload, ["client_name", "customer_name"]),
    phone: pickString(payload, ["client_phone", "phone"]),
  };
}

/** Дата визита в формате «5 ноября, 14:00» (по Тюмени). Без падений на мусоре. */
function visitTime(payload: Json): string {
  const raw = pick(payload, ["datetime", "date", "start_date", "record_date", "date_start"]);
  if (typeof raw !== "string" || !raw.trim()) return "";
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return raw;
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Asia/Yekaterinburg",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed);
  } catch {
    return raw;
  }
}

export type YclientsEvent = {
  /** Имя события из запроса, если его удалось найти. */
  event: string;
  /** Человеческий заголовок для Telegram. */
  title: string;
  /** Id записи в журнале YCLIENTS. */
  recordId: number | null;
  /** Короткие строки «поле: значение» для сообщения. */
  details: string[];
  /** Признак того, что мы поняли структуру (иначе в сообщении будет сырой JSON). */
  recognized: boolean;
};

export function describeYclientsEvent(payload: unknown): YclientsEvent {
  const root = asJson(payload);
  if (!root) {
    return { event: "", title: "Событие YCLIENTS", recordId: null, details: [], recognized: false };
  }

  const data = findPayload(root);
  const event =
    pickString(root, EVENT_KEYS) || pickString(data, EVENT_KEYS);
  const normalizedEvent = event.toLowerCase().replace(/[\s-]+/g, "_");

  const recordId = pickNumber(data, ["record_id", "id", "recordId"]) ?? pickNumber(root, ["record_id", "id"]);

  const services = parseServices(data).concat(parseServices(root));
  const staff = staffName(data) || staffName(root);
  const client = clientInfo(data);
  const when = visitTime(data) || visitTime(root);

  const details: string[] = [];
  const label = client.name || "";
  if (label) details.push(`<b>Клиент:</b> ${escapeText(label)}${client.phone ? `, ${escapeText(client.phone)}` : ""}`);
  else if (client.phone) details.push(`<b>Телефон:</b> ${escapeText(client.phone)}`);
  if (services.length) details.push(`<b>Услуги:</b> ${escapeText([...new Set(services)].join(", "))}`);
  if (staff) details.push(`<b>Мастер:</b> ${escapeText(staff)}`);
  if (when) details.push(`<b>Когда:</b> ${escapeText(when)}`);
  if (recordId) details.push(`<b>Запись №</b> ${recordId}`);

  const recognized = Boolean(event || details.length);
  return {
    event: normalizedEvent,
    title: EVENT_TITLES[normalizedEvent] ?? "Событие YCLIENTS",
    recordId,
    details,
    recognized,
  };
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Сообщение для Telegram по событию YCLIENTS. */
export function buildYclientsMessage(payload: unknown, rawBody: string): string {
  const described = describeYclientsEvent(payload);
  const lines = [`📅 <b>YCLIENTS: ${described.title}</b>`, ...described.details];
  if (described.event) lines.push(`<b>Событие:</b> ${escapeText(described.event)}`);
  if (!described.recognized) {
    const preview = rawBody.replace(/\s+/g, " ").slice(0, 500);
    lines.push(`<b>Сырые данные:</b> <code>${escapeText(preview)}</code>`);
  }
  return lines.join("\n");
}
