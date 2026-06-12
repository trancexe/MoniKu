"use client";

import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n";

const emptySubscribe = () => () => {};

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

      <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
        <div className="space-y-0.5 flex flex-col">
          <Label className="text-base">{t("theme.darkModeLabel")}</Label>
          <span className="text-[0.8rem] text-muted-foreground">
            {t("theme.darkModeDesc")}
          </span>
        </div>
        <Switch
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
        <div className="space-y-0.5 flex flex-col">
          <Label className="text-base">{t("theme.systemLabel")}</Label>
          <span className="text-[0.8rem] text-muted-foreground">
            {t("theme.systemDesc")}
          </span>
        </div>
        <Switch
          checked={theme === "system"}
          onCheckedChange={(checked) => setTheme(checked ? "system" : "light")}
        />
      </div>
    </div>
  );
}
