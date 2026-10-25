import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

export function SectionHeading({
  kicker,
  title,
  description,
  align = "left",
  action,
  index,
}: {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  action?: ReactNode;
  /** Фоновый номер секции, например «01» — редакционный акцент. */
  index?: string;
}) {
  return (
    <Reveal>
      <div
        className={`flex flex-col gap-5 ${
          align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"
        }`}
      >
        <div className={align === "center" ? "max-w-2xl" : "relative max-w-2xl"}>
          {index && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-1 -top-8 select-none font-display text-[5rem] leading-none text-brass/[0.09] sm:-left-3 sm:-top-10 sm:text-[7rem]"
            >
              {index}
            </span>
          )}
          {kicker && <p className="kicker mb-3">{kicker}</p>}
          <h2 className="h-section relative text-ink">{title}</h2>
          {description && <p className="lead mt-4">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </Reveal>
  );
}
