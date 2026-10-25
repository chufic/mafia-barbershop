import { promos } from "@/data/promos";
import { socialConfig } from "@/data/social";
import { Icon } from "@/components/ui/Icon";
import { VkFeed } from "@/components/sections/VkFeed";
import { formatDateLong } from "@/lib/time";
import type { SocialPost } from "@/lib/social/types";

/**
 * Новости и акции — небольшой блок ближе к концу страницы.
 * Он не должен спорить с записью и услугами, поэтому оформлен компактно.
 */
export function PromosSection({ posts = [] }: { posts?: SocialPost[] }) {
  if (posts.length === 0 && promos.length === 0) return null;

  return (
    <section id="promo" className="section-tight scroll-mt-24">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker mb-2">ВКонтакте</p>
            <h2 className="font-display text-xl uppercase leading-tight text-ink sm:text-2xl">
              Новости группы
            </h2>
          </div>
          <a
            href={socialConfig.vk.cardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            Все посты
            <Icon name="external" size={15} />
          </a>
        </div>

        {promos.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {promos.map((promo) => (
              <article key={promo.id} className="rounded-xl border border-line bg-surface/40 p-4">
                {promo.badge && (
                  <span className="mb-2 w-fit rounded-full bg-brass/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-brass">
                    {promo.badge}
                  </span>
                )}
                <p className="font-display text-base uppercase leading-tight text-ink">
                  {promo.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                  {promo.description}
                </p>
                {promo.validUntil && (
                  <p className="mt-2 text-[0.7rem] text-brass">
                    До {formatDateLong(promo.validUntil)}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        <VkFeed posts={posts} />
      </div>
    </section>
  );
}
