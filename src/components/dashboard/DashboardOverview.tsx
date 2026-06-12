"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import * as Icons from "lucide-react";
import dayjs from "dayjs";
import 'dayjs/locale/id';
import { RevealStagger } from "@/components/ui/RevealStagger";

dayjs.locale('id');

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted/60 ${className ?? ''}`} />;
}

export function DashboardOverview() {
  const wallets = useLiveQuery(() => db.wallets.toArray());
  const transactions = useLiveQuery(() => 
    db.transactions.orderBy('date').reverse().limit(10).toArray()
  );
  const categories = useLiveQuery(() => db.categories.toArray());

  const isLoading = !wallets || !transactions || !categories;
  const totalBalance = wallets?.reduce((acc, wallet) => acc + wallet.current_balance, 0) || 0;

  const getCategory = (id: string) => categories?.find(c => c.id === id);

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 p-4 pt-8">
      {/* Dashboard Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MoniKu</h1>
          <p className="text-muted-foreground text-sm">Keuangan Anda</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
          <Icons.Wallet className="h-5 w-5" />
        </div>
      </header>

      {/* Total Balance Card - Cold Luxury Materiality */}
      <section className="relative overflow-hidden rounded-2xl bg-zinc-950 p-6 text-zinc-50 shadow-xl shadow-black/10 dark:bg-zinc-900 dark:border dark:border-zinc-800">
        <div className="absolute inset-0 border-[1px] border-white/10 rounded-2xl pointer-events-none" />
        <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-2xl pointer-events-none" />
        <p className="text-sm font-medium text-zinc-400">Total Saldo</p>
        <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
          Rp {totalBalance.toLocaleString("id-ID")}
        </h2>
      </section>

      {/* Quick Action - Refined Asymmetry / Pill-like */}
      <section className="grid grid-cols-2 gap-3">
        <a href="/debts" className="flex flex-col items-start gap-3 rounded-2xl bg-zinc-100/50 p-4 transition hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-[0.98]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
            <Icons.Users className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Hutang / Piutang</span>
        </a>
        <a href="/transactions" className="flex flex-col items-start gap-3 rounded-2xl bg-zinc-100/50 p-4 transition hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-[0.98]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
            <Icons.PlusCircle className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Catat Transaksi</span>
        </a>
      </section>

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base sm:text-lg">Transaksi Terakhir</h3>
          {transactions.length > 0 && (
            <button className="text-sm font-medium text-primary hover:underline transition">Lihat Semua</button>
          )}
        </div>

        <div className="space-y-2.5">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-50 p-10 text-center dark:bg-zinc-900/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                <Icons.Receipt className="h-6 w-6" />
              </div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">Belum ada transaksi</p>
              <p className="mt-1 text-sm text-zinc-500 max-w-[200px]">
                Mulai catat pengeluaran atau pemasukan Anda
              </p>
              <a
                href="/transactions"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.97] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Icons.PlusCircle className="h-4 w-4" />
                Catat Transaksi
              </a>
            </div>
          ) : (
            <RevealStagger className="space-y-2.5">
              {transactions.map(trx => {
                const category = getCategory(trx.category_id);
                const Icon = (category?.icon ? Icons[category.icon as keyof typeof Icons] : Icons.CircleDollarSign) as any;
                const isIncome = trx.type === 'income';

                return (
                  <article
                    key={trx.id}
                    className="flex items-center justify-between rounded-xl bg-card p-3.5 shadow-sm transition ease-smooth duration-smooth hover:bg-muted/50 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isIncome 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{category?.name || 'Lainnya'}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{dayjs(trx.date).format('D MMM YYYY, HH:mm')} • {trx.notes || '-'}</p>
                      </div>
                    </div>
                    <div className={`shrink-0 font-medium tabular-nums text-sm sm:text-base ${isIncome ? 'text-green-600 dark:text-green-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {isIncome ? '+' : '-'}Rp {trx.amount.toLocaleString("id-ID")}
                    </div>
                  </article>
                );
              })}
            </RevealStagger>
          )}
        </div>
      </section>
    </div>
  );
}
