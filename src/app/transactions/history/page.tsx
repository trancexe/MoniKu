"use client";

import { Suspense } from "react";
import { TransactionHistory } from "@/components/transactions/TransactionHistory";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function TransactionHistoryPage() {
  const t = useT();
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="py-6 px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-10 items-center justify-center gap-2 rounded-full bg-zinc-100 pl-3 pr-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            {t("common.back")}
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("transaction.historyTitle")}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t("transaction.historySubtitle")}</p>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0 pb-8">
        <Suspense fallback={null}>
          <TransactionHistory />
        </Suspense>
      </div>
    </div>
  );
}
