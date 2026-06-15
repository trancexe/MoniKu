"use client";

import { useState, useEffect } from "react";
import { db, Transaction, DebtLoan } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT, useFormatLocale } from "@/lib/i18n";
import { recalculateDebt } from "@/lib/debt-utils";
import dayjs from "dayjs";
import { X, Search } from "lucide-react";

interface RepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtLoan;
}

export function RepaymentModal({ isOpen, onClose, debt }: RepaymentModalProps) {
  const t = useT();
  const { formatCurrencyRaw } = useFormatLocale();
  const [activeTab, setActiveTab] = useState<"new" | "link">("new");

  // New Payment State
  const [wallets, setWallets] = useState<{ id: string; name: string; current_balance: number }[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [amountStr, setAmountStr] = useState(debt.remaining_amount.toString());
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DDTHH:mm"));
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Link Existing State
  const [linkableTransactions, setLinkableTransactions] = useState<Transaction[]>([]);
  const [daysToLoad, setDaysToLoad] = useState(30);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => setAmountStr(debt.remaining_amount.toString()));
      setDate(dayjs().format("YYYY-MM-DDTHH:mm"));
      db.wallets.toArray().then(setWallets);
    }
  }, [isOpen, debt.remaining_amount]);

  useEffect(() => {
    const loadLinkableTransactions = async () => {
      try {
        const since = dayjs().subtract(daysToLoad, "day").valueOf();
        const matchingType = debt.type === "debt" ? "expense" : "income";
        
        const txs = await db.transactions
          .where("date")
          .aboveOrEqual(since)
          .reverse()
          .toArray();

        const validTxs = txs.filter(tx => 
          tx.type === matchingType && 
          !tx.debt_id &&
          tx.category_id !== "system-transfer"
        );

        setLinkableTransactions(validTxs);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") console.error(error);
        toast.error(t("debt.modal.loadFailed"));
      } finally {
        setIsLoadingLinks(false);
      }
    };

    if (isOpen && activeTab === "link") {
      queueMicrotask(() => {
        setIsLoadingLinks(true);
        loadLinkableTransactions();
      });
    }
  }, [isOpen, activeTab, daysToLoad, debt.type, t]);

  const handleNewPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedWallet) return toast.error(t("transaction.selectWallet"));

    const rawAmount = parseInt(amountStr, 10);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      return toast.error(t("validation.amountPositive"));
    }

    if (rawAmount > debt.remaining_amount) {
      toast.info(t("debt.detail.overpaidWarning"));
    }

    setIsSubmitting(true);
    try {
      await db.transaction("rw", db.transactions, db.wallets, async () => {
        const wallet = await db.wallets.get(selectedWallet);
        if (!wallet) throw new Error("Wallet not found");

        await db.transactions.add({
          id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)),
          wallet_id: selectedWallet,
          category_id: "system-repayment",
          type: debt.type === "debt" ? "expense" : "income",
          amount: rawAmount,
          date: new Date(date).getTime(),
          notes: notes || `Pelunasan ${debt.type === 'debt' ? 'Hutang ke' : 'Piutang dari'} ${debt.person_name}`,
          sync_status: "pending",
          debt_id: debt.id,
        });

        const newBalance = debt.type === "debt"
          ? wallet.current_balance - rawAmount
          : wallet.current_balance + rawAmount;

        await db.wallets.update(selectedWallet, {
          current_balance: newBalance,
          updated_at: Date.now(),
        });
      });

      await recalculateDebt(debt.id);
      toast.success(t("debt.modal.createSuccess"));
      onClose();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error(error);
      toast.error(t("transaction.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkTransaction = async (txId: string) => {
    try {
      await db.transactions.update(txId, { debt_id: debt.id });
      await recalculateDebt(debt.id);
      toast.success(t("debt.modal.linkSuccess"));
      onClose();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error(error);
      toast.error(t("common.error"));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-h-[90vh] overflow-y-auto bg-background sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">{t("debt.modal.title")}</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900 mb-6">
            <button
              onClick={() => setActiveTab("new")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                activeTab === "new" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("debt.modal.tabNew")}
            </button>
            <button
              onClick={() => setActiveTab("link")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                activeTab === "link" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("debt.modal.tabLink")}
            </button>
          </div>

          {activeTab === "new" && (
            <form onSubmit={handleNewPaymentSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("debt.modal.amountLabel")}</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-primary"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("transaction.date")}</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-primary"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("transaction.typeWallet")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
                  {wallets.map(w => {
                    const isSelected = selectedWallet === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSelectedWallet(w.id)}
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

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("transaction.notes")}</label>
                <input
                  type="text"
                  className="w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-primary"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("transaction.notesPlaceholder")}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl">
                  {t("common.save")}
                </Button>
              </div>
            </form>
          )}

          {activeTab === "link" && (
            <div className="space-y-4">
              {isLoadingLinks ? (
                <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
              ) : linkableTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <Search className="h-8 w-8 mx-auto opacity-50" />
                  <p className="text-sm">{t("debt.modal.noLinkable")}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {linkableTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{formatCurrencyRaw(tx.amount)}</p>
                        <p className="text-xs text-muted-foreground">{dayjs(tx.date).format("DD MMM YYYY, HH:mm")} • {tx.notes}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => handleLinkTransaction(tx.id)}>
                        {t("debt.modal.link")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setDaysToLoad(d => d + 30)}
                disabled={isLoadingLinks}
              >
                {t("debt.modal.loadOlder")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
