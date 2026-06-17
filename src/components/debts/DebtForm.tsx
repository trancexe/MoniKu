"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useFormatLocale, useT } from "@/lib/i18n";
import { toast } from "sonner";
import { z } from "zod";
import { CustomNumpad } from "@/components/transactions/CustomNumpad";
import { Button } from "@/components/ui/button";
import { X, ChevronRight } from "lucide-react";
import dayjs from "dayjs";

export function DebtForm() {
  const t = useT();
  const { formatCurrencyRaw } = useFormatLocale();
  const [type, setType] = useState<'debt' | 'loan'>('debt');
  const [personName, setPersonName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DDTHH:mm"));
  const [notes, setNotes] = useState("");

  const wallets = useLiveQuery(() => db.wallets.toArray());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [tempAmountStr, setTempAmountStr] = useState(amountStr);

  const makeSchema = () => z.object({
    personName: z.string().min(1, t("validation.nameRequired")).max(100, t("validation.nameMax")),
    amount: z.number().positive(t("validation.amountPositive")).max(1000000000000, t("validation.amountMax")),
  });

  const handleSubmit = async () => {
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
            const txType = type === 'debt' ? 'income' : 'expense';

            await db.transactions.add({
              id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)),
              wallet_id: selectedWallet,
              category_id: "system-debt-creation",
              type: txType,
              amount: amount,
              date: new Date(date).getTime(),
              notes: notes || `Pencatatan awal ${type === 'debt' ? 'Hutang dari' : 'Piutang ke'} ${parsed.data.personName}`,
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
      setDate(dayjs().format("YYYY-MM-DDTHH:mm"));
      setNotes("");
      toast.success(t("debt.saved"));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(t("debt.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-7 rounded-2xl bg-card p-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          aria-pressed={type === 'debt'}
          onClick={() => setType('debt')}
          className={`flex-1 rounded-full py-3 text-sm font-medium transition-all duration-200 ease-smooth active:scale-[0.98] ${type === 'debt' ? 'bg-background shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
        >
          {t("debt.iOwe")}
        </button>
        <button
          type="button"
          aria-pressed={type === 'loan'}
          onClick={() => setType('loan')}
          className={`flex-1 rounded-full py-3 text-sm font-medium transition-all duration-200 ease-smooth active:scale-[0.98] ${type === 'loan' ? 'bg-background shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
        >
          {t("debt.theyOweMe")}
        </button>
      </div>

      <div>
        <label htmlFor="personName" className="text-xs font-medium text-zinc-500 mb-1.5">{t("debt.personName")}</label>
        <input
          id="personName"
          type="text"
          required
          className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors duration-200 ease-smooth"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-500">
          {t("transaction.amountLabel")}
        </label>
        <button
          type="button"
          onClick={() => {
            setTempAmountStr(amountStr || "0");
            setAmountModalOpen(true);
          }}
          className="group w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-left shadow-sm transition-all duration-300 ease-smooth hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-bold tracking-tight tabular-nums ${type === 'debt' ? 'text-red-500' : 'text-green-500'}`}>
              {formatCurrencyRaw(parseInt(amountStr || "0", 10))}
            </span>
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 group-hover:text-foreground">
              <span>{amountStr && amountStr !== "0" ? "Ubah" : "Pilih nominal"}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </button>
      </div>

      <div>
        <label htmlFor="debtDate" className="text-xs font-medium text-zinc-500 mb-1.5">{t("transaction.date")}</label>
        <input
          id="debtDate"
          type="datetime-local"
          className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors duration-200 ease-smooth"
          value={date}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker();
            } catch {
              // Ignore if showPicker is not supported
            }
          }}
          onChange={(e) => setDate(e.target.value)}
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
                className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all duration-200 ease-smooth hover:bg-muted/50 active:scale-[0.98] ${isSelected ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20' : 'bg-card text-muted-foreground'}`}
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

      <div>
        <label htmlFor="debtNotes" className="text-xs font-medium text-zinc-500 mb-1.5">{t("transaction.notes")}</label>
        <input
          id="debtNotes"
          type="text"
          className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors duration-200 ease-smooth placeholder:text-zinc-400"
          placeholder={t("transaction.notesPlaceholder")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] disabled:opacity-60"
      >
        {t("debt.save")}
      </Button>

      {amountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-h-[90vh] bg-background sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-lg shadow-black/5 dark:shadow-black/20 flex flex-col animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 ease-smooth">
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-between p-4 border-b border-border/60">
              <h2 className="font-semibold text-lg">{t("transaction.amountLabel")}</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full transition-colors duration-200 ease-smooth"
                onClick={() => setAmountModalOpen(false)}
                aria-label={t("common.cancel")}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-6">
              <div className="text-center py-6">
                <span className="text-xs font-medium text-muted-foreground mb-2 block">
                  {t("transaction.amountLabel")}
                </span>
                <h2 aria-live="polite" aria-atomic="true" className={`text-4xl font-bold tracking-tight tabular-nums ${type === 'debt' ? 'text-red-500' : 'text-green-500'}`}>
                  {formatCurrencyRaw(parseInt(tempAmountStr || "0", 10))}
                </h2>
              </div>
            </div>

            <div className="shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-sm px-4 pt-3 pb-4">
              <CustomNumpad
                value={tempAmountStr}
                onChange={setTempAmountStr}
                onSubmit={() => {
                  setAmountStr(tempAmountStr);
                  setAmountModalOpen(false);
                }}
                submitLabel={t("common.save")}
                ariaLabelNumber={(n) => `${n}`}
                ariaLabelDelete={t("common.delete")}
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
