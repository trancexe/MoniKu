"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction } from "@/lib/db";
import * as Icons from "@phosphor-icons/react";
import dayjs from "dayjs";
import "dayjs/locale/id";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import { RevealStagger } from "@/components/ui/RevealStagger";
import { WalletChip } from "@/components/ui/WalletChip";
import { TransactionEditSheet } from "./TransactionEditSheet";
import { useT, useFormatLocale } from "@/lib/i18n";
import { useWalletFilter } from "@/lib/hooks/useWalletFilter";

dayjs.extend(isToday);
dayjs.extend(isYesterday);

type FilterType = "all" | "income" | "expense";

export function TransactionHistory() {
  const t = useT();
  const { formatCurrency, formatTime } = useFormatLocale();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { effectiveWalletId, wallets, isLoading: walletsLoading, setWalletFilter } =
    useWalletFilter();

  const allTransactions = useLiveQuery(
    () => db.transactions.orderBy("date").reverse().toArray()
  );
  const categories = useLiveQuery(() => db.categories.toArray());

  const isLoading = walletsLoading || !allTransactions || !categories;

  const transactions = useMemo(() => {
    return (allTransactions ?? []).filter((trx) => {
      if (effectiveWalletId && trx.wallet_id !== effectiveWalletId) return false;
      if (filter !== "all" && trx.type !== filter) return false;
      return true;
    });
  }, [allTransactions, effectiveWalletId, filter]);

  const getCategory = (id: string) => (categories ?? []).find((c) => c.id === id);

  // Group transactions by date
  const groupedTransactions = useMemo(
    () =>
      transactions.reduce<{ label: string; date: string; items: Transaction[] }[]>(
        (groups, trx) => {
          const d = dayjs(trx.date);
          let label: string;
          if (d.isToday()) {
            label = t("transaction.today");
          } else if (d.isYesterday()) {
            label = t("transaction.yesterday");
          } else {
            label = d.format("dddd, D MMMM YYYY");
          }
          const dateKey = d.format("YYYY-MM-DD");

          const existing = groups.find((g) => g.date === dateKey);
          if (existing) {
            existing.items.push(trx);
          } else {
            groups.push({ label, date: dateKey, items: [trx] });
          }
          return groups;
        },
        []
      ),
    [transactions, t]
  );

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: t("transaction.filterAll") },
    { value: "expense", label: t("transaction.filterExpense") },
    { value: "income", label: t("transaction.filterIncome") },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 p-4" aria-busy="true">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-muted/60" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-5 w-32 animate-pulse rounded bg-muted/60" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet chip selector (horizontal scroll).
          Tapping the active chip deselects it (handled in setWalletFilter). */}
      {wallets.length > 0 && (
        <div
          role="tablist"
          aria-label={t("transaction.walletFilter")}
          className="flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden"
        >
          <WalletChip
            label={t("transaction.allWallets")}
            icon={Icons.GridFour}
            active={effectiveWalletId === null}
            onClick={() => setWalletFilter(null)}
          />
          {wallets.map((wallet) => {
            const WalletIcon = (Icons[
              wallet.icon as keyof typeof Icons
            ] ?? Icons.Wallet) as unknown as React.ElementType;
            const isActive = effectiveWalletId === wallet.id;
            return (
              <WalletChip
                key={wallet.id}
                label={wallet.name}
                icon={WalletIcon}
                active={isActive}
                onClick={() => setWalletFilter(isActive ? null : wallet.id)}
              />
            );
          })}
        </div>
      )}

      {/* Type Filter Tabs */}
      <div role="tablist" className="flex gap-2 px-4">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            role="tab"
            aria-selected={filter === opt.value}
            onClick={() => setFilter(opt.value)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-all active:scale-[0.97] ${
              filter === opt.value
                ? "bg-zinc-900 text-zinc-50 shadow dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Transaction Groups */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-50 p-10 text-center dark:bg-zinc-900/50 mx-4">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            <Icons.Receipt weight="duotone" className="h-6 w-6" />
          </div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {filter === "all" ? t("transaction.emptyAll") : t("transaction.emptyFiltered", { type: filter === "income" ? t("transaction.income") : t("transaction.expense") })}
          </p>
          <p className="mt-1 text-sm text-zinc-500 max-w-[200px]">
            {t("transaction.emptyDescHistory")}
          </p>
        </div>
      ) : (
        <div className="space-y-6 px-4">
          {groupedTransactions.map((group) => {
            // Calculate daily total
            const dayIncome = group.items
              .filter((trx) => trx.type === "income")
              .reduce((sum, trx) => sum + trx.amount, 0);
            const dayExpense = group.items
              .filter((trx) => trx.type === "expense")
              .reduce((sum, trx) => sum + trx.amount, 0);

            return (
              <div key={group.date}>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] font-medium tabular-nums min-w-0 justify-end">
                    {dayIncome > 0 && (
                      <span className="text-green-600 dark:text-green-500 truncate max-w-[80px] sm:max-w-[120px]">
                        +{formatCurrency(dayIncome)}
                      </span>
                    )}
                    {dayExpense > 0 && (
                      <span className="text-red-500 dark:text-red-400 truncate max-w-[80px] sm:max-w-[120px]">
                        -{formatCurrency(dayExpense)}
                      </span>
                    )}
                  </div>
                </div>

                <RevealStagger className="space-y-2">
                  {group.items.map((trx) => {
                    const category = getCategory(trx.category_id);
                    let Icon = (
                      (category?.icon && Icons[category.icon as keyof typeof Icons]) || Icons.CurrencyDollar
                    ) as unknown as React.ComponentType<{ className?: string, weight?: string }>;
                    let categoryName = category?.name || t("transaction.categoryOther");

                    if (trx.category_id === "system-debt-creation") {
                      Icon = Icons.Users as unknown as React.ComponentType<{ className?: string, weight?: string }>;
                      categoryName = "Pencatatan Hutang/Piutang";
                    } else if (trx.category_id === "system-repayment") {
                      Icon = Icons.Handshake as unknown as React.ComponentType<{ className?: string, weight?: string }>;
                      categoryName = "Pelunasan Hutang/Piutang";
                    }

                    const isIncome = trx.type === "income";

                    return (
                      <button
                        type="button"
                        key={trx.id}
                        onClick={() => {
                          setSelectedTransaction(trx);
                          setEditOpen(true);
                        }}
                        className="w-full text-left flex items-center justify-between rounded-xl bg-card p-3.5 shadow-sm transition hover:bg-muted/50 active:scale-[0.99] cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              isIncome
                                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}
                          >
                            <Icon weight="duotone" className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {categoryName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {formatTime(trx.date)}
                              {trx.notes ? ` • ${trx.notes}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 max-w-[40%] justify-end">
                          <div
                            className={`font-medium tabular-nums text-sm truncate ${
                              isIncome
                                ? "text-green-600 dark:text-green-500"
                                : "text-zinc-900 dark:text-zinc-100"
                            }`}
                          >
                            {isIncome ? "+" : "-"}{formatCurrency(trx.amount)}
                          </div>
                          <Icons.CaretRight weight="bold" className="shrink-0 h-4 w-4 text-muted-foreground/30" />
                        </div>
                      </button>
                    );
                  })}
                </RevealStagger>
              </div>
            );
          })}
        </div>
      )}

      <TransactionEditSheet
        transaction={selectedTransaction}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
