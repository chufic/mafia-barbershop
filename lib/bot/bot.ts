/**
 * Интерактивный Telegram-бот барбершопа «Мафия».
 *
 * Работает в двух режимах (логика общая):
 *  - long-polling: `npm run bot` (scripts/bot.ts) — для разработки/VPS;
 *  - вебхук: app/api/tg/route.ts — для serverless (Netlify/Vercel).
 *
 * Запись клиента сделана «без состояния»: телефон собирается через кнопку
 * «Поделиться номером», а дальше всё кодируется в callback_data — поэтому
 * работает и на серверлесс, где между запросами нет памяти.
 * Услуги можно выбрать несколько (до 4, как в корзине сайта).
 */

import { Bot, InlineKeyboard, Keyboard, type Context } from "grammy";
import { getMasterById } from "../../data/masters";
import { mastersForServices, services, serviceMasterHint } from "../../data/services";
import { site } from "../../data/site";
import {
  bookingToDto,
  cancelBooking,
  cancelBookingByChatId,
  createBooking,
  getBookingsByChatId,
  getBookingsByPhone,
  listBusyForDate,
  type BookingRecord,
} from "../bookings";
import { getDb, num, queryOne, rowObject, str } from "../db";
import { normalizePhone } from "../phone";
import { computeMasterAvailability } from "../slots";
import { escapeHtml, notifyCancellation, notifyNewBooking } from "../telegram";
import { formatDuration, formatPrice } from "../format";
import {
  addDays,
  formatDateRu,
  formatDateShort,
  formatDateTimeRange,
  formatRelativeDate,
  todayDateStr,
  zonedToUtc,
} from "../time";

const BACK_LABEL = "‹ Назад";
const MAX_SERVICES = 4;

