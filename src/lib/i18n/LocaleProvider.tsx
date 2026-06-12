"use client";

import { createContext, useContext, useEffect, useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";
import dayjs from "dayjs";
import "dayjs/locale/id";
import "dayjs/locale/en";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  DAYJS_LOCALE,
  isLocale,
  lookup,
  type Locale,
  type TranslationParams,
} from "./config";
import idMessages from "./locales/id.json";
import enMessages from "./locales/en.json";

const messages: Record<Locale, Record<string, unknown>> = {
  id: idMessages as Record<string, unknown>,
  en: enMessages as Record<string, unknown>,
};

/**
 * Subscribe to locale in localStorage. Using useSyncExternalStore
 * (React 18+) to read from localStorage without triggering the
 * "setState in effect" lint rule, which would be the naive
 * pattern of useState + useEffect hydration.
 */
function getStoredLocaleSnapshot(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function getServerLocaleSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function subscribeToLocale(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  // Listen for cross-tab changes
  const handler = (e: StorageEvent) => {
    if (e.key === LOCALE_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore gives us SSR-safe reading from localStorage
  // without the setState-in-effect anti-pattern. The third arg is
  // the server snapshot (always default), the first arg is the
  // client snapshot, the second is the subscribe function.
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getStoredLocaleSnapshot,
    getServerLocaleSnapshot
  );

  // Persist to localStorage + update <html lang> + set dayjs global locale
  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
    dayjs.locale(DAYJS_LOCALE[locale]);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    // Force a re-render of all consumers by dispatching a storage event
    // (the store itself is the source of truth — the next snapshot
    // read will pick up the new value)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new StorageEvent("storage", { key: LOCALE_STORAGE_KEY, newValue: next }));
    }
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => lookup(messages[locale], key, params),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Hook for accessing translations and locale state. Must be used inside LocaleProvider. */
export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocaleContext must be used inside <LocaleProvider>");
  }
  return ctx;
}

/** Hook for the translation function only. */
export function useT() {
  return useLocaleContext().t;
}

/** Hook for the current locale code ("id" | "en"). */
export function useLocale() {
  return useLocaleContext().locale;
}

/** Hook for setting the active locale. */
export function useSetLocale() {
  return useLocaleContext().setLocale;
}
