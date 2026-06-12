"use client";

import { useMemo } from "react";
import { useLocale } from "./LocaleProvider";
import { INTL_LOCALE } from "./config";

/**
 * Locale-aware formatters. Wraps Intl.NumberFormat and Intl.DateTimeFormat
 * so the same call site works for both ID and EN.
 *
 * Usage:
 *   const { formatNumber, formatCurrency, formatDate, formatDateTime, formatRelative } = useFormatLocale();
 *   formatCurrency(1500000)        // "Rp 1.500.000" (id) or "Rp 1,500,000" (en)
 *   formatNumber(0.5)              // "0,5" (id) or "0.5" (en)
 *   formatDate(timestamp)          // "12 Jun 2026" (id) or "Jun 12, 2026" (en)
 *   formatDateTime(timestamp)      // "12 Jun 2026 14.30" (id) or "Jun 12, 2026 2:30 PM" (en)
 *
 * Currency: hard-coded to IDR ("Rp") since MoniKu is a personal finance app
 * for Indonesian users. The currency formatting (1.000.000 vs 1,000,000) still
 * follows the active locale.
 */
export function useFormatLocale() {
  const locale = useLocale();
  const intlLocale = INTL_LOCALE[locale];

  return useMemo(() => {
    const numberFmt = new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 0,
    });
    const decimalFmt = new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 2,
    });
    const currencyFmt = new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });
    const dateFmt = new Intl.DateTimeFormat(intlLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const dateTimeFmt = new Intl.DateTimeFormat(intlLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const timeFmt = new Intl.DateTimeFormat(intlLocale, {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      formatNumber: (n: number) => numberFmt.format(n),
      formatDecimal: (n: number) => decimalFmt.format(n),
      formatCurrency: (n: number) => currencyFmt.format(n),
      formatCurrencyRaw: (n: number) => `Rp ${numberFmt.format(n)}`,
      formatDate: (ts: number | Date) => dateFmt.format(typeof ts === "number" ? ts : ts.getTime()),
      formatDateTime: (ts: number | Date) => dateTimeFmt.format(typeof ts === "number" ? ts : ts.getTime()),
      formatTime: (ts: number | Date) => timeFmt.format(typeof ts === "number" ? ts : ts.getTime()),
      locale,
    };
  }, [intlLocale, locale]);
}