function adminChatIds(): string[] {
  return (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isAdmin(chatId: number): boolean {
  return adminChatIds().includes(String(chatId));
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/* ---------- /my: состояние диалога и список записей ---------- */

const STATE_MY = "my";

/**
 * На serverless между запросами нет памяти, поэтому «жду номер для /my»
 * храним в базе, а не в переменной модуля.
 */
async function setBotState(chatId: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO bot_state (chat_id, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(chat_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [chatId, value, new Date().toISOString()],
  });
}

/** Читает и удаляет состояние: оно нужно только на один следующий шаг. */
async function takeBotState(chatId: string): Promise<string | null> {
  const db = await getDb();
  const row = await queryOne(db, "SELECT value FROM bot_state WHERE chat_id = ?", [chatId]);
  if (!row) return null;
  await db.execute({ sql: "DELETE FROM bot_state WHERE chat_id = ?", args: [chatId] });
  return str(row.value);
}

/** Список будущих записей и кнопки отмены. null — если записей нет. */
function myBookingsView(
  bookings: BookingRecord[],
  now: Date,
  withPhone: string | null,
): { text: string; keyboard: InlineKeyboard } | null {
  const upcoming = bookings.filter(
    (booking) => booking.status === "new" && new Date(booking.startsAt).getTime() > now.getTime(),
  );
  if (upcoming.length === 0) return null;

  const keyboard = new InlineKeyboard();
  const blocks = upcoming.map((booking) => {
    const dto = bookingToDto(booking, now);
    const services = booking.services.map((service) => service.name).join(", ");

    if (dto.canCancel) {
      const label = `❌ Отменить ${formatDateShort(dto.date)} в ${dto.time}`;
      keyboard
        .text(
          label,
          withPhone ? `xp:${booking.publicId}:${phoneDigits(withPhone)}` : `x:${booking.publicId}`,
        )
        .row();
    }

    return (
      `🕐 <b>${escapeHtml(formatDateTimeRange(booking.startsAt, booking.endsAt))}</b>\n` +
      `💈 ${escapeHtml(services)} — ${formatPrice(booking.totalPrice)}\n` +
      `👤 ${escapeHtml(booking.masterName)} · № ${escapeHtml(booking.publicId)}` +
      (dto.canCancel
        ? ""
        : `\n⚠️ До визита меньше 2 часов — отменить можно только по телефону ${escapeHtml(site.phoneDisplay)}.`)
    );
  });

  return { text: `Ваши записи:\n\n${blocks.join("\n\n")}`, keyboard };
}

/** Показать записи по чату; если их нет — попросить номер телефона. */
async function sendMyBookings(ctx: Context, chatId: string): Promise<void> {
  const now = new Date();
  const bookings = await getBookingsByChatId(chatId, now);
  const view = myBookingsView(bookings, now, null);

  if (view) {
    await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    return;
  }

  await setBotState(chatId, STATE_MY);
  await ctx.reply(
    "Пока не вижу записей из этого чата.\n\n" +
      "Поделитесь номером телефона, на который оформлена запись, — найду её.",
    { reply_markup: contactKeyboard("📞 Поделиться номером") },
  );
}

function contactKeyboard(label: string): Keyboard {
  return new Keyboard().requestContact(label).oneTime(true).resized(true);
}

/** Ответ на нажатие «Отменить»: сообщение + уведомление администратору. */
async function handleCancellation(
  ctx: Context,
  result: Awaited<ReturnType<typeof cancelBooking>>,
): Promise<void> {
  if (!result.ok) {
    await ctx.answerCallbackQuery({ text: result.message, show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery({ text: "Запись отменена" });
  await ctx.editMessageText(
    `❌ Запись № ${escapeHtml(result.booking.publicId)} отменена.\n\n` +
      `«Мои записи» покажет остальные. Записаться заново — /start`,
    { parse_mode: "HTML" },
  );
  await notifyCancellation(result.booking).catch(() => undefined);
}

/** Список индексов услуг из callback_data («0,5,12» → [0, 5, 12]). */
function parseList(list: string): number[] {
  if (!list) return [];
  return list
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n < services.length);
}

/** Выбранные услуги по списку индексов. */
function chosenServices(list: string) {
  return parseList(list)
    .map((idx) => services[idx])
    .filter((service): service is NonNullable<typeof service> => Boolean(service));
}

function servicesText(): string {
  const lines = services.map((service) => {
    const hint = serviceMasterHint(service);
    const owner = hint ? ` — ${hint}` : "";
    return `<b>${escapeHtml(service.name)}</b> — ${formatPrice(service.price)} · ${formatDuration(service.durationMin)}${owner ? ` · ${owner}` : ""}`;
  });
  return `Услуги и цены:\n\n${lines.join("\n")}\n\nЗаписаться — нажмите кнопку внизу.`;
}

/** Клавиатура мультивыбора услуг: «✓» у выбранных, «Далее», «Отмена». */
function servicesKeyboard(phone: string, selected: number[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  services.forEach((service, idx) => {
    const on = selected.includes(idx);
    const label = `${on ? "✓ " : ""}${service.name} · ${formatPrice(service.price)}`;
    // В callback_data кладём ТЕКУЩИЙ выбор; переключение считает сам обработчик.
    kb.text(label, `sv:${idx}:${phone}:${selected.join(",")}`).row();
  });
  const nextLabel = selected.length ? `Далее (${selected.length}) →` : "Далее →";
  kb.text(nextLabel, `done:${phone}:${selected.join(",")}`);
  kb.text("Отмена", "cancel");
  return kb;
}

async function freeSlots(masterId: string, durationMin: number, date: string) {
  const master = getMasterById(masterId);
  if (!master) return [];
  const busy = await listBusyForDate(date);
  return computeMasterAvailability({ date, durationMin, master, busy, now: new Date() }).slots;
}

function parseServicesText(json: string): string {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return "";
    return parsed
      .map((item) =>
        item && typeof item === "object" && "name" in item
          ? `${String((item as { name: string }).name)} (${formatPrice(
              Number((item as { price: number }).price) || 0,
            )})`
          : "",
      )
      .filter(Boolean)
      .join(", ");
  } catch {
    return "";
  }
}

type BookingSource = "site" | "telegram";

function sourceLabel(source: string): string {
  return source === "telegram" ? "📱 из бота" : "🌐 с сайта";
}

/** Полный текст фильтра для тех же надписей в заголовке. */
function sourceTitle(source: BookingSource | null): string {
  if (source === "telegram") return "только из бота";
  if (source === "site") return "только с сайта";
  return "все";
}

export async function upcomingBookingsText(filter: BookingSource | null = null): Promise<string> {
  const db = await getDb();
  const nowIso = new Date().toISOString();

  const rows = (await db.execute({
    sql: `SELECT b.*, m.name AS master_name
          FROM bookings b
          LEFT JOIN masters m ON m.id = b.master_id
          WHERE b.status = 'new' AND b.starts_at >= ?
            ${filter ? "AND b.source = ?" : ""}
          ORDER BY b.starts_at ASC
          LIMIT 10`,
    args: filter ? [nowIso, filter] : [nowIso],
  })).rows.map((row) => rowObject(row));

  if (rows.length === 0) {
    return filter
      ? `Ближайших заявок ${sourceTitle(filter)} нет 🎉`
      : "Ближайших заявок пока нет 🎉";
  }

  const lines = rows.map((row) => {
    const servicesSummary = parseServicesText(str(row.services_json));
    return (
      `🕐 ${escapeHtml(formatDateTimeRange(str(row.starts_at), str(row.ends_at)))}\n` +
      `👤 ${escapeHtml(str(row.name))} · ${escapeHtml(str(row.phone))}\n` +
      `💈 ${escapeHtml(servicesSummary)} — ${formatPrice(num(row.total_price))}\n` +
      `📌 ${sourceLabel(str(row.source, "site"))} · мастер ${escapeHtml(str(row.master_name))}\n` +
      `№ ${escapeHtml(str(row.public_id))}`
    );
  });

  const counts = (await db.execute({
    sql: `SELECT source, COUNT(*) AS n FROM bookings
          WHERE status = 'new' AND starts_at >= ? GROUP BY source`,
    args: [nowIso],
  })).rows.map((row) => rowObject(row));

  const countOf = (source: string) =>
    num(counts.find((row) => str(row.source) === source)?.n ?? 0);
  const total = countOf("site") + countOf("telegram");
  const breakdown = `🌐 с сайта ${countOf("site")}, 📱 из бота ${countOf("telegram")}`;
  const summary = filter
    ? `Показано: ${rows.length}. Всего будущих: ${total} (${breakdown})`
    : `Всего будущих: ${total} — ${breakdown}`;

  return (
    `Ближайшие заявки (${sourceTitle(filter)}):\n` +
    `${summary}\n\n${lines.join("\n\n")}`
  );
}

/** Кнопки фильтра под списком заявок. */
function bookingsKeyboard(active: BookingSource | null): InlineKeyboard {
  const label = (value: BookingSource | null, text: string) =>
    active === value ? `• ${text} •` : text;

  return new InlineKeyboard()
    .text(label(null, "Все"), "bk:all")
    .text(label("site", "🌐 Сайт"), "bk:site")
    .text(label("telegram", "📱 Бот"), "bk:telegram");
}

export function createBot(token: string, agent?: unknown): Bot {
  const bot = new Bot(
    token,
    agent ? { client: { baseFetchConfig: { agent } as Parameters<typeof fetch>[1] } } : {},
  );

  const mainMenu = new InlineKeyboard()
    .text("📝 Записаться", "book")
    .row()
    .text("📋 Мои записи", "mybookings")
    .row()
    .text("💰 Услуги и цены", "prices");

  bot.command("start", async (ctx) => {
    const adminLine = isAdmin(ctx.chat.id)
      ? "\n\nВы администратор — ближайшие заявки: /bookings"
      : "";
    await ctx.reply(
      `Привет! Я бот барбершопа <b>«Мафия»</b> в Тюмени.\n` +
        `Запишу вас на стрижку или бороду — быстрее, чем звонить.\n\n` +
        `🏠 ${escapeHtml(site.address)}\n` +
        `🕙 ${escapeHtml(site.hours.days)}, ${escapeHtml(site.hours.open)}–${escapeHtml(site.hours.close)}\n\n` +
        `Записаться — кнопка ниже. Посмотреть или отменить запись — /my` +
        adminLine,
      { parse_mode: "HTML", reply_markup: mainMenu },
    );
  });

  bot.command("help", async (ctx) => {
    const adminLine = isAdmin(ctx.chat.id)
      ? "/bookings — ближайшие заявки (видно, откуда: сайт или бот)\n" +
        "/bookings bot — только записи из бота\n" +
        "/bookings site — только записи с сайта\n"
      : "";
    await ctx.reply(
      `Команды:\n/start — главное меню\n/my — мои записи и отмена\n/services — услуги и цены\n${adminLine}`,
      { reply_markup: mainMenu },
    );
  });

  bot.command("my", async (ctx) => {
    await sendMyBookings(ctx, String(ctx.chat.id));
  });

  bot.callbackQuery("mybookings", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendMyBookings(ctx, String(ctx.chat?.id ?? ctx.from?.id ?? ""));
  });

  bot.command("services", async (ctx) => {
    await ctx.reply(servicesText(), { parse_mode: "HTML", reply_markup: mainMenu });
  });

  bot.command("bookings", async (ctx) => {
    if (!isAdmin(ctx.chat.id)) {
      await ctx.reply("Эта команда доступна только администратору.");
      return;
    }

    const arg = (ctx.match ?? "").trim().toLowerCase();
    let filter: BookingSource | null = null;
    if (/^(bot|бот|тг|tg|telegram)/.test(arg)) filter = "telegram";
    else if (/^(site|сайт|web)/.test(arg)) filter = "site";

    await ctx.reply(await upcomingBookingsText(filter), {
      parse_mode: "HTML",
      reply_markup: bookingsKeyboard(filter),
    });
  });

  // Переключение фильтра под списком заявок
  bot.callbackQuery(/^bk:(all|site|telegram)$/, async (ctx) => {
    if (!ctx.chat || !isAdmin(ctx.chat.id)) {
      await ctx.answerCallbackQuery({ text: "Только для администратора.", show_alert: true });
      return;
    }

    const filter = ctx.match[1] === "all" ? null : (ctx.match[1] as BookingSource);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(await upcomingBookingsText(filter), {
      parse_mode: "HTML",
      reply_markup: bookingsKeyboard(filter),
    });
  });

  // Записаться → просим номер
  bot.callbackQuery("book", async (ctx) => {
    await ctx.answerCallbackQuery();
    await takeBotState(String(ctx.chat?.id ?? ctx.from?.id ?? ""));
    await ctx.reply("Для записи нужен ваш номер телефона. Нажмите кнопку ниже 👇", {
      reply_markup: contactKeyboard("📞 Поделиться номером"),
    });
  });

  bot.callbackQuery("prices", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(servicesText(), { parse_mode: "HTML", reply_markup: mainMenu });
  });

  bot.callbackQuery("cancel", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("Запись отменена. Нажмите /start, чтобы начать заново.");
  });

  // Получили контакт → либо ищем записи (/my), либо показываем мультивыбор услуг
  bot.on("message:contact", async (ctx) => {
    const contact = ctx.message.contact;
    const chatId = String(ctx.chat.id);
    // В callback_data номер едет цифрами (7XXXXXXXXXX), поэтому «+» не храним.
    const phone = (normalizePhone(contact.phone_number) ?? `+${phoneDigits(contact.phone_number)}`)
      .replace(/\D/g, "");
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
      ctx.from?.first_name ||
      "Гость";

    const state = await takeBotState(chatId);

    if (state === STATE_MY) {
      const now = new Date();
      const bookings = await getBookingsByPhone(`+${phone}`, now);
      const view = myBookingsView(bookings, now, `+${phone}`);

      if (view) {
        await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
        return;
      }

      await ctx.reply(
        `На номер +${escapeHtml(phone)} активных записей нет.\n\nЗаписаться — /start`,
        { parse_mode: "HTML", reply_markup: mainMenu },
      );
      return;
    }

    await ctx.reply(
      `Спасибо, <b>${escapeHtml(name)}</b>! Выберите услуги (можно несколько):`,
      { parse_mode: "HTML", reply_markup: servicesKeyboard(phone, []) },
    );
  });

  // Переключить услугу (мультивыбор)
  bot.callbackQuery(/^sv:(\d+):(\d+):(.*)$/, async (ctx) => {
    const idx = Number(ctx.match[1]);
    const phone = ctx.match[2];
    const selected = parseList(ctx.match[3]);
    const service = services[idx];
    if (!service) {
      await ctx.answerCallbackQuery();
      return;
    }

    const next = selected.includes(idx)
      ? selected.filter((x) => x !== idx)
      : [...selected, idx];

    if (next.length > MAX_SERVICES) {
      await ctx.answerCallbackQuery({
        text: `В одну запись — не больше ${MAX_SERVICES} услуг.`,
        show_alert: true,
      });
      return;
    }

    await ctx.answerCallbackQuery();
    await ctx.editMessageText("Выберите услуги (можно несколько):", {
      reply_markup: servicesKeyboard(phone, next),
    });
  });

  // Вернуться к списку услуг (из шага мастера)
  bot.callbackQuery(/^sel:(\d+):(.*)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("Выберите услуги (можно несколько):", {
      reply_markup: servicesKeyboard(ctx.match[1], parseList(ctx.match[2])),
    });
  });

  // Услуги выбраны → мастера
  bot.callbackQuery(/^done:(\d+):(.*)$/, async (ctx) => {
    const phone = ctx.match[1];
    const list = ctx.match[2];
    const chosen = chosenServices(list);
    if (chosen.length === 0) {
      await ctx.answerCallbackQuery({ text: "Выберите хотя бы одну услугу.", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();

    const summary = chosen.map((s) => `${s.name} — ${formatPrice(s.price)}`).join(", ");
    const total = chosen.reduce((sum, s) => sum + s.price, 0);
    const duration = chosen.reduce((sum, s) => sum + s.durationMin, 0);

    const kb = new InlineKeyboard();
    for (const master of mastersForServices(chosen.map((s) => s.id))) {
      kb.text(master.name, `m:${master.id}:${phone}:${list}`).row();
    }
    kb.text(BACK_LABEL, `sel:${phone}:${list}`);

    await ctx.editMessageText(
      `<b>Выбрано:</b> ${escapeHtml(summary)}\n<b>Итого:</b> ${formatPrice(total)} · ${formatDuration(duration)}\n\nВыберите мастера:`,
      { parse_mode: "HTML", reply_markup: kb },
    );
  });

  // Мастер → даты
  bot.callbackQuery(/^m:([^:]+):(\d+):(.*)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const masterId = ctx.match[1];
    const phone = ctx.match[2];
    const list = ctx.match[3];
    const master = getMasterById(masterId);
    if (!master) return;

    const today = todayDateStr();
    const kb = new InlineKeyboard();
    for (const offset of [0, 1, 2]) {
      const date = addDays(today, offset);
      kb.text(formatRelativeDate(date, today), `dt:${date}:${masterId}:${phone}:${list}`).row();
    }
    kb.text(BACK_LABEL, `done:${phone}:${list}`);

    await ctx.editMessageText(
      `Мастер: <b>${escapeHtml(master.name)}</b>. Выберите день:`,
      { parse_mode: "HTML", reply_markup: kb },
    );
  });

  // Дата → время
  bot.callbackQuery(/^dt:(\d{4}-\d{2}-\d{2}):([^:]+):(\d+):(.*)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const date = ctx.match[1];
    const masterId = ctx.match[2];
    const phone = ctx.match[3];
    const list = ctx.match[4];
    const chosen = chosenServices(list);
    if (chosen.length === 0) return;

    const duration = chosen.reduce((sum, s) => sum + s.durationMin, 0);
    const slots = await freeSlots(masterId, duration, date);

    const kb = new InlineKeyboard();
    if (slots.length === 0) {
      kb.text("На этот день свободного времени нет", "ignore").row();
    } else {
      for (const slot of slots.slice(0, 12)) {
        kb.text(slot.time, `t:${slot.time}:${date}:${masterId}:${phone}:${list}`).row();
      }
    }
    kb.text(BACK_LABEL, `m:${masterId}:${phone}:${list}`);

    await ctx.editMessageText(
      `${escapeHtml(formatDateRu(date))}. Свободное время:`,
      { reply_markup: kb },
    );
  });

  // Время → создаём заявку
  bot.callbackQuery(/^t:(\d{2}):(\d{2}):(\d{4}-\d{2}-\d{2}):([^:]+):(\d+):(.*)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const time = `${ctx.match[1]}:${ctx.match[2]}`;
    const date = ctx.match[3];
    const masterId = ctx.match[4];
    const phone = ctx.match[5];
    const list = ctx.match[6];

    const master = getMasterById(masterId);
    const chosen = chosenServices(list);
    if (!master || chosen.length === 0) return;

    const name = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ") || "Гость";
    const startsAt = zonedToUtc(date, time).toISOString();

    const result = await createBooking({
      name,
      phone: `+${phone}`,
      comment: null,
      masterId,
      serviceIds: chosen.map((s) => s.id),
      startsAt,
      requestKey: `tg:${ctx.from?.id ?? 0}:${date}:${time}:${masterId}`,
      source: "telegram",
      tgChatId: ctx.chat?.id ? String(ctx.chat.id) : null,
    });

    if (!result.ok) {
      await ctx.editMessageText(
        `Не получилось записать: ${escapeHtml(result.message)}. Попробуйте другое время.`,
        { parse_mode: "HTML", reply_markup: mainMenu },
      );
      return;
    }

    const booking = result.booking;
    const summary = chosen.map((s) => `${s.name} — ${formatPrice(s.price)}`).join(", ");
    await ctx.editMessageText(
      `✅ <b>Вы записаны!</b>\n\n` +
        `<b>Услуги:</b> ${escapeHtml(summary)}\n` +
        `<b>Итого:</b> ${formatPrice(booking.totalPrice)} · ${formatDuration(booking.durationMin)}\n` +
        `<b>Мастер:</b> ${escapeHtml(master.name)}\n` +
        `<b>Когда:</b> ${escapeHtml(formatDateTimeRange(booking.startsAt, booking.endsAt))}\n` +
        `<b>Заявка:</b> ${escapeHtml(booking.publicId)}\n\n` +
        `Ждём вас! Посмотреть или отменить запись — /my`,
      { parse_mode: "HTML" },
    );

    // На serverless нельзя отправлять «в фоне»: функция завершится раньше
    // запроса в Telegram, и уведомление потеряется. Поэтому ждём ответа.
    if (!result.duplicate) {
      await notifyNewBooking(booking).catch(() => undefined);
    }
  });

  // Отмена записи из /my: по чату (запись сделана в боте) или по номеру
  bot.callbackQuery(/^x:([^:]+)$/, async (ctx) => {
    const result = await cancelBookingByChatId(ctx.match[1], String(ctx.chat?.id ?? ""));
    await handleCancellation(ctx, result);
  });

  bot.callbackQuery(/^xp:([^:]+):(\d+)$/, async (ctx) => {
    const result = await cancelBooking(ctx.match[1], `+${ctx.match[2]}`);
    await handleCancellation(ctx, result);
  });

  bot.callbackQuery("ignore", async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  return bot;
}
