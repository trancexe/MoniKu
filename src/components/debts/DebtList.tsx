"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Users, ChevronRight } from "lucide-react";
import { RevealStagger } from "@/components/ui/RevealStagger";
import { useT, useFormatLocale } from "@/lib/i18n";
import Link from "next/link";

export function DebtList() {
  const t = useT();
  const { formatCurrencyRaw } = useFormatLocale();
  const debts = useLiveQuery(() => db.debt_loans.toArray());

  const isLoading = !debts;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true">
        <div className="h-16 w-full rounded-xl bg-muted/60" />
        <div className="h-32 w-full rounded-xl bg-muted/60" />
        <div className="h-32 w-full rounded-xl bg-muted/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <RevealStagger className="space-y-4">
          {debts?.map((debt) => (
            <Link
              href={`/debts/detail?id=${debt.id}`}
              key={debt.id}
              className="group block rounded-xl border bg-card p-4 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span
                    className={`text-xs font-bold uppercase ${
                      debt.type === "debt" ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {debt.type === "debt"
                      ? t("debt.type_debt_label")
                      : t("debt.type_loan_label")}
                  </span>
                  <p className="font-semibold text-lg">{debt.person_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {t("debt.remaining")}
                  </p>
                  <p className="font-bold tabular-nums">
                    {formatCurrencyRaw(debt.remaining_amount)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
                {debt.status === "active" ? (
                  <span className="text-sm text-zinc-500 font-medium">
                    {t("debt.list.viewDetail") || "Lihat Detail"}
                  </span>
                ) : (
                  <div className="rounded px-2 py-1 bg-green-100 text-green-600 text-xs font-bold dark:bg-green-900/30 dark:text-green-400">
                    {t("debt.paid")}
                  </div>
                )}
                <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
              </div>
            </Link>
          ))}
        </RevealStagger>

        {debts?.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-50 p-10 text-center dark:bg-zinc-900/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <Users className="h-6 w-6" />
            </div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {t("debt.empty")}
            </p>
            <p className="mt-1 text-sm text-zinc-500 max-w-[200px]">
              {t("debt.emptyDesc")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

