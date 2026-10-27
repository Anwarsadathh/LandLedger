"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { translate, type TFunction } from "@/lib/i18n/translate";

type I18nContext = { locale: Locale; t: TFunction; setLocale: (l: Locale) => void };

const Ctx = createContext<I18nContext | null>(null);

export function LanguageProvider({ locale: initial, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initial);

  const setLocale = useCallback(
    (next: Locale) => {
      try {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        localStorage.setItem(LOCALE_COOKIE, next);
      } catch {
        /* cookies/storage blocked — session-only switch */
      }
      setLocaleState(next);
      // Re-render server components (they read the cookie) in the new language.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nContext>(
    () => ({ locale, setLocale, t: (key: string) => translate(locale, key) }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nContext {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  // Safe default if used outside the provider.
  return { locale: DEFAULT_LOCALE, setLocale: () => {}, t: (key: string) => translate(DEFAULT_LOCALE, key) };
}

export function useT(): TFunction {
  return useI18n().t;
}
