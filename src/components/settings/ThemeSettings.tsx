"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n";

const emptySubscribe = () => () => {};

type ThemeValue = "light" | "dark" | "system";

const THEME_OPTIONS: { value: ThemeValue; labelKey: string }[] = [
  { value: "light", labelKey: "theme.light" },
  { value: "dark", labelKey: "theme.dark" },
  { value: "system", labelKey: "theme.system" },
];

/**
 * Replaces the previous two-toggle layout (one Switch for "Dark", one
 * for "Follow system") with a single segmented control. The earlier
 * design let users enable BOTH switches simultaneously, which mapped
 * to a single-valued next-themes state and produced confusing UI
 * ("I turned on Dark, why is System also lit up?"). next-themes
 * accepts a single string value — Light, Dark, or System — so the
 * UI is now radio-group-shaped, matching the underlying state.
 */
export function ThemeSettings() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{t("theme.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("theme.desc")}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label={t("theme.title")}
        className="rounded-lg border p-1 shadow-sm grid grid-cols-3 gap-1"
      >
        {THEME_OPTIONS.map((opt) => {
          const isSelected = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-1 items-center justify-center rounded-md py-2.5 px-3 text-sm font-medium transition-all active:scale-[0.98] ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
