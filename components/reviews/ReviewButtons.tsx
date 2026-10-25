"use client";

import { useModal } from "@/components/providers/ModalProvider";
import { Icon } from "@/components/ui/Icon";

export function ReviewFormButton() {
  const { open } = useModal();

  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={() => open({ kind: "review-form" })}
    >
      Оставить отзыв
    </button>
  );
}

export function AllReviewsButton({ className = "btn btn-secondary btn-sm" }: { className?: string }) {
  const { open } = useModal();

  return (
    <button type="button" className={className} onClick={() => open({ kind: "reviews" })}>
      Все отзывы
      <Icon name="arrow" size={15} />
    </button>
  );
}
