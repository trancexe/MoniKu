"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction } from "@/lib/db";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CustomNumpad } from "./CustomNumpad";
import { TransactionDeleteDialog } from "./TransactionDeleteDialog";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useT, useFormatLocale } from "@/lib/i18n";
import { recalculateDebt } from "@/lib/debt-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TransactionEditSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function TransactionEditSheet({
  transaction,
  open,
  onOpenChange,
  onUpdated,
}: TransactionEditSheetProps) {
  const t = useT();
  const { formatCurrencyRaw } = useFormatLocale();

  const makeSchema = () => z.object({
    amount: z.number().positive(t("validation.amountPositive")).max(1000000000000, t("validation.amountMax")),
    notes: z.string().max(100, t("validation.notesMax")).optional(),
  });

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amountStr, setAmountStr] = useState("0");
  const [categoryId, setCategoryId] = useState<string>("");
  const [walletId, setWalletId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<{ amount: number, notes: string } | null>(null);
  // Re-entrancy guard — see TransactionForm for the rationale. The
  // edit path is more dangerous than create because a double-submit
  // can compound the wallet reversal (line 80-88 already debits the
  // old wallet before crediting the new one), so the second click
  // would re-reverse the already-reversed balance.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wallets = useLiveQuery(() => db.wallets.toArray());
  const categories = useLiveQuery(() =>
    db.categories.where("type").equals(type).toArray(),
    [type]
  );

  const [prevTransactionId, setPrevTransactionId] = useState<string | undefined>();
  const [prevOpen, setPrevOpen] = useState<boolean>(false);

  if (transaction?.id !== prevTransactionId || open !== prevOpen) {
    setPrevTransactionId(transaction?.id);
    setPrevOpen(open);
    if (transaction && open) {
      setType(transaction.type);
      setAmountStr(String(transaction.amount));
      setCategoryId(transaction.category_id);
      setWalletId(transaction.wallet_id);
      setNotes(transaction.notes || "");
      const d = new Date(transaction.date);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      setTransactionDate(local.toISOString().slice(0, 16));
    }
  }

  const executeUpdate = async (amount: number, parsedNotes: string) => {
    if (!transaction || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await db.transaction("rw", db.transactions, db.wallets, async () => {
        const oldWallet = await db.wallets.get(transaction.wallet_id);
        if (oldWallet) {
          const reversedBalance =
            transaction.type === "income"
              ? oldWallet.current_balance - transaction.amount
              : oldWallet.current_balance + transaction.amount;

          await db.wallets.update(transaction.wallet_id, {
            current_balance: reversedBalance,
            updated_at: Date.now(),
          });
        }

        const newWallet = await db.wallets.get(walletId);
        if (newWallet) {
          const freshBalance =
            walletId === transaction.wallet_id
              ? (await db.wallets.get(walletId))!.current_balance
              : newWallet.current_balance;

          const freshNewBalance =
            type === "income"
              ? freshBalance + amount
              : freshBalance - amount;

          await db.wallets.update(walletId, {
            current_balance: freshNewBalance,
            updated_at: Date.now(),
          });
        }

        await db.transactions.update(transaction.id, {
          wallet_id: walletId,
          category_id: categoryId,
          type,
          amount,
          date: new Date(transactionDate).getTime(),
          notes: parsedNotes || "",
          sync_status: "pending",
        });
      });

      if (transaction.debt_id) {
        await recalculateDebt(transaction.debt_id);
      }

      toast.success(t("transaction.updated"));
      onUpdated?.();
      onOpenChange(false);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(t("transaction.saveFailed"));
    } finally {
      setIsSubmitting(false);
      setIsWarningOpen(false);
      setPendingTransaction(null);
    }
  };

  const handleUpdate = async () => {
    if (!transaction || isSubmitting) return;

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
      const targetWallet = await db.wallets.get(walletId);
      if (!targetWallet) throw new Error("Wallet not found");

      let currentBalance = targetWallet.current_balance;
      // If same wallet, simulate the reversal
      if (walletId === transaction.wallet_id) {
         currentBalance = transaction.type === "income"
           ? currentBalance - transaction.amount
           : currentBalance + transaction.amount;
      }

      const newBalance = type === "income" ? currentBalance + amount : currentBalance - amount;

      if (type === "expense" && newBalance < 0) {
        setPendingTransaction({ amount, notes: parsed.data.notes || "" });
        setIsWarningOpen(true);
        return;
      }

      await executeUpdate(amount, parsed.data.notes || "");
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(t("transaction.validateFailed"));
    }
  };

  const isLoading = !wallets || !categories;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="!h-[96vh] rounded-t-2xl p-0 overflow-hidden flex flex-col md:max-w-md md:mx-auto">
          <SheetHeader className="px-4 pt-5 pb-2 shrink-0">
            <SheetTitle>{t("common.edit")}</SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center" aria-busy="true">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="space-y-5 px-4">
                  <div role="tablist" className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
                    <button
                      role="tab"
                      aria-selected={type === "expense"}
                      onClick={() => setType("expense")}
                      className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${
                        type === "expense"
                          ? "bg-white shadow text-red-600 dark:bg-zinc-800 dark:text-red-400"
                          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      {t("transaction.expense")}
                    </button>
                    <button
                      role="tab"
                      aria-selected={type === "income"}
                      onClick={() => setType("income")}
                      className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${
                        type === "income"
                          ? "bg-white shadow text-green-600 dark:bg-zinc-800 dark:text-green-400"
                          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      {t("transaction.income")}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t("transaction.typeCategory")}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {categories?.map((c) => {
                        const CatIcon = (Icons[c.icon as keyof typeof Icons] ||
                          Icons.HelpCircle) as React.ElementType<{ className?: string }>;
                        const isSelected = categoryId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCategoryId(c.id)}
                            aria-pressed={isSelected}
                            className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all hover:bg-muted/50 active:scale-[0.98] ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                                : "bg-card text-muted-foreground"
                            }`}
                          >
                            <CatIcon className="h-5 w-5 mb-1" />
                            <span className="text-[11px] font-medium text-center line-clamp-1 w-full">
                              {c.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t("transaction.typeWallet")}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {wallets?.map((w) => {
                        const WalIcon = (Icons[w.icon as keyof typeof Icons] ||
                          Icons.Wallet) as React.ComponentType<{ className?: string }>;
                        const isSelected = walletId === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setWalletId(w.id)}
                            aria-pressed={isSelected}
                            className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all hover:bg-muted/50 active:scale-[0.98] ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                                : "bg-card text-muted-foreground"
                            }`}
                          >
                            <WalIcon className="h-5 w-5 mb-1" />
                            <span className="text-[11px] font-medium text-center line-clamp-2 w-full leading-tight">
                              {w.name}
                            </span>
                            <span
                              className={`text-[10px] font-medium text-center line-clamp-2 w-full mt-0.5 ${
                                isSelected ? "text-primary/80" : "text-muted-foreground"
                              }`}
                            >
                              {formatCurrencyRaw(w.current_balance)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="editTransactionDate" className="text-xs font-medium text-zinc-500">
                        {t("transaction.date")}
                      </label>
                      <input
                        id="editTransactionDate"
                        type="datetime-local"
                        className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="editTransactionNotes" className="text-xs font-medium text-zinc-500">
                        {t("transaction.notes")}
                      </label>
                      <input
                        id="editTransactionNotes"
                        type="text"
                        className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
                        placeholder={t("transaction.notesPlaceholder")}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-2 pb-6">
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 p-3.5 text-sm font-medium text-red-600 transition-all hover:bg-red-100 active:scale-[0.98] dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                      <Icons.Trash2 className="h-4 w-4" />
                      {t("common.delete")} {t("transaction.type").toLowerCase()}
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t bg-background px-4 pt-2 pb-4">
                <div className="flex flex-col items-center justify-center pb-3">
                  <span className="text-xs font-medium text-muted-foreground mb-1">
                    {t("transaction.amountLabel")}
                  </span>
                  <h2
                    aria-live="polite"
                    aria-atomic="true"
                    className={`text-3xl font-bold tracking-tight ${
                      type === "income" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {formatCurrencyRaw(parseInt(amountStr || "0", 10))}
                  </h2>
                </div>
                <CustomNumpad
                  value={amountStr}
                  onChange={setAmountStr}
                  onSubmit={handleUpdate}
                  disabled={isSubmitting}
                  submitLabel={t("transaction.updateTransaction")}
                  ariaLabelNumber={(n) => `${n}`}
                  ariaLabelDelete={t("common.delete")}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <TransactionDeleteDialog
        transaction={transaction}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => onOpenChange(false)}
      />

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
                executeUpdate(pendingTransaction.amount, pendingTransaction.notes);
              }
            }} disabled={isSubmitting}>
              {t("transaction.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
