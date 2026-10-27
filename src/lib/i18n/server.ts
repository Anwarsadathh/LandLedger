import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { makeT, type TFunction } from "./translate";

// Server-side locale access (route handlers + server components). Reads the
// cookie the switcher sets; defaults to English.
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getT(): Promise<TFunction> {
  return makeT(await getLocale());
}
