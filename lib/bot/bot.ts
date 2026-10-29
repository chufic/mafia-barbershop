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

import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { getActiveMasters, getMasterById } from "../../data/masters";
import { services } from "../../data/services";
import { site } from "../../data/site";
import { createBooking, listBusyForDate } from "../bookings";
import { getDb, num, rowObject, str } from "../db";
import { computeMasterAvailability } from "../slots";
import { escapeHtml, notifyNewBooking } from "../telegram";
import { formatDuration, formatPrice } from "../format";
import {
  addDays,
  formatDateRu,
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
  const lines = services.map(
    (service) =>
      `<b>${escapeHtml(service.name)}</b> — ${formatPrice(service.price)} · ${formatDuration(service.durationMin)}`,
  );
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

async function upcomingBookingsText(): Promise<string> {
  const db = await getDb();
  const rows = (await db.execute({
    sql: `SELECT b.*, m.name AS master_name
          FROM bookings b
          LEFT JOIN masters m ON m.id = b.master_id
          WHERE b.status = 'new' AND b.starts_at >= ?
          ORDER BY b.starts_at ASC
          LIMIT 10`,
    args: [new Date().toISOString()],
  })).rows.map((row) => rowObject(row));

  if (rows.length === 0) return "Ближайших заявок пока нет 🎉";

  const lines = rows.map((row) => {
    const servicesSummary = parseServicesText(str(row.services_json));
    return (
      `🕐 ${escapeHtml(formatDateTimeRange(str(row.starts_at), str(row.ends_at)))}\n` +
      `👤 ${escapeHtml(str(row.name))} · ${escapeHtml(str(row.phone))}\n` +
      `💈 ${escapeHtml(servicesSummary)} — ${formatPrice(num(row.total_price))}\n` +
      `№ ${escapeHtml(str(row.public_id))}`
    );
  });

  return `Ближайшие заявки:\n\n${lines.join("\n\n")}`;
}

export function createBot(token: string, agent?: unknown): Bot {
  const bot = new Bot(
    token,
    agent ? { client: { baseFetchConfig: { agent } as Parameters<typeof fetch>[1] } } : {},
  );

  const mainMenu = new InlineKeyboard()
    .text("📝 Записаться", "book")
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
        `🕙 ${escapeHtml(site.hours.days)}, ${escapeHtml(site.hours.open)}–${escapeHtml(site.hours.close)}` +
        adminLine,
      { parse_mode: "HTML", reply_markup: mainMenu },
    );
  });

  bot.command("help", async (ctx) => {
    const adminLine = isAdmin(ctx.chat.id) ? "/bookings — ближайшие заявки\n" : "";
    await ctx.reply(
      `Команды:\n/start — главное меню\n/services — услуги и цены\n${adminLine}`,
      { reply_markup: mainMenu },
    );
  });

  bot.command("services", async (ctx) => {
    await ctx.reply(servicesText(), { parse_mode: "HTML", reply_markup: mainMenu });
  });

  bot.command("bookings", async (ctx) => {
    if (!isAdmin(ctx.chat.id)) {
      await ctx.reply("Эта команда доступна только администратору.");
      return;
    }
    await ctx.reply(await upcomingBookingsText(), { parse_mode: "HTML" });
  });

  // Записаться → просим номер
  bot.callbackQuery("book", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("Для записи нужен ваш номер телефона. Нажмите кнопку ниже 👇", {
      reply_markup: new Keyboard()
        .requestContact("📞 Поделиться номером")
        .oneTime(true)
        .resized(true),
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

  // Получили контакт → показываем мультивыбор услуг
  bot.on("message:contact", async (ctx) => {
    const contact = ctx.message.contact;
    const phone = phoneDigits(contact.phone_number);
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
      ctx.from?.first_name ||
      "Гость";

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
    for (const master of getActiveMasters()) {
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
        `Ждём вас! Отменить запись можно на сайте или по телефону ${escapeHtml(site.phoneDisplay)}.`,
      { parse_mode: "HTML" },
    );

    notifyNewBooking(booking).catch(() => {
      // уведомление не критично — заявка уже сохранена
    });
  });

  bot.callbackQuery("ignore", async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  return bot;
}
