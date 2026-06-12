"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { db, Transaction } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useT, useFormatLocale } from "@/lib/i18n";

interface TransactionDeleteDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function TransactionDeleteDialog({
  transaction,
  open,
  onOpenChange,
  onDeleted,
}: TransactionDeleteDialogProps) {
  const t = useT();
  const { formatDateTime, formatCurrencyRaw } = useFormatLocale();
  const categories = useLiveQuery(() => db.categories.toArray());
  const category = categories?.find((c) => c.id === transaction?.category_id);
  const Icon = category?.icon
    ? ((Icons[category.icon as keyof typeof Icons] || Icons.CircleDollarSign) as React.ComponentType<{ className?: string }>)
    : (Icons.CircleDollarSign as React.ComponentType<{ className?: string }>);

  const handleDelete = async () => {
    if (!transaction) return;

    try {
      await db.transaction("rw", db.transactions, db.wallets, async () => {
        const wallet = await db.wallets.get(transaction.wallet_id);
        if (wallet) {
          const newBalance =
            transaction.type === "income"
              ? wallet.current_balance - transaction.amount
              : wallet.current_balance + transaction.amount;

          await db.wallets.update(transaction.wallet_id, {
            current_balance: newBalance,
            updated_at: Date.now(),
          });
        }

        await db.transactions.delete(transaction.id);
      });

      toast.success(t("transaction.deleted"));
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(t("transaction.deleteFailed"));
    }
  };

  if (!transaction) return null;

  const isIncome = transaction.type === "income";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("transaction.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("transaction.deleteConfirmDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isIncome
                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{category?.name || t("transaction.categoryOther")}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(transaction.date)}
              {transaction.notes ? ` • ${transaction.notes}` : ""}
            </p>
          </div>
          <div
            className={`shrink-0 font-semibold tabular-nums text-sm ${
              isIncome ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            }`}
          >
            {isIncome ? "+" : "-"}{formatCurrencyRaw(transaction.amount)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Icons.Trash2 className="mr-1.5 h-4 w-4" />
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
