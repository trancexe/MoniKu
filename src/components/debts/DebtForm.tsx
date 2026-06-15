"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useFormatLocale, useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { z } from "zod";
import { useT } from "@/lib/i18n";

export function DebtForm() {
  const t = useT();
  const { formatCurrencyRaw } = useFormatLocale();
  const [type, setType] = useState<'debt' | 'loan'>('debt');
  const [personName, setPersonName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  
  const wallets = useLiveQuery(() => db.wallets.toArray());

  // Re-entrancy guard — see TransactionForm. Prevents the same debt
  // from being saved twice on a fast double-tap.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const makeSchema = () => z.object({
    personName: z.string().min(1, t("validation.nameRequired")).max(100, t("validation.nameMax")),
    amount: z.number().positive(t("validation.amountPositive")).max(1000000000000, t("validation.amountMax")),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const rawAmount = parseInt(amountStr, 10);
    const debtSchema = makeSchema();
    const parsed = debtSchema.safeParse({ personName, amount: rawAmount });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }

    const amount = parsed.data.amount;

    setIsSubmitting(true);
    try {
      await db.transaction('rw', db.transactions, db.wallets, db.debt_loans, async () => {
        const debtId = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
        
        await db.debt_loans.add({
          id: debtId,
          type,
          person_name: parsed.data.personName,
          total_amount: amount,
          remaining_amount: amount,
          status: 'active'
        });

        if (selectedWallet) {
          const wallet = await db.wallets.get(selectedWallet);
          if (wallet) {
            // If we take a debt (Hutang), we receive money -> income.
            // If we give a loan (Piutang), we give money -> expense.
            const txType = type === 'debt' ? 'income' : 'expense';
            
            await db.transactions.add({
              id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)),
              wallet_id: selectedWallet,
              category_id: "system-debt-creation",
              type: txType,
              amount: amount,
              date: Date.now(),
              notes: `Pencatatan awal ${type === 'debt' ? 'Hutang dari' : 'Piutang ke'} ${parsed.data.personName}`,
              sync_status: "pending",
              debt_id: debtId,
            });

            const newBalance = txType === 'income' 
              ? wallet.current_balance + amount 
              : wallet.current_balance - amount;

            await db.wallets.update(selectedWallet, {
              current_balance: newBalance,
              updated_at: Date.now(),
            });
          }
        }
      });
      
      setPersonName("");
      setAmountStr("");
      setSelectedWallet(null);
      toast.success(t("debt.saved"));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(t("debt.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          aria-pressed={type === 'debt'}
          onClick={() => setType('debt')}
          className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${type === 'debt' ? 'bg-background shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-500'}`}
        >
          {t("debt.iOwe")}
        </button>
        <button
          type="button"
          aria-pressed={type === 'loan'}
          onClick={() => setType('loan')}
          className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${type === 'loan' ? 'bg-background shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-500'}`}
        >
          {t("debt.theyOweMe")}
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="personName" className="text-xs font-medium text-zinc-500">{t("debt.personName")}</label>
        <input
          id="personName"
          type="text"
          required
          className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="amountStr" className="text-xs font-medium text-zinc-500">{t("debt.amount")}</label>
        <input
          id="amountStr"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-500">
          {t("transaction.typeWallet")} <span className="text-zinc-400 font-normal">(Opsional)</span>
        </label>
        <p className="text-[10px] text-zinc-400 mb-2">
          Pilih dompet jika uang fisik langsung diterima/dikeluarkan. Biarkan kosong jika hanya pencatatan.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
          {(wallets || []).map(w => {
            const isSelected = selectedWallet === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWallet(isSelected ? null : w.id)}
                aria-pressed={isSelected}
                className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all hover:bg-muted/50 active:scale-[0.98] ${isSelected ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20' : 'bg-card text-muted-foreground'}`}
              >
                <span className="text-[11px] font-medium text-center line-clamp-2 w-full leading-tight">{w.name}</span>
                <span className={`text-[10px] font-medium text-center line-clamp-1 w-full mt-0.5 ${isSelected ? 'text-primary/80' : 'text-muted-foreground'}`}>
                  {formatCurrencyRaw(w.current_balance)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full rounded-full py-6 text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed">{t("debt.save")}</Button>
    </form>
  );
}
