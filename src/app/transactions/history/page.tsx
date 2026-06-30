"use client";

import { Suspense } from "react";
import { TransactionHistory } from "@/components/transactions/TransactionHistory";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function TransactionHistoryPage() {
  const t = useT();
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="pt-6 pb-2 px-4">
        <Link
          href="/"
          className="inline-flex h-8 w-fit items-center justify-center gap-1.5 rounded-full bg-zinc-100 pr-3 pl-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          {t("common.back")}
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("transaction.historyTitle")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("transaction.historySubtitle")}</p>
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
