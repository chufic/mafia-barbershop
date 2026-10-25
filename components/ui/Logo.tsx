import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex flex-col leading-none">
      <span className="font-display text-[1.55rem] font-bold uppercase tracking-[0.16em] text-ink">
        Мафия
      </span>
      {!compact && (
        <span className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.42em] text-brass">
          Barbershop
        </span>
      )}
    </span>
  );
}

export function LogoLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="inline-flex min-h-[44px] items-center rounded-lg pr-2"
      aria-label="Барбершоп «Мафия» — на главную"
    >
      <Logo compact={compact} />
    </Link>
  );
}
