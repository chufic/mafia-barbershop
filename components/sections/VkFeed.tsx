import { Icon } from "@/components/ui/Icon";
import { formatDateLong } from "@/lib/time";
import type { SocialPost } from "@/lib/social/types";

/**
 * Последние посты публичной группы ВКонтакте — компактными карточками.
 * Показываем только текст и дату: это собственный контент барбершопа,
 * который обновляется на сайте автоматически.
 */
export function VkFeed({ posts }: { posts: SocialPost[] }) {
  if (posts.length === 0) return null;

  const visible = posts.slice(0, 3);

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((post) => (
        <article key={post.id} className="card flex gap-3 p-3">
          {post.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- внешний CDN VK, оптимизация не нужна
            <img
              // Часть картинок VK отдаёт только с Referer: vk.com, поэтому идём через свой прокси.
              src={`/api/vk-image?u=${encodeURIComponent(post.imageUrl)}`}
              alt=""
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="flex min-w-0 flex-col">
            <p className="text-[0.66rem] text-muted">
              {formatDateLong(post.publishedAt.slice(0, 10))}
              {post.pinned ? " · закреплено" : ""}
            </p>
            <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-muted">
              {post.text}
            </p>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex items-center gap-1 pt-1.5 text-[0.7rem] text-brass hover:underline"
            >
              Читать
              <Icon name="external" size={11} />
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
