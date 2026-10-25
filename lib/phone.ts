/** Телефон: нормализация на сервере, маска и форматирование на клиенте. */

export const PHONE_PLACEHOLDER = "+7 912 000-00-00";

export function phoneDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

/** Приводит любой ввод к виду +7XXXXXXXXXX или возвращает null. */
export function normalizePhone(value: string): string | null {
  let digits = phoneDigits(value);

  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    digits = `7${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith("9")) {
    digits = `7${digits}`;
  } else if (digits.length === 11 && digits.startsWith("9")) {
    return null;
  } else {
    return null;
  }

  if (digits.length !== 11) return null;
  return `+${digits}`;
}

export function isValidPhone(value: string): boolean {
  return normalizePhone(value) !== null;
}

/** «+79123980880» → «+7 912 398-08-80» */
export function formatPhoneDisplay(value: string): string {
  const digits = phoneDigits(value);
  if (!digits) return "";

  const national = digits.startsWith("7") || digits.startsWith("8") ? digits.slice(1) : digits;
  if (national.length !== 10) return value;

  return `+7 ${national.slice(0, 3)} ${national.slice(3, 6)}-${national.slice(6, 8)}-${national.slice(8)}`;
}

/** Прогрессивная маска для поля ввода: не даёт стереть «+7» и лишние цифры. */
export function maskPhoneInput(value: string): string {
  const digits = phoneDigits(value);
  if (!digits) return "";

  const normalized = digits.startsWith("7") || digits.startsWith("8") ? digits.slice(1) : digits;
  const national = normalized.slice(0, 10);

  let result = "+7";
  if (national.length > 0) result += ` ${national.slice(0, 3)}`;
  if (national.length > 3) result += ` ${national.slice(3, 6)}`;
  if (national.length > 6) result += `-${national.slice(6, 8)}`;
  if (national.length > 8) result += `-${national.slice(8, 10)}`;
  return result;
}

/** Для ссылок wa.me / t.me — только цифры. */
export function phoneForLink(value: string): string {
  return normalizePhone(value)?.replace(/\D+/g, "") ?? phoneDigits(value);
}
