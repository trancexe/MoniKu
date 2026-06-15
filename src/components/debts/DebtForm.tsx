"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { z } from "zod";
import { useT } from "@/lib/i18n";

export function DebtForm() {
  const t = useT();
  const [type, setType] = useState<'debt' | 'loan'>('debt');
  const [personName, setPersonName] = useState("");
  const [amountStr, setAmountStr] = useState("");
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
      await db.debt_loans.add({
        id: crypto.randomUUID(),
        type,
        person_name: parsed.data.personName,
        total_amount: amount,
        remaining_amount: amount,
        status: 'active'
      });
      setPersonName("");
      setAmountStr("");
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

      <Button type="submit" disabled={isSubmitting} className="w-full rounded-full py-6 text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed">{t("debt.save")}</Button>
    </form>
  );
}
