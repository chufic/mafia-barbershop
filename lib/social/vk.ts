/**
 * ВКонтакте.
 *
 * Два режима:
 *  1. Если задан VK_TOKEN — официальный API (groups.getById + wall.get).
 *  2. Без токена — публичная страница группы и виджет сообщества: VK отдаёт
 *     их без авторизации, но разметка может измениться.
 *
 * Посты нужны для блока «Новости и акции»: группа у барбершопа публичная,
 * поэтому это её собственный контент.
 */

import { socialConfig } from "../../data/social";
import { asNumber, decodeEntities, fetchJson, fetchText, htmlToText, toIso } from "./http";
import type { SocialPost, SyncResult } from "./types";

type VkGroupsResponse = {
  response?: { groups?: Array<{ id?: number; members_count?: number; name?: string }> };
};

type VkWallResponse = {
  response?: {
    items?: Array<{
      id?: number;
      owner_id?: number;
      date?: number;
      text?: string;
      is_pinned?: number;
      attachments?: Array<{
        type?: string;
        photo?: { sizes?: Array<{ url?: string; width?: number; height?: number; type?: string }> };
      }>;
    }>;
  };
  error?: { error_msg?: string; error_code?: number };
};

const MONTHS: Record<string, number> = {
  января: 0,
  февраля: 1,
  марта: 2,
  апреля: 3,
  мая: 4,
  июня: 5,
  июля: 6,
  августа: 7,
  сентября: 8,
  октября: 9,
  ноября: 10,
  декабря: 11,
};

export async function syncVk(): Promise<SyncResult> {
  const { token } = socialConfig.vk;
  const result = token ? await syncWithToken(token) : await syncWithWidget();
  return result;
}

async function syncWithToken(token: string): Promise<SyncResult> {
  const { groupId } = socialConfig.vk;
  const base = "https://api.vk.com/method";
  const common = `access_token=${encodeURIComponent(token)}&v=5.199`;

  const [groups, wall] = await Promise.all([
    fetchJson<VkGroupsResponse>(`${base}/groups.getById?group_id=${groupId}&fields=members_count&${common}`),
    fetchJson<VkWallResponse>(
      `${base}/wall.get?owner_id=-${groupId}&count=${socialConfig.limits.posts}&filter=owner&${common}`,
    ),
  ]);

  if (groups.response === undefined && "error" in groups) {
    const message = (groups as { error?: { error_msg?: string } }).error?.error_msg;
    if (message) throw new Error(`VK API: ${message}`);
  }

  if (wall.error) {
    throw new Error(`VK API: ${wall.error.error_msg ?? "неизвестная ошибка"}`);
  }

  const posts = (wall.response?.items ?? [])
    .map((item) => mapTokenPost(item, groupId))
    .filter((post): post is SocialPost => post !== null);

  return {
    source: "vk",
    status: "ok",
    stats: { followers: asNumber(groups.response?.groups?.[0]?.members_count) },
    posts,
  };
}

function mapTokenPost(
  item: NonNullable<NonNullable<VkWallResponse["response"]>["items"]>[number],
  groupId: string,
): SocialPost | null {
  const text = cleanPostText(item.text);
  const id = item.id;
  if (!text || !id) return null;

  const photo = (item.attachments ?? []).find((attachment) => attachment.type === "photo")?.photo;
  const bestSize = [...(photo?.sizes ?? [])].sort(
    (left, right) => (right.width ?? 0) - (left.width ?? 0),
  )[0];

  return {
    id: `vk:${groupId}_${id}`,
    source: "vk",
    externalId: `${groupId}_${id}`,
    text,
    publishedAt: toIso(item.date),
    url: `https://vk.com/wall-${groupId}_${id}`,
    imageUrl: bestSize?.url ?? null,
    pinned: Boolean(item.is_pinned),
  };
}

async function syncWithWidget(): Promise<SyncResult> {
  const { group, groupId } = socialConfig.vk;
  const [page, widget] = await Promise.all([
    fetchText(`https://vk.com/${group}`),
    fetchText(
      `https://vk.com/widget_community.php?app=0&width=400&_ver=1&gid=${groupId}&mode=4&height=1200`,
    ),
  ]);

  if (/please log in|войдите/i.test(page) && !page.includes('"members_count"')) {
    throw new Error("VK не отдал страницу группы без авторизации");
  }

  const membersMatch = page.match(/"members_count":(\d+)/);
  const posts = parseWidgetPosts(widget).slice(0, socialConfig.limits.posts);

  if (posts.length === 0 && !membersMatch) {
    throw new Error("не удалось разобрать ни посты, ни число подписчиков");
  }

  return {
    source: "vk",
    status: "ok",
    stats: { followers: asNumber(membersMatch?.[1]) },
    posts,
  };
}

function parseWidgetPosts(html: string): SocialPost[] {
  const blocks = html.split('<div class="wcommunity_post">').slice(1);
  const posts: SocialPost[] = [];

  for (const block of blocks) {
    const linkMatch = block.match(/href="\/wall-(\d+)_(\d+)"/);
    if (!linkMatch) continue;

    const ownerId = linkMatch[1];
    const postId = linkMatch[2];

    const textBlock = block.match(/<div class="wall_post_text"[^>]*>([\s\S]*?)<\/div>/);
    const text = htmlToText(decodeEntities(textBlock?.[1] ?? ""));
    if (!text) continue;

    const rawDate = block.match(/class="wcommunity_post_date"[^>]*>([^<]+)</)?.[1] ?? "";
    const image =
      block.match(/background-image:\s*url\(['"]?([^'")]+)/)?.[1] ??
      block.match(/<img[^>]+src="(https:\/\/[^"]*userapi[^"]+)"/)?.[1] ??
      null;

    posts.push({
      id: `vk:${ownerId}_${postId}`,
      source: "vk",
      externalId: `${ownerId}_${postId}`,
      text: cleanPostText(text),
      publishedAt: parseWidgetDate(rawDate),
      url: `https://vk.com/wall-${ownerId}_${postId}`,
      imageUrl: image ? decodeEntities(image) : null,
      // Виджет VK ставит подпись «запись закреплена» в каждую карточку,
      // поэтому без официального API считаем пост не закреплённым.
      pinned: false,
    });
  }

  // В виджете даты могут быть относительными — сортируем по убыванию.
  return posts.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

/** Текст поста: сохраняем абзацы, убираем markdown-звёздочки VK. */
function cleanPostText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1500)
    .replace(/\*\*(.+?)\*\*/g, "$1");
}

/** «11 октября 2026 в 11:40» (московское время) → UTC ISO. */function parseWidgetDate(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return new Date().toISOString();

  if (normalized.startsWith("сегодня")) return new Date().toISOString();
  if (normalized.startsWith("вчера")) {
    return new Date(Date.now() - 86_400_000).toISOString();
  }

  const match = normalized.match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})\s+в\s+(\d{1,2}):(\d{2})/);
  if (!match) return new Date().toISOString();

  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  const year = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);

  if (month === undefined) return new Date().toISOString();

  const timestamp = Date.UTC(year, month, day, hours - 3, minutes);
  return new Date(timestamp).toISOString();
}
