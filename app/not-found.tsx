import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/data/site";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[62vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-[5rem] leading-none text-brass/80 sm:text-[7rem]">404</p>
      <h1 className="h-section mt-4 text-ink">Страница не найдена</h1>
      <p className="lead mt-3 max-w-md">
        Возможно, ссылка устарела или в адресе опечатка. Записаться и посмотреть цены можно на
        главной.
      </p>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <Link href="/" className="btn btn-primary">
          <Icon name="arrow-left" size={16} /> На главную
        </Link>
        <Link href="/#services" className="btn btn-secondary">
          Услуги и цены
        </Link>
        <a href={site.phoneHref} className="btn btn-ghost">
          <Icon name="phone" size={16} /> {site.phoneDisplay}
        </a>
      </div>
    </div>
  );
}
