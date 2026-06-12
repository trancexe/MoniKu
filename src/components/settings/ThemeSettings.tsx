"use client";

import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Tampilan</h3>
        <p className="text-sm text-muted-foreground">
          Sesuaikan tema aplikasi sesuai preferensi Anda.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
        <div className="space-y-0.5 flex flex-col">
          <Label className="text-base">Mode Gelap (Dark Mode)</Label>
          <span className="text-[0.8rem] text-muted-foreground">
            Beralih ke tampilan gelap.
          </span>
        </div>
        <Switch
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
        <div className="space-y-0.5 flex flex-col">
          <Label className="text-base">Ikuti Sistem</Label>
          <span className="text-[0.8rem] text-muted-foreground">
            Gunakan tema perangkat Anda secara otomatis.
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
