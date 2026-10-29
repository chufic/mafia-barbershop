"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "@/data/site";
import { Icon } from "@/components/ui/Icon";
import { MaxLogo } from "@/components/ui/MaxLogo";
import { LogoLink } from "@/components/ui/Logo";
import { useModal } from "@/components/providers/ModalProvider";
import { handleTabKey, isEscape } from "@/lib/focus-trap";
import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";
import { bookingMessage, telegramLink, whatsappLink } from "@/lib/links";

const links = [
  { label: "Услуги", modal: "services" as const },
  { label: "Мастера", href: "/#masters" },
  { label: "Акции", href: "/#promo" },
  { label: "Отзывы", modal: "reviews" as const },
  { label: "Контакты", href: "/#contacts" },
  { label: "Мои заявки", href: "/my" },
];

export function Header() {
  const { open } = useModal();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(menuOpen);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEscape(event)) {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key === "Tab") handleTabKey(event, menuRef.current);
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      previous?.focus?.();
    };
  }, [menuOpen]);

  function openModal(kind: "services" | "reviews") {
    setMenuOpen(false);
    open({ kind });
  }

  function openBooking() {
    setMenuOpen(false);
    open({ kind: "booking" });
  }

  const message = bookingMessage();

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors ${
          scrolled ? "border-line bg-base/90" : "border-transparent bg-base/70"
        }`}
      >
        <div className="container-x flex h-[68px] items-center justify-between gap-3">
          <LogoLink />

          <nav aria-label="Основная навигация" className="hidden items-center gap-0.5 lg:flex">
            {links.map((link) =>
              "modal" in link && link.modal ? (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => openModal(link.modal)}
                  className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={site.phoneHref}
              className="hidden min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink transition-colors hover:text-brass xl:flex"
            >
              <Icon name="phone" size={17} className="text-brass" />
              {site.phoneDisplay}
            </a>

            <button
              type="button"
              onClick={openBooking}
              className="btn btn-primary btn-sm hidden sm:inline-flex"
            >
              Записаться
            </button>

            <a
              href={site.phoneHref}
              className="icon-btn sm:hidden"
              aria-label={`Позвонить: ${site.phoneDisplay}`}
            >
              <Icon name="phone" size={18} />
            </a>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="icon-btn lg:hidden"
              aria-label="Открыть меню"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={menuRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Меню сайта"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col border-l border-line bg-base shadow-modal"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <LogoLink />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="icon-btn"
                aria-label="Закрыть меню"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <nav aria-label="Мобильная навигация" className="flex flex-col">
                {links.map((link) =>
                  "modal" in link && link.modal ? (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => openModal(link.modal)}
                      className="flex min-h-[52px] items-center justify-between border-b border-line/70 text-left font-display text-xl uppercase tracking-wide text-ink"
                    >
                      {link.label}
                      <Icon name="arrow" size={18} className="text-muted" />
                    </button>
                  ) : (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-[52px] items-center justify-between border-b border-line/70 font-display text-xl uppercase tracking-wide text-ink"
                    >
                      {link.label}
                      <Icon name="arrow" size={18} className="text-muted" />
                    </a>
                  ),
                )}
              </nav>

              <div className="mt-6 space-y-3">
                <a
                  href={site.phoneHref}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass/15 text-brass">
                    <Icon name="phone" size={18} />
                  </span>
                  <span>
                    <span className="block text-xs text-muted">Позвонить</span>
                    <span className="block font-display text-lg text-ink">{site.phoneDisplay}</span>
                  </span>
                </a>

                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={whatsappLink(message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm text-ink"
                  >
                    <Icon name="whatsapp" size={17} className="text-brass" /> WA
                  </a>
                  <a
                    href={telegramLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm text-ink"
                  >
                    <Icon name="telegram" size={17} className="text-brass" /> TG
                  </a>
                  <a
                    href={site.links.max || site.phoneHref}
                    target={site.links.max ? "_blank" : undefined}
                    rel={site.links.max ? "noopener noreferrer" : undefined}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm text-ink"
                  >
                    <MaxLogo size={17} className="text-brass" /> MAX
                  </a>
                </div>

                <button type="button" onClick={openBooking} className="btn btn-primary w-full">
                  Записаться онлайн
                </button>

                <p className="text-xs leading-relaxed text-muted">
                  {site.addressFull}
                  <br />
                  {site.hours.days} с {site.hours.open} до {site.hours.close}
                </p>
              </div>
            </div>

            <div className="border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <p className="text-center text-xs text-muted">
                {site.phoneDisplay}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
