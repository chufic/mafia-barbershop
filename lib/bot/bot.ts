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
 */

import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { getActiveMasters, getMasterById } from "../../data/masters";
import { getServiceById, services } from "../../data/services";
import { site } from "../../data/site";
import { createBooking, listBusyForDate } from "../bookings";
import { getDb, num, str } from "../db";
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

function servicesText(): string {
  const lines = services.map(
    (service) =>
      `<b>${escapeHtml(service.name)}</b> — ${formatPrice(service.price)} · ${formatDuration(service.durationMin)}`,
  );
  return `Услуги и цены:\n\n${lines.join("\n")}\n\nЗаписаться — нажмите кнопку внизу.`;
}

function servicesKeyboard(phone: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const service of services) {
    kb.text(`${service.name} · ${formatPrice(service.price)}`, `svc:${service.id}:${phone}`).row();
  }
  return kb;
}

function freeSlots(masterId: string, serviceId: string, date: string) {
  const master = getMasterById(masterId);
  const service = getServiceById(serviceId);
  if (!master || !service) return [];
  const busy = listBusyForDate(date);
  const availability = computeMasterAvailability({
    date,
    durationMin: service.durationMin,
    master,
    busy,
    now: new Date(),
  });
  return availability.slots;
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

function upcomingBookingsText(): string {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT b.*, m.name AS master_name
       FROM bookings b
       LEFT JOIN masters m ON m.id = b.master_id
       WHERE b.status = 'new' AND b.starts_at >= ?
       ORDER BY b.starts_at ASC
       LIMIT 10`,
    )
    .all(new Date().toISOString());

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

export function createBot(token: string): Bot {
  const bot = new Bot(token);

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
    await ctx.reply(upcomingBookingsText(), { parse_mode: "HTML" });
  });

  // Записаться → просим номер (кнопка «Поделиться номером»)
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

  // Получили контакт → показываем услуги
  bot.on("message:contact", async (ctx) => {
    const contact = ctx.message.contact;
    const phone = phoneDigits(contact.phone_number);
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
      ctx.from?.first_name ||
      "Гость";

    await ctx.reply(
      `Спасибо, <b>${escapeHtml(name)}</b>! Выберите услугу:`,
      { parse_mode: "HTML", reply_markup: servicesKeyboard(phone) },
    );
  });

  // Услуга → мастера
  bot.callbackQuery(/^svc:(.+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const serviceId = ctx.match[1];
    const phone = ctx.match[2];
    const service = getServiceById(serviceId);
    if (!service) return;

    const kb = new InlineKeyboard();
    for (const master of getActiveMasters()) {
      kb.text(master.name, `m:${master.id}:${serviceId}:${phone}`).row();
    }
    kb.text(BACK_LABEL, "book");

    await ctx.editMessageText(
      `Вы выбрали <b>${escapeHtml(service.name)}</b> — ${formatPrice(service.price)}, ` +
        `${formatDuration(service.durationMin)}.\n\nВыберите мастера:`,
      { parse_mode: "HTML", reply_markup: kb },
    );
  });

  // Мастер → даты (сегодня/завтра/послезавтра)
  bot.callbackQuery(/^m:(.+):(.+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const masterId = ctx.match[1];
    const serviceId = ctx.match[2];
    const phone = ctx.match[3];
    const master = getMasterById(masterId);
    if (!master) return;

    const today = todayDateStr();
    const kb = new InlineKeyboard();
    for (const offset of [0, 1, 2]) {
      const date = addDays(today, offset);
      kb.text(formatRelativeDate(date, today), `d:${date}:${masterId}:${serviceId}:${phone}`).row();
    }
    kb.text(BACK_LABEL, `svc:${serviceId}:${phone}`);

    await ctx.editMessageText(
      `Мастер: <b>${escapeHtml(master.name)}</b>. Выберите день:`,
      { parse_mode: "HTML", reply_markup: kb },
    );
  });

  // Дата → время
  bot.callbackQuery(/^d:(\d{4}-\d{2}-\d{2}):(.+):(.+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const date = ctx.match[1];
    const masterId = ctx.match[2];
    const serviceId = ctx.match[3];
    const phone = ctx.match[4];

    const slots = freeSlots(masterId, serviceId, date);
    const kb = new InlineKeyboard();
    if (slots.length === 0) {
      kb.text("На этот день свободного времени нет", "ignore").row();
    } else {
      for (const slot of slots.slice(0, 12)) {
        kb.text(slot.time, `t:${slot.time}:${date}:${masterId}:${serviceId}:${phone}`).row();
      }
    }
    kb.text(BACK_LABEL, `m:${masterId}:${serviceId}:${phone}`);

    await ctx.editMessageText(
      `${escapeHtml(formatDateRu(date))}. Свободное время:`,
      { reply_markup: kb },
    );
  });

  // Время → создаём заявку
  bot.callbackQuery(/^t:(\d{2}):(\d{2}):(\d{4}-\d{2}-\d{2}):(.+):(.+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const time = `${ctx.match[1]}:${ctx.match[2]}`;
    const date = ctx.match[3];
    const masterId = ctx.match[4];
    const serviceId = ctx.match[5];
    const phone = ctx.match[6];

    const master = getMasterById(masterId);
    const service = getServiceById(serviceId);
    if (!master || !service) return;

    const name = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ") || "Гость";
    const startsAt = zonedToUtc(date, time).toISOString();

    const result = createBooking({
      name,
      phone: `+${phone}`,
      comment: null,
      masterId,
      serviceIds: [serviceId],
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
    await ctx.editMessageText(
      `✅ <b>Вы записаны!</b>\n\n` +
        `<b>Услуга:</b> ${escapeHtml(service.name)} — ${formatPrice(service.price)}\n` +
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
