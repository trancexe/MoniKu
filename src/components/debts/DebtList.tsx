"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { RevealStagger } from "@/components/ui/RevealStagger";
import { useT, useFormatLocale } from "@/lib/i18n";

export function DebtList() {
  const t = useT();
  const { formatCurrencyRaw } = useFormatLocale();
  const debts = useLiveQuery(() => db.debt_loans.toArray());
  const wallets = useLiveQuery(() => db.wallets.toArray());
  const [selectedWallet, setSelectedWallet] = useState<string>("");

  const handleRepay = async (debtId: string, remainingAmount: number, type: 'debt' | 'loan') => {
    if (!selectedWallet) return toast.error(t("debt.selectWalletFirst"));

    try {
      await db.transaction('rw', db.transactions, db.wallets, db.debt_loans, async () => {
        const wallet = await db.wallets.get(selectedWallet);
        if (!wallet) throw new Error("Wallet not found");

        const debt = await db.debt_loans.get(debtId);
        if (!debt) throw new Error("Debt not found");

        await db.transactions.add({
          id: crypto.randomUUID(),
          wallet_id: selectedWallet,
          category_id: "system-repayment",
          type: type === 'debt' ? 'expense' : 'income',
          amount: remainingAmount,
          date: Date.now(),
          notes: `Pelunasan ${type === 'debt' ? 'Hutang ke' : 'Piutang dari'} ${debt.person_name}`,
          sync_status: 'pending'
        });

        const newBalance = type === 'debt'
          ? wallet.current_balance - remainingAmount
          : wallet.current_balance + remainingAmount;

        await db.wallets.update(selectedWallet, {
          current_balance: newBalance,
          updated_at: Date.now()
        });

        await db.debt_loans.update(debtId, {
          remaining_amount: 0,
          status: 'paid'
        });
      });
      toast.success(t("debt.repaySuccess"));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(t("debt.repayFailed"));
    }
  };

  const isLoading = !debts || !wallets;

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
      <div className="rounded-xl border bg-card p-4">
        <label className="text-xs font-medium text-muted-foreground block mb-2">{t("debt.selectWallet")}</label>
        <Select value={selectedWallet} onValueChange={(val) => { if (val !== null) setSelectedWallet(val); }}>
          <SelectTrigger>
            <SelectValue placeholder={t("debt.selectWalletPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {wallets?.map(w => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <RevealStagger className="space-y-4">
          {debts?.map(debt => (
            <div key={debt.id} className="rounded-xl border bg-card p-4 shadow-sm flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className={`text-xs font-bold uppercase ${debt.type === 'debt' ? 'text-red-500' : 'text-green-500'}`}>
                    {debt.type === 'debt' ? t("debt.type_debt_label") : t("debt.type_loan_label")}
                  </span>
                  <p className="font-semibold text-lg">{debt.person_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t("debt.remaining")}</p>
                  <p className="font-bold tabular-nums">{formatCurrencyRaw(debt.remaining_amount)}</p>
                </div>
              </div>

              {debt.status === 'active' ? (
                <Button
                  onClick={() => handleRepay(debt.id, debt.remaining_amount, debt.type)}
                  className="w-full tabular-nums active:scale-[0.98] transition-transform"
                >
                  {t("debt.repay")} ({formatCurrencyRaw(debt.remaining_amount)})
                </Button>
              ) : (
                <div className="rounded bg-green-100 text-green-600 text-center py-2 text-sm font-bold dark:bg-green-900/30 dark:text-green-400">
                  {t("debt.paid")}
                </div>
              )}
            </div>
          ))}
        </RevealStagger>

        {debts?.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-50 p-10 text-center dark:bg-zinc-900/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <Users className="h-6 w-6" />
            </div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{t("debt.empty")}</p>
            <p className="mt-1 text-sm text-zinc-500 max-w-[200px]">
              {t("debt.emptyDesc")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
