import { DEFAULT_LOCALE, type Locale } from "./config";
import { MESSAGES } from "./messages";

export type TFunction = (key: string) => string;

// Resolve a key for a locale, falling back to English, then to the key itself.
// The English fallback is intentional: it yields the "English + local language"
// mix for strings not yet translated.
export function translate(locale: Locale, key: string): string {
  return MESSAGES[locale]?.[key] ?? MESSAGES[DEFAULT_LOCALE]?.[key] ?? key;
}

export function makeT(locale: Locale): TFunction {
  return (key: string) => translate(locale, key);
}
