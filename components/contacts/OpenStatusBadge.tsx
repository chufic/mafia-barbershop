"use client";

import { useOpenStatus } from "@/lib/use-open-status";

export function OpenStatusBadge({ variant = "card" }: { variant?: "card" | "inline" }) {
  const status = useOpenStatus();

  if (!status) {
    return (
      <div
        className={variant === "inline" ? "h-[22px] w-[190px]" : "h-[58px] w-full"}
        aria-hidden="true"
      />
    );
  }

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-2 text-sm">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            status.isOpen ? "bg-success" : "bg-muted"
          }`}
          aria-hidden="true"
        />
        <span className={status.isOpen ? "text-success-soft" : "text-muted"}>
          {status.label} · {status.detail}
        </span>
      </span>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="relative mt-1.5 flex h-3 w-3 shrink-0" aria-hidden="true">
        {status.isOpen && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
        )}
        <span
          className={`relative inline-flex h-3 w-3 rounded-full ${
            status.isOpen ? "bg-success" : "bg-[#77767d]"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">
          {status.label} <span className="font-normal text-muted">· {status.detail}</span>
        </span>
        <span className="mt-0.5 block text-xs text-muted">
          {status.timeLabel} · {status.dateLabel}
        </span>
      </span>
    </div>
  );
}
