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
        className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900"
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
              className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${
                isSelected
                  ? "bg-white shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
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
