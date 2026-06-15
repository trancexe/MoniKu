"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { CustomNumpad } from "./CustomNumpad";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT, useFormatLocale } from "@/lib/i18n";

export function TransactionForm() {
  const t = useT();
  const { formatCurrencyRaw } = useFormatLocale();

  // --- Dynamic bottom padding for the scrollable form ---
  // The numpad is `position: fixed` (sits above the BottomNav), so it overlays
  // the form's content area. The scrollable must have enough bottom padding
  // to keep the last field (notes) reachable above the numpad. Hardcoded
  // values were fragile across viewports — the Poco F6 (and other phones
  // with 20:9 aspect ratio + browser chrome) would clip the notes input
  // under the numpad (~133px short). We measure the numpad at runtime and
  // expose the result as inline `paddingBottom` on the scrollable.
  const numpadRef = useRef<HTMLDivElement>(null);
  // Initial fallback: roughly the previous `sm:pb-[380px]` value. Overwritten
  // synchronously by the useLayoutEffect below on first paint.
  const [scrollPaddingBottom, setScrollPaddingBottom] = useState(380);

  useLayoutEffect(() => {
    const el = numpadRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Distance from viewport bottom to the top of the numpad, plus a small
      // visual breathing room. `rect.top` is the numpad's top edge in
      // viewport coordinates; viewport height minus that = how much of the
      // viewport the numpad + its bottom offset consume.
      const viewportHeight = window.innerHeight;
      setScrollPaddingBottom(viewportHeight - rect.top + 16);
    };

    measure();

    // Re-measure when numpad size changes (e.g. amount section wraps,
    // locale changes button text) and on viewport resize (rotation,
    // browser chrome show/hide, soft keyboard).
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const makeSchema = () => z.object({
    amount: z.number().positive(t("validation.amountPositive")).max(1000000000000, t("validation.amountMax")),
    notes: z.string().max(100, t("validation.notesMax")).optional(),
  });

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState("0");
  const [categoryId, setCategoryId] = useState<string>("");
  const [walletId, setWalletId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [transactionDate, setTransactionDate] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<{ amount: number, notes: string } | null>(null);
  // Re-entrancy guard: Dexie transactions are async and take a few ms
  // to commit. Without this, a fast double-tap of the submit button
  // (or button mashing on the CustomNumpad) queues two transactions
  // and the wallet balance gets debited twice. The guard is set at the
  // top of both entry points (handleSubmit + the negative-balance
  // confirm button) and cleared in `finally`, so a rejected submit
  // does not leave the form stuck.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wallets = useLiveQuery(() => db.wallets.toArray());
  const categories = useLiveQuery(() =>
    db.categories.where("type").equals(type).toArray()
  , [type]);

  const executeTransaction = async (amount: number, parsedNotes: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await db.transaction('rw', db.transactions, db.wallets, async () => {
        const currentWallet = await db.wallets.get(walletId);
        if (!currentWallet) throw new Error("Wallet not found");

        await db.transactions.add({
          id: crypto.randomUUID(),
          wallet_id: walletId,
          category_id: categoryId,
          type,
          amount,
          date: new Date(transactionDate).getTime(),
          notes: parsedNotes || "",
          sync_status: 'pending'
        });

        const newBalance = type === 'income'
          ? currentWallet.current_balance + amount
          : currentWallet.current_balance - amount;

        await db.wallets.update(walletId, {
          current_balance: newBalance,
          updated_at: Date.now()
        });
      });

      setAmountStr("0");
      setNotes("");
      setTransactionDate(() => {
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
      });
      toast.success(t("transaction.saved"));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(t("transaction.saveFailed"));
    } finally {
      setIsSubmitting(false);
      setIsWarningOpen(false);
      setPendingTransaction(null);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const rawAmount = parseInt(amountStr, 10);
    const transactionSchema = makeSchema();

    const parsed = transactionSchema.safeParse({ amount: rawAmount, notes });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }
    const amount = parsed.data.amount;

    if (!walletId) return toast.error(t("transaction.selectWallet"));
    if (!categoryId) return toast.error(t("transaction.selectCategory"));

    try {
      const wallet = await db.wallets.get(walletId);
      if (!wallet) throw new Error("Wallet not found");

      if (type === 'expense' && wallet.current_balance - amount < 0) {
        setPendingTransaction({ amount, notes: parsed.data.notes || "" });
        setIsWarningOpen(true);
        return;
      }

      await executeTransaction(amount, parsed.data.notes || "");
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(t("transaction.validateFailed"));
    }
  };

  const isLoading = !wallets || !categories;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full space-y-6 p-4" aria-busy="true">
        <div className="h-10 w-full animate-pulse rounded-full bg-muted/60" />
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />)}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingBottom: scrollPaddingBottom }}
      >
        <div className="space-y-6 p-2">
          {/* Type Toggle */}
          <div role="tablist" className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900 mx-2 mt-2">
            <button
              role="tab"
              aria-selected={type === 'expense'}
              onClick={() => setType('expense')}
              className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${type === 'expense' ? 'bg-white shadow text-red-600 dark:bg-zinc-800 dark:text-red-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              {t("transaction.expense")}
            </button>
            <button
              role="tab"
              aria-selected={type === 'income'}
              onClick={() => setType('income')}
              className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${type === 'income' ? 'bg-white shadow text-green-600 dark:bg-zinc-800 dark:text-green-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              {t("transaction.income")}
            </button>
          </div>

          {/* Quick Pickers */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">{t("transaction.typeCategory")}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-2">
                {categories?.map(c => {
                  const Icon = (Icons[c.icon as keyof typeof Icons] || Icons.HelpCircle) as React.ElementType;
                  const isSelected = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      aria-pressed={isSelected}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all hover:bg-muted/50 active:scale-[0.98] ${isSelected ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20' : 'bg-card text-muted-foreground'}`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-[11px] font-medium text-center line-clamp-1 w-full">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">{t("transaction.typeWallet")}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-2">
                {wallets?.map(w => {
                  const Icon = (Icons[w.icon as keyof typeof Icons] || Icons.Wallet) as React.ElementType;
                  const isSelected = walletId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWalletId(w.id)}
                      aria-pressed={isSelected}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all hover:bg-muted/50 active:scale-[0.98] ${isSelected ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20' : 'bg-card text-muted-foreground'}`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-[11px] font-medium text-center line-clamp-2 w-full leading-tight">{w.name}</span>
                      <span className={`text-[10px] font-medium text-center line-clamp-2 w-full mt-0.5 ${isSelected ? 'text-primary/80' : 'text-muted-foreground'}`}>
                        {formatCurrencyRaw(w.current_balance)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4 px-2">
            <div className="space-y-2">
              <label htmlFor="transactionDate" className="text-xs font-medium text-zinc-500">{t("transaction.date")}</label>
              <input
                id="transactionDate"
                type="datetime-local"
                className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="transactionNotes" className="text-xs font-medium text-zinc-500">{t("transaction.notes")}</label>
              <input
                id="transactionNotes"
                type="text"
                className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
                placeholder={t("transaction.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed numpad section - stays above bottom nav */}
      <div
        ref={numpadRef}
        className="fixed bottom-24 left-0 right-0 z-40 md:max-w-md md:mx-auto"
      >
        <div className="border-t pt-2 pb-2 bg-background px-4">
          {/* Amount Display */}
          <div className="flex flex-col items-center justify-center pb-4">
            <span className="text-xs font-medium text-muted-foreground mb-1">{t("transaction.amount")}</span>
            <h2 aria-live="polite" aria-atomic="true" className={`text-4xl font-bold tracking-tight ${type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrencyRaw(parseInt(amountStr || "0", 10))}
            </h2>
          </div>
          <CustomNumpad
            value={amountStr}
            onChange={setAmountStr}
            onSubmit={handleSubmit}
            disabled={isSubmitting}
            submitLabel={t("transaction.saveTransaction")}
            ariaLabelNumber={(n) => `${n}`}
            ariaLabelDelete={t("common.delete")}
          />
        </div>
      </div>

      <Dialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("transaction.negativeWarningTitle")}</DialogTitle>
            <DialogDescription>
              {t("transaction.negativeWarningDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsWarningOpen(false);
              setPendingTransaction(null);
            }}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => {
              if (pendingTransaction && !isSubmitting) {
                executeTransaction(pendingTransaction.amount, pendingTransaction.notes);
              }
            }} disabled={isSubmitting}>
              {t("transaction.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
