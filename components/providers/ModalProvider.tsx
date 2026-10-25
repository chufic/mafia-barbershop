"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AppSoonModal } from "@/components/modals/AppSoonModal";
import { BookingModal } from "@/components/modals/BookingModal";
import { ReviewFormModal } from "@/components/modals/ReviewFormModal";
import { ReviewsModal } from "@/components/modals/ReviewsModal";
import { ServicesModal } from "@/components/modals/ServicesModal";
import { SoonModal } from "@/components/modals/SoonModal";

export type ModalPayload =
  | { kind: "services" }
  | { kind: "reviews" }
  | {
      kind: "booking";
      masterId?: string;
      serviceIds?: string[];
      screen?: "choice" | "wizard";
    }
  | { kind: "review-form" }
  | { kind: "app"; store: "apple" | "google" }
  | { kind: "soon"; title: string; message: string };

type ModalContextValue = {
  payload: ModalPayload | null;
  open: (payload: ModalPayload) => void;
  close: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<ModalPayload | null>(null);

  const open = useCallback((next: ModalPayload) => setPayload(next), []);
  const close = useCallback(() => setPayload(null), []);

  const value = useMemo<ModalContextValue>(
    () => ({ payload, open, close }),
    [payload, open, close],
  );

  return (
    <ModalContext.Provider value={value}>
      {children}

      {payload?.kind === "services" && <ServicesModal onClose={close} />}
      {payload?.kind === "reviews" && <ReviewsModal onClose={close} />}
      {payload?.kind === "review-form" && <ReviewFormModal onClose={close} />}
      {payload?.kind === "app" && (
        <AppSoonModal
          store={payload.store}
          onClose={close}
          onBooking={() => open({ kind: "booking" })}
        />
      )}
      {payload?.kind === "soon" && (
        <SoonModal
          title={payload.title}
          message={payload.message}
          onClose={close}
          onBooking={() => open({ kind: "booking" })}
        />
      )}
      {payload?.kind === "booking" && (
        <BookingModal
          onClose={close}
          initialMasterId={payload.masterId}
          initialServiceIds={payload.serviceIds}
          initialScreen={payload.screen}
        />
      )}
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal должен использоваться внутри ModalProvider");
  return context;
}
