"use client";

import { useLocale, useSetLocale, LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export function LanguageSettings() {
  const currentLocale = useLocale();
  const setLocale = useSetLocale();
  const t = useT();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Languages className="h-5 w-5" />
          {t("settings.language")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("settings.languageDesc")}
        </p>
      </div>

      <div role="radiogroup" aria-label={t("settings.language")} className="rounded-lg border p-1 shadow-sm grid grid-cols-2 gap-1">
        {SUPPORTED_LOCALES.map((loc: Locale) => {
          const isActive = currentLocale === loc;
          return (
            <button
              key={loc}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setLocale(loc)}
              className={cn(
                "flex items-center justify-center rounded-md px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                isActive
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {LOCALE_LABELS[loc]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
