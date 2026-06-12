"use client";

import { PieChart } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function AnalyticsPage() {
  const t = useT();
  return (
    <div className="flex flex-col p-4">
      <header className="py-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.analytics")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("analytics.subtitle")}</p>
      </header>
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center justify-center rounded-3xl bg-zinc-50 p-10 text-center dark:bg-zinc-900/50">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            <PieChart className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("analytics.comingSoon")}</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-[220px]">
            {t("analytics.comingSoonDesc")}
          </p>
        </div>
      </div>
    </div>
  );
}
