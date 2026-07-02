"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Wallet } from "@/lib/db";
import * as Icons from "lucide-react";
import { WalletForm } from "./WalletForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RevealStagger } from "@/components/ui/RevealStagger";
import { useT, useFormatLocale } from "@/lib/i18n";
import { toast } from "sonner";

export function WalletList() {
  const t = useT();
  const { formatCurrencyRaw } = useFormatLocale();
  const wallets = useLiveQuery(() => db.wallets.toArray());

  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [deletingWallet, setDeletingWallet] = useState<Wallet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const txCount = useLiveQuery(
    () => deletingWallet ? db.transactions.where("wallet_id").equals(deletingWallet.id).count() : 0,
    [deletingWallet?.id]
  );

  const handleDeleteWallet = async () => {
    if (!deletingWallet) return;
    setIsSubmitting(true);
    try {
      await db.wallets.delete(deletingWallet.id);
      toast.success(t("wallet.deleted"));
      setDeletingWallet(null);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(t("wallet.deleteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!wallets) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true">
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 rounded bg-muted/60" />
          <div className="h-8 w-24 rounded bg-muted/60" />
        </div>
        <div className="grid gap-3">
          {[1,2,3].map(i => <div key={i} className="h-16 w-full rounded-xl bg-muted/60" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("wallet.title")}</h3>
        <WalletForm key="create-wallet" />
      </div>

      <div className="grid gap-3">
        <RevealStagger className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {wallets?.map((wallet) => {
            const Icon = (Icons[wallet.icon as keyof typeof Icons] || Icons.Wallet) as React.ElementType;
            return (
              <div key={wallet.id} className="flex flex-col items-center justify-center space-y-2 rounded-xl border bg-card p-3 shadow-sm text-center relative pt-4">
                <div className="absolute top-1 right-1 flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => setEditingWallet(wallet)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-60 hover:opacity-100 hover:bg-muted"
                    aria-label={t("common.edit")}
                  >
                    <Icons.Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingWallet(wallet)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-60 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={t("common.delete")}
                  >
                    <Icons.Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-center w-full px-1">
                  <span className="text-xs font-medium line-clamp-1 break-all">{wallet.name}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums line-clamp-1">{formatCurrencyRaw(wallet.current_balance)}</span>
                </div>
              </div>
            );
          })}
        </RevealStagger>
        {wallets?.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-50 p-10 text-center dark:bg-zinc-900/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <Icons.Wallet className="h-6 w-6" />
            </div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{t("wallet.empty")}</p>
          </div>
        )}
      </div>

      <WalletForm
        key={editingWallet?.id ?? "edit-wallet"}
        wallet={editingWallet}
        open={editingWallet !== null}
        onOpenChange={(o) => { if (!o) setEditingWallet(null); }}
      />

      <ConfirmDialog
        open={deletingWallet !== null}
        onOpenChange={(o) => { if (!o) setDeletingWallet(null); }}
        title={t("wallet.deleteTitle")}
        description={
          <div className="space-y-2">
            <p>{deletingWallet ? `${deletingWallet.name} — ${formatCurrencyRaw(deletingWallet.current_balance)}` : ""}</p>
            {txCount && txCount > 0 ? (
              <p className="text-xs text-muted-foreground">{t("wallet.deleteDescWithCount", { count: txCount })}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("wallet.deleteDesc")}</p>
            )}
          </div>
        }
        confirmLabel={t("common.delete")}
        onConfirm={handleDeleteWallet}
        loading={isSubmitting}
      />
    </div>
  );
}
