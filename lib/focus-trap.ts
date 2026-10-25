export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.offsetWidth > 0 ||
      element.offsetHeight > 0 ||
      element === document.activeElement,
  );
}

/** Оставляет Tab внутри контейнера — базовая доступность модалок и меню. */
export function handleTabKey(event: KeyboardEvent, container: HTMLElement | null): void {
  const focusable = getFocusable(container);
  if (focusable.length === 0) {
    event.preventDefault();
    container?.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;
  const inside = container?.contains(active) ?? false;

  if (event.shiftKey && (active === first || !inside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !inside)) {
    event.preventDefault();
    first.focus();
  }
}

export function isEscape(event: KeyboardEvent): boolean {
  return event.key === "Escape" || event.key === "Esc";
}
