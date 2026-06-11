"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import * as Icons from "lucide-react";
import dayjs from "dayjs";
import 'dayjs/locale/id';

dayjs.locale('id');

export function DashboardOverview() {
  const wallets = useLiveQuery(() => db.wallets.toArray());
  const transactions = useLiveQuery(() => 
    db.transactions.orderBy('date').reverse().limit(10).toArray()
  );
  const categories = useLiveQuery(() => db.categories.toArray());

  const totalBalance = wallets?.reduce((acc, wallet) => acc + wallet.current_balance, 0) || 0;

  const getCategory = (id: string) => categories?.find(c => c.id === id);

  return (
    <div className="flex flex-col space-y-8">
      {/* Total Balance Card */}
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
        <p className="text-sm font-medium opacity-90">Total Saldo</p>
        <h2 className="mt-2 text-4xl font-bold tracking-tight">
          Rp {totalBalance.toLocaleString("id-ID")}
        </h2>
      </section>

      {/* Quick Action */}
      <section className="grid grid-cols-2 gap-4">
        <a href="/debts" className="flex items-center justify-center space-x-2 rounded-xl bg-secondary/50 p-4 text-sm font-medium transition active:bg-secondary">
          <Icons.Users className="h-5 w-5" />
          <span>Hutang / Piutang</span>
        </a>
        <a href="/transactions" className="flex items-center justify-center space-x-2 rounded-xl bg-secondary/50 p-4 text-sm font-medium transition active:bg-secondary">
          <Icons.PlusCircle className="h-5 w-5" />
          <span>Catat Transaksi</span>
        </a>
      </section>

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Transaksi Terakhir</h3>
          <button className="text-sm text-primary font-medium hover:underline">Lihat Semua</button>
        </div>

        <div className="space-y-3">
          {transactions?.length === 0 && (
            <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              Belum ada transaksi bulan ini.
            </div>
          )}

          {transactions?.map(trx => {
            const category = getCategory(trx.category_id);
            // @ts-ignore
            const Icon = category?.icon ? Icons[category.icon] : Icons.CircleDollarSign;
            const isIncome = trx.type === 'income';

            return (
              <div key={trx.id} className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    isIncome 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{category?.name || 'Lainnya'}</p>
                    <p className="text-xs text-muted-foreground">{dayjs(trx.date).format('D MMM YYYY, HH:mm')} • {trx.notes || '-'}</p>
                  </div>
                </div>
                <div className={`font-bold ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
                  {isIncome ? '+' : '-'}Rp {trx.amount.toLocaleString("id-ID")}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
