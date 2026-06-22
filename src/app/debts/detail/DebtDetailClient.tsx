"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction } from "@/lib/db";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Trash2, Pencil, ArrowUpRight, ArrowDownLeft, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, useFormatLocale } from "@/lib/i18n";
import dayjs from "dayjs";
import { RepaymentModal } from "@/components/debts/RepaymentModal";
import { TransactionEditSheet } from "@/components/transactions/TransactionEditSheet";
import { DebtEditSheet } from "@/components/debts/DebtEditSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useState } from "react";
import { toast } from "sonner";
import { recalculateDebt } from "@/lib/debt-utils";
import { RevealStagger } from "@/components/ui/RevealStagger";
import Link from "next/link";

export function DebtDetailClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const t = useT();
  const { formatCurrencyRaw } = useFormatLocale();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteDebtOpen, setDeleteDebtOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<string | null>(null);

  const debt = useLiveQuery(() => {
    if (!id) return undefined;
    return db.debt_loans.get(id);
  }, [id]);
  const linkedTransactions = useLiveQuery(
    async () => {
      if (!id) return [];
      const txs = await db.transactions.where("debt_id").equals(id).toArray();
      return txs.sort((a, b) => b.date - a.date);
    },
    [id]
  );

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-4 text-center">
        <ReceiptText className="h-12 w-12 text-muted-foreground opacity-50" />
        <p className="font-medium">{t("debt.detail.notFound")}</p>
        <Link href="/debts">
          <Button variant="outline">{t("debt.detail.back")}</Button>
        </Link>
      </div>
    );
  }

  const handleUnlink = async (txId: string) => {
    try {
      await db.transactions.update(txId, { debt_id: undefined });
      if (id) await recalculateDebt(id);
      toast.success(t("debt.modal.unlinkSuccess"));
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("Unlink failed", error);
      toast.error(t("debt.modal.unlinkFailed"));
    } finally {
      setUnlinkTarget(null);
    }
  };

  const handleDeleteDebt = async () => {
    try {
      const txs = await db.transactions.where("debt_id").equals(id).toArray();
      await db.transaction('rw', db.transactions, db.debt_loans, async () => {
        for (const tx of txs) {
          await db.transactions.update(tx.id, { debt_id: undefined });
        }
        await db.debt_loans.delete(id);
      });
      toast.success(t("common.deleted"));
      router.push("/debts");
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("Delete failed", error);
      toast.error(t("common.deleteFailed"));
    } finally {
      setDeleteDebtOpen(false);
    }
  };

  if (debt === undefined || linkedTransactions === undefined) {
    return (
      <div className="flex flex-col p-4 space-y-4 animate-pulse" aria-busy="true">
        <div className="h-10 w-32 bg-muted/60 rounded-xl" />
        <div className="h-40 w-full bg-muted/60 rounded-xl" />
        <div className="h-40 w-full bg-muted/60 rounded-xl" />
      </div>
    );
  }

  if (debt === null) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-4 text-center">
        <ReceiptText className="h-12 w-12 text-muted-foreground opacity-50" />
        <p className="font-medium">{t("debt.detail.notFound")}</p>
        <Link href="/debts">
          <Button variant="outline">{t("debt.detail.back")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 space-y-6 pb-36">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/debts">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">{t("debt.detail.title")}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditSheetOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label={t("common.edit")}
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteDebtOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            aria-label={t("common.delete")}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Debt Info Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className={`flex items-center text-xs font-bold uppercase ${debt.type === 'debt' ? 'text-red-500' : 'text-green-500'}`}>
                {debt.type === 'debt' ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownLeft className="h-4 w-4 mr-1" />}
                {debt.type === 'debt' ? t("debt.type_debt_label") : t("debt.type_loan_label")}
              </span>
            </div>
            <h2 className="text-2xl font-bold">{debt.person_name}</h2>
          </div>
          {debt.status === "paid" && (
            <div className="rounded-full px-3 py-1 bg-green-100 text-green-700 text-xs font-bold dark:bg-green-900/40 dark:text-green-400">
              {t("debt.paid")}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t("debt.detail.totalAmount")}</p>
            <p className="font-semibold tabular-nums">{formatCurrencyRaw(debt.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t("debt.detail.remainingAmount")}</p>
            <p className="font-bold tabular-nums text-lg">{formatCurrencyRaw(debt.remaining_amount)}</p>
          </div>
        </div>

        {debt.status === "active" && (
          <Button
            className="w-full rounded-xl py-6 active:scale-[0.98] transition-transform font-semibold"
            onClick={() => setIsModalOpen(true)}
          >
            {t("debt.detail.pay")}
          </Button>
        )}
      </div>

      {/* Payment History */}
      <section className="space-y-4">
        <h3 className="font-semibold px-2">{t("debt.detail.paymentHistory")}</h3>

        {linkedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-50 p-8 text-center dark:bg-zinc-900/50">
            <ReceiptText className="h-8 w-8 text-zinc-400 mb-3" />
            <p className="text-sm text-zinc-500">{t("debt.detail.noPayments")}</p>
          </div>
        ) : (
          <RevealStagger className="space-y-3">
            {linkedTransactions.map(tx => (
              <button
                key={tx.id}
                type="button"
                onClick={() => { setSelectedTransaction(tx); setEditOpen(true); }}
                className="w-full text-left rounded-xl border bg-card p-4 flex flex-col space-y-3 cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold tabular-nums">{formatCurrencyRaw(tx.amount)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dayjs(tx.date).format("DD MMM YYYY, HH:mm")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8"
                    onClick={(e) => { e.stopPropagation(); setUnlinkTarget(tx.id); }}
                  >
                    {t("debt.detail.unlink")}
                  </Button>
                </div>
                {tx.notes && (
                  <div className="text-sm bg-muted/40 p-2 rounded-lg text-muted-foreground">
                    {tx.notes}
                  </div>
                )}
              </button>
            ))}
          </RevealStagger>
        )}
      </section>

      <RepaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        debt={debt}
      />

      <TransactionEditSheet
        transaction={selectedTransaction}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={() => { if (id) void recalculateDebt(id); }}
      />

      <DebtEditSheet
        key={debt?.id || 'edit'}
        debt={debt}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
      />

      <ConfirmDialog
        open={deleteDebtOpen}
        onOpenChange={setDeleteDebtOpen}
        title={t("debt.deleteTitle")}
        description={
          <div className="space-y-2">
            <p>{t("debt.deleteConfirmDesc")}</p>
            <p className="text-xs text-muted-foreground">{t("debt.deleteWithCountNote", { count: linkedTransactions?.length ?? 0 })}</p>
          </div>
        }
        confirmLabel={t("common.delete")}
        onConfirm={handleDeleteDebt}
      />

      <ConfirmDialog
        open={unlinkTarget !== null}
        onOpenChange={(o) => { if (!o) setUnlinkTarget(null); }}
        title={t("debt.detail.unlinkConfirmTitle")}
        description={t("debt.detail.unlinkConfirmDesc")}
        confirmLabel={t("debt.detail.unlink")}
        onConfirm={() => { if (unlinkTarget) return handleUnlink(unlinkTarget); }}
      />
    </div>
  );
}
