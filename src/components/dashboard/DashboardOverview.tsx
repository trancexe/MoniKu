"use client";

import { useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction } from "@/lib/db";
import * as Icons from "@phosphor-icons/react";
import dayjs from "dayjs";
import { RevealStagger } from "@/components/ui/RevealStagger";
import { TransactionEditSheet } from "@/components/transactions/TransactionEditSheet";
import { WalletCard } from "@/components/ui/WalletCard";
import Link from "next/link";
import { useT, useFormatLocale } from "@/lib/i18n";
import { WALLET_QUERY_PARAM, useWalletFilter } from "@/lib/hooks/useWalletFilter";

const HIDE_BALANCE_KEY = "moniku-hideBalance";
const HOME_TX_LIMIT = 5;

// --- Hide balance (persistent via localStorage) ---
function readHideBalanceSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(HIDE_BALANCE_KEY) === "1";
  } catch {
    return false;
  }
}
function getServerHideBalanceSnapshot(): boolean {
  return false;
}
function subscribeToHideBalance(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === HIDE_BALANCE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
function setHideBalance(hidden: boolean) {
  try {
    if (hidden) {
      localStorage.setItem(HIDE_BALANCE_KEY, "1");
    } else {
      localStorage.removeItem(HIDE_BALANCE_KEY);
    }
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    // The native `storage` event only fires across tabs/windows, not in the
    // tab that did the write. Dispatch a synthetic event so the local
    // useSyncExternalStore subscriber re-reads the snapshot in this tab.
    window.dispatchEvent(
      new StorageEvent("storage", { key: HIDE_BALANCE_KEY, newValue: hidden ? "1" : null })
    );
  }
}

export function DashboardOverview() {
  const t = useT();
  const { formatCurrency } = useFormatLocale();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const isBalanceHidden = useSyncExternalStore(
    subscribeToHideBalance,
    readHideBalanceSnapshot,
    getServerHideBalanceSnapshot
  );

  const {
    effectiveWalletId,
    selectedWallet: activeWallet,
    wallets,
    isLoading: walletsLoading,
    selectedWalletId,
    setWalletFilter,
  } = useWalletFilter();

  // Wallet-aware query: when a wallet is selected, fetch all of its
  // transactions, sort by date, take the latest 5. The naive global
  // `.limit(5)` would silently truncate wallets with few recent entries
  // (see QA report D1). Performance acceptable at personal-finance scale
  // (hundreds of tx per wallet); add a compound `[wallet_id+date]` index
  // in a future schema migration if this ever becomes a hotspot.
  const transactions = useLiveQuery(
    async () => {
      if (selectedWalletId) {
        const all = await db.transactions
          .where("wallet_id")
          .equals(selectedWalletId)
          .toArray();
        return all
          .sort((a, b) => b.date - a.date)
          .slice(0, HOME_TX_LIMIT);
      }
      return db.transactions
        .orderBy("date")
        .reverse()
        .limit(HOME_TX_LIMIT)
        .toArray();
    },
    [selectedWalletId]
  );
  const categories = useLiveQuery(() => db.categories.toArray());

  const isLoading = walletsLoading || !transactions || !categories;

  const displayedBalance = effectiveWalletId
    ? activeWallet?.current_balance ?? 0
    : wallets.reduce((acc, wallet) => acc + wallet.current_balance, 0);

  const balanceLabel = effectiveWalletId ? activeWallet?.name ?? "" : t("dashboard.totalBalance");

  const getCategory = (id: string) => (categories ?? []).find((c) => c.id === id);

  const viewAllHref = effectiveWalletId
    ? `/transactions/history?${WALLET_QUERY_PARAM}=${effectiveWalletId}`
    : "/transactions/history";

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-6" aria-busy="true">
        <div className="h-8 w-32 rounded bg-muted/60 animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted/60 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-14 rounded-xl bg-muted/60 animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-5 w-40 rounded bg-muted/60 animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-8">
      {/* Decorative Header Background that bleeds to edges */}
      <div className="relative bg-zinc-100/50 dark:bg-zinc-900/30 rounded-b-[2.5rem] px-4 pt-10 pb-24 -mb-16 border-b border-black/5 dark:border-white/5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("dashboard.subtitle")}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
            <Icons.Wallet weight="duotone" className="h-6 w-6" />
          </div>
        </header>
      </div>

      {/* Main Content Area (Overlaps Header) */}
      <div className="px-4 relative z-10 space-y-8">
        {/* Total Balance Card */}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-950 p-6 text-zinc-50 shadow-tinted dark:bg-zinc-900 dark:border dark:border-zinc-800">
        <div className="absolute inset-0 border-[1px] border-white/10 rounded-3xl pointer-events-none" />
        <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl pointer-events-none" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-[80px] pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-zinc-400">{balanceLabel}</p>
          <button
            type="button"
            onClick={() => setHideBalance(!isBalanceHidden)}
            aria-label={
              isBalanceHidden ? t("dashboard.showBalance") : t("dashboard.hideBalance")
            }
            aria-pressed={isBalanceHidden}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-50 active:scale-95"
          >
            {isBalanceHidden ? (
              <Icons.EyeSlash weight="fill" className="h-4 w-4" />
            ) : (
              <Icons.Eye weight="fill" className="h-4 w-4" />
            )}
          </button>
        </div>
        <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
          {isBalanceHidden
            ? t("dashboard.balanceHidden")
            : formatCurrency(displayedBalance)}
        </h2>
      </section>

      {/* Wallet Card Selector — each card shows its own balance, tap to filter */}
      {wallets.length > 0 && (
        <section aria-label={t("transaction.walletFilter")}>
          <div
            role="tablist"
            className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden"
          >
            {wallets.map((wallet) => {
              const WalletIcon = (Icons[
                wallet.icon as keyof typeof Icons
              ] ?? Icons.Wallet) as React.ElementType;
              return (
                <WalletCard
                  key={wallet.id}
                  label={wallet.name}
                  // Hide per-card balance when the user toggled hide-balance,
                  // so the privacy intent covers every visible number on the
                  // home page (Total Balance Card + transaction row + cards).
                  amount={
                    isBalanceHidden
                      ? t("dashboard.balanceHidden")
                      : formatCurrency(wallet.current_balance)
                  }
                  icon={WalletIcon}
                  active={effectiveWalletId === wallet.id}
                  onClick={() =>
                    setWalletFilter(
                      effectiveWalletId === wallet.id ? null : wallet.id
                    )
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Action - Asymmetric Bento Grid */}
      <section aria-label={t("dashboard.quickActions")} className="grid grid-cols-[1.5fr_1fr] gap-3">
        <Link href="/transactions" className="relative flex flex-col justify-end items-start gap-4 rounded-3xl bg-primary/10 p-5 overflow-hidden transition-all ease-spring hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/30 active:scale-[0.96]">
          <div className="absolute -right-4 -top-4 text-primary/20 pointer-events-none">
            <Icons.PlusCircle weight="fill" className="h-24 w-24" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <Icons.Plus weight="bold" className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-primary-foreground/90">{t("dashboard.addTransaction")}</span>
        </Link>
        <Link href="/debts" className="flex flex-col justify-end items-start gap-3 rounded-3xl bg-zinc-100/80 p-5 transition-all ease-spring hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 active:scale-[0.96]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm dark:bg-zinc-700 dark:text-zinc-200">
            <Icons.Users weight="duotone" className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("dashboard.debtLoan")}</span>
        </Link>
      </section>

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base sm:text-lg">{t("dashboard.recentTransactions")}</h3>
          {transactions.length > 0 && (
            <Link href={viewAllHref} className="text-sm font-medium text-primary hover:underline transition">
              {t("dashboard.viewAll")}
            </Link>
          )}
        </div>

        <div className="space-y-2.5">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-50 p-10 text-center dark:bg-zinc-900/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                <Icons.Receipt weight="duotone" className="h-6 w-6" />
              </div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{t("dashboard.emptyTitle")}</p>
              <p className="mt-1 text-sm text-zinc-500 max-w-[200px]">
                {t("dashboard.emptyDesc")}
              </p>
              <Link
                href="/transactions"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-all ease-spring hover:bg-zinc-800 active:scale-[0.96] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm"
              >
                <Icons.PlusCircle weight="fill" className="h-4 w-4" />
                {t("dashboard.addTransaction")}
              </Link>
            </div>
          ) : (
            <RevealStagger className="space-y-2.5">
              {transactions.map((trx) => {
                const category = getCategory(trx.category_id);
                const Icon = ((category?.icon && Icons[category.icon as keyof typeof Icons]) || Icons.CurrencyDollar) as React.ElementType;
                const isIncome = trx.type === 'income';

                return (
                  <button
                    type="button"
                    key={trx.id}
                    onClick={() => {
                      setSelectedTransaction(trx);
                      setEditOpen(true);
                    }}
                    className="w-full text-left flex items-center justify-between rounded-xl bg-card p-3.5 shadow-sm transition ease-smooth duration-smooth hover:bg-muted/50 active:scale-[0.99] cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isIncome
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        <Icon weight="duotone" className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{category?.name || t("transaction.categoryOther")}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{dayjs(trx.date).format('D MMM YYYY, HH:mm')} • {trx.notes || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`shrink-0 font-medium tabular-nums text-sm sm:text-base ${isIncome ? 'text-green-600 dark:text-green-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {isBalanceHidden
                          ? "•••"
                          : `${isIncome ? '+' : '-'}${formatCurrency(trx.amount)}`}
                      </div>
                      <Icons.CaretRight weight="bold" className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  </button>
                );
              })}
            </RevealStagger>
          )}
        </div>
      </section>
      </div>


      <TransactionEditSheet
        transaction={selectedTransaction}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
