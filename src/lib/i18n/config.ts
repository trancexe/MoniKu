/**
 * MoniKu i18n — Lightweight custom internationalization
 *
 * Design choice: tidak pakai next-intl/react-i18next karena:
 * 1. Static export (`output: "export"`) — server-side locale routing tidak relevan
 * 2. MVP butuh 2 bahasa saja — ICU MessageFormat overkill
 * 3. Bundle size matters untuk PWA — tambahan ~30KB untuk library besar tidak worth it
 * 4. Full control atas integration (dayjs locale, number format, html lang attr)
 *
 * API:
 * - useT() → (key, params?) => string
 * - <T id="key" /> component untuk inline JSX
 * - useLocale() → "id" | "en"
 * - useSetLocale() → (locale) => void
 * - useFormatLocale() → helpers untuk Intl.NumberFormat / Intl.DateTimeFormat
 */

export type Locale = "id" | "en";

export const DEFAULT_LOCALE: Locale = "id";
export const SUPPORTED_LOCALES: readonly Locale[] = ["id", "en"] as const;

export const LOCALE_LABELS: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

/** Intl BCP-47 tags. id-ID = Indonesian (Indonesia), en-US = English (US). */
export const INTL_LOCALE: Record<Locale, string> = {
  id: "id-ID",
  en: "en-US",
};

/** dayjs locale code */
export const DAYJS_LOCALE: Record<Locale, string> = {
  id: "id",
  en: "en",
};

export const LOCALE_STORAGE_KEY = "moniku-locale";

export type TranslationParams = Record<string, string | number>;

/**
 * Look up a translation by dotted key path. Supports {param} interpolation.
 * Returns the key itself if not found (helpful for dev — untranslated keys
 * stand out in UI).
 *
 * Example:
 *   lookup(idMessages, "dashboard.totalBalance") => "Total Saldo"
 *   lookup(idMessages, "greeting", { name: "Ingga" }) => "Halo, Ingga"
 */
export function lookup(
  messages: Record<string, unknown>,
  key: string,
  params?: TranslationParams
): string {
  const segments = key.split(".");
  let value: unknown = messages;
  for (const seg of segments) {
    if (value && typeof value === "object" && seg in (value as object)) {
      value = (value as Record<string, unknown>)[seg];
    } else {
      // Missing translation — return key so it's visible in dev
      return key;
    }
  }
  if (typeof value !== "string") return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, name) => {
    const v = params[name];
    return v === undefined ? `{${name}}` : String(v);
  });
}

/** Type guard for Locale */
export function isLocale(value: unknown): value is Locale {
  return value === "id" || value === "en";
}

/** Resolve a stored locale string to a valid Locale (fallback to default) */
export function resolveLocale(stored: string | null | undefined): Locale {
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}
