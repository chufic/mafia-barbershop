import { site } from "@/data/site";
import { services } from "@/data/services";
import { getActiveMasters } from "@/data/masters";
import { getSocialOverview } from "@/lib/social/store";
import { AppBanners } from "@/components/sections/AppBanners";
import { BookingSection } from "@/components/sections/BookingSection";
import { ContactsSection } from "@/components/sections/ContactsSection";
import { Hero } from "@/components/sections/Hero";
import { MastersSection } from "@/components/sections/MastersSection";
import { PromosSection } from "@/components/sections/PromosSection";
import { ReviewsSection } from "@/components/sections/ReviewsSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { Marquee } from "@/components/ui/Marquee";

/** Рейтинги и отзывы обновляются синхронизацией — страница пересобирается раз в минуту. */
export const revalidate = 60;

export default function HomePage() {
  const social = getSocialOverview();
  const twogis = social.stats["2gis"];

  const sameAs = [site.links.vk, site.links.twogis, site.links.yandexMaps].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    "@id": `${site.url}/#barbershop`,
    name: site.nameFull,
    description:
      "Барбершоп «Мафия» в Тюмени: мужские и детские стрижки, оформление бороды. Ежедневно с 10:00 до 21:00.",
    url: site.url,
    logo: `${site.url}/icon.svg`,
    image: `${site.url}/opengraph-image`,
    telephone: site.phoneRaw,
    priceRange: "200–1800 ₽",
    currenciesAccepted: "RUB",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address,
      addressLocality: site.city,
      addressCountry: "RU",
    },
    geo: site.coordinates
      ? {
          "@type": "GeoCoordinates",
          latitude: site.coordinates.lat,
          longitude: site.coordinates.lng,
        }
      : undefined,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: site.hours.open,
        closes: site.hours.close,
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: twogis?.rating ?? site.rating.value,
      reviewCount: twogis?.reviewsCount ?? site.rating.count,
      bestRating: 5,
      worstRating: 1,
    },
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Услуги барбершопа «Мафия»",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        name: service.name,
        price: service.price,
        priceCurrency: "RUB",
        itemOffered: {
          "@type": "Service",
          name: service.name,
          description: service.short,
        },
      })),
    },
    employee: getActiveMasters().map((master) => ({
      "@type": "Person",
      name: master.name,
      jobTitle: master.role,
    })),
    acceptsReservations: `${site.url}/#booking`,
  };

  return (
    <>
      <Hero />
      <Marquee />
      <ServicesSection />
      <AppBanners />
      <BookingSection />
      <MastersSection />
      <ReviewsSection overview={social} />
      <PromosSection posts={social.posts} />
      <ContactsSection />
      <Marquee />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
