"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { maskPhoneInput } from "@/lib/phone";
import type { ApiErrorResponse } from "@/lib/api-types";

export function ReviewFormModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    const nextErrors: Record<string, string> = {};
    if (text.trim().length < 5) nextErrors.text = "Напишите пожелание — минимум 5 символов.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("sending");
    setFormError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name, phone, company }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;

      if (!response.ok) {
        setErrors(payload.errors ?? {});
        setFormError(payload.error ?? "Не удалось отправить сообщение.");
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch {
      setFormError("Нет связи с сервером. Попробуйте ещё раз или напишите в мессенджер.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <Modal
        open
        onClose={onClose}
        title="Спасибо!"
        eyebrow="Пожелание отправлено"
        footer={
          <button type="button" className="btn btn-primary w-full" onClick={onClose}>
            Закрыть
          </button>
        }
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success-soft">
            <Icon name="check" size={26} />
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Мы получили сообщение и прочитаем его. Публичные отзывы лучше оставлять на площадках —
            так их увидят другие гости.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Оставить отзыв"
      eyebrow="Обратная связь"
      description="Публикуем отзывы на 2ГИС, Яндекс Картах и в VK. Здесь можно оставить пожелание — оно уйдёт напрямую администратору."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="review-text" className="label">
            Пожелание <span className="text-brass">*</span>
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            maxLength={1000}
            className="field resize-y"
            placeholder="Что понравилось, что можно улучшить"
            aria-invalid={Boolean(errors.text)}
            aria-describedby={errors.text ? "review-text-error" : undefined}
            data-autofocus
          />
          {errors.text && (
            <p id="review-text-error" className="field-error mt-1.5">
              {errors.text}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="review-name" className="label">
              Имя
            </label>
            <input
              id="review-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field"
              maxLength={40}
              autoComplete="name"
              placeholder="Как к вам обращаться"
            />
          </div>
          <div>
            <label htmlFor="review-phone" className="label">
              Телефон
            </label>
            <input
              id="review-phone"
              value={phone}
              onChange={(event) => setPhone(maskPhoneInput(event.target.value))}
              className="field"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 912 000-00-00"
            />
          </div>
        </div>

        {/* honeypot */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="review-company">Компания</label>
          <input
            id="review-company"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </div>

        {formError && (
          <p role="alert" className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm">
            {formError}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={status === "sending"}>
          {status === "sending" ? (
            <>
              <span className="spinner" aria-hidden="true" /> Отправляем…
            </>
          ) : (
            "Отправить пожелание"
          )}
        </button>

        <p className="text-xs leading-relaxed text-muted">
          Нажимая «Отправить», вы соглашаетесь на обработку контактных данных для ответа на
          обращение. Подробнее — в{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="link-muted">
            политике конфиденциальности
          </a>
          .
        </p>
      </form>
    </Modal>
  );
}
