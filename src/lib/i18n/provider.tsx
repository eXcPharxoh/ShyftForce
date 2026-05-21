"use client";

import { createContext, useContext, type ReactNode } from "react";
import { t as tBare, type Locale } from "./dictionaries";

/**
 * Lightweight i18n context. Mounted at the app root; the server resolves
 * the user's locale (member.locale → org.defaultLocale → "en") and passes
 * it down. Client components use `useT()` to translate.
 *
 * Why not next-intl? We have ~250 strings. A flat dictionary + 100 lines of
 * code beats a 30KB library + middleware + routing for that scale. Swap to
 * next-intl when we cross ~1000 strings or need pluralization rules.
 */

type LocaleContextValue = {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  t: (key, vars) => tBare("en", key, vars),
});

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <LocaleContext.Provider value={{ locale, t: (key, vars) => tBare(locale, key, vars) }}>
      {children}
    </LocaleContext.Provider>
  );
}

/** Translate a key in the current locale. Supports {placeholder} interpolation. */
export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  return useContext(LocaleContext).t;
}

/** Get the current locale (for date/number formatting). */
export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
