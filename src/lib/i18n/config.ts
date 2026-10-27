// Lightweight, cookie-based UI localisation (no URL locale routing). The chosen
// locale lives in a cookie so both server and client components can read it.
export const LOCALES = ["en", "hi", "kn", "ml"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "orova_lang";

// Shown in the switcher, each in its own script.
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
