import { site } from "@/data/site";
import { ReviewFormButton } from "@/components/reviews/ReviewButtons";
import {
  ReviewsPanel,
  type ReviewCard,
  type ReviewsSummary,
} from "@/components/reviews/ReviewsPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { SocialOverview } from "@/lib/social/types";

export function ReviewsSection({ overview }: { overview: SocialOverview }) {
  const reviews: ReviewCard[] = overview.reviews.map((review) => ({
    id: review.id,
    author: review.author,
    rating: review.rating,
    text: review.text,
    date: review.publishedAt.slice(0, 10),
    source: review.source,
    url: review.url,
    answer: review.answer,
  }));

  const twogis = overview.stats["2gis"];
  const yandex = overview.stats.yandex;
  const vk = overview.stats.vk;

  const summary: ReviewsSummary = {
    primaryRating: twogis?.rating ?? yandex?.rating ?? site.rating.value,
    primaryCount: twogis?.reviewsCount ?? yandex?.reviewsCount ?? site.rating.count,
    primarySource: twogis?.rating ? "2ГИС" : yandex?.rating ? "Яндекс Картах" : site.rating.source,
    twogis: { rating: twogis?.rating ?? null, count: twogis?.reviewsCount ?? null },
    yandex: { rating: yandex?.rating ?? null, count: yandex?.reviewsCount ?? null },
    vkFollowers: vk?.followers ?? null,
    updatedAt: overview.updatedAt,
    hasErrors: Object.values(overview.sources).some((source) => source?.status === "error"),
  };

  return (
    <section id="reviews" className="section scroll-mt-24">
      <div className="container-x">
        <SectionHeading
          kicker="Отзывы"
          index="04"
          title={
            <>
              Нас оценивают <span className="text-brass">на 2ГИС</span>
            </>
          }
          description="Что пишут гости, которые уже стриглись у нас. Все отзывы настоящие."
          action={<ReviewFormButton />}
        />

        <ReviewsPanel reviews={reviews} summary={summary} />
      </div>
    </section>
  );
}
