"use client";

import { WalletList } from "@/components/master-data/WalletList";
import { CategoryList } from "@/components/master-data/CategoryList";
import { SyncSettings } from "@/components/settings/SyncSettings";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { LanguageSettings } from "@/components/settings/LanguageSettings";
import { useT } from "@/lib/i18n";

export default function SettingsPage() {
  const t = useT();

  return (
    <div className="flex flex-col p-4 mx-auto space-y-10 pb-32 w-full">
      <header className="py-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground text-sm mt-2">{t("settings.subtitle")}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight px-1">Preferences</h2>
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-3xl shadow-sm">
            <ThemeSettings />
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-3xl shadow-sm">
            <LanguageSettings />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight px-1">Security & Data</h2>
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-3xl shadow-sm">
            <SecuritySettings />
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-3xl shadow-sm">
            <SyncSettings />
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-lg font-semibold tracking-tight px-1">Master Data</h2>
        <div className="pl-2 space-y-10 border-l-2 border-muted/50 ml-2">
          <div className="pl-6 relative">
            <div className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-muted-foreground" />
            <WalletList />
          </div>
          <div className="pl-6 relative">
            <div className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-muted-foreground" />
            <CategoryList />
          </div>
        </div>
      </section>
    </div>
  );
}
