"use client";

import { useState, useEffect } from "react";
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

interface TransactionEditSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionEditSheet({
  transaction,
  open,
  onOpenChange,
}: TransactionEditSheetProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amountStr, setAmountStr] = useState("0");
  const [categoryId, setCategoryId] = useState<string>("");
  const [walletId, setWalletId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const wallets = useLiveQuery(() => db.wallets.toArray());
  const categories = useLiveQuery(() =>
    db.categories.where("type").equals(type).toArray(),
    [type]
  );

  // Pre-fill form when transaction changes
  useEffect(() => {
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
  }, [transaction, open]);

  const handleUpdate = async () => {
    if (!transaction) return;

    const amount = parseInt(amountStr, 10);
    if (amount <= 0) return toast.error("Masukkan nominal yang valid");
    if (!walletId) return toast.error("Pilih dompet");
    if (!categoryId) return toast.error("Pilih kategori");

    try {
      await db.transaction("rw", db.transactions, db.wallets, async () => {
        // 1. Reverse old transaction effect on old wallet
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

        // 2. Apply new transaction effect on new wallet
        const newWallet =
          walletId === transaction.wallet_id
            ? await db.wallets.get(walletId) // Re-fetch after update
            : await db.wallets.get(walletId);

        if (newWallet) {
          // If same wallet, the balance was already reversed above, so re-fetch
          const currentBalance =
            walletId === transaction.wallet_id
              ? (await db.wallets.get(walletId))!.current_balance
              : newWallet.current_balance;

          const newBalance =
            type === "income"
              ? currentBalance + amount
              : currentBalance - amount;

          await db.wallets.update(walletId, {
            current_balance: newBalance,
            updated_at: Date.now(),
          });
        }

        // 3. Update the transaction record
        await db.transactions.update(transaction.id, {
          wallet_id: walletId,
          category_id: categoryId,
          type,
          amount,
          date: new Date(transactionDate).getTime(),
          notes,
          sync_status: "pending",
        });
      });

      toast.success("Transaksi berhasil diperbarui");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memperbarui transaksi");
    }
  };

  const isLoading = !wallets || !categories;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="!h-[96vh] rounded-t-2xl p-0 overflow-hidden flex flex-col md:max-w-md md:mx-auto">
          <SheetHeader className="px-4 pt-5 pb-2 shrink-0">
            <SheetTitle>Edit Transaksi</SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : (
            <>
              {/* Scrollable form area */}
              <div className="flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="space-y-5 px-4">
                  {/* Type Toggle */}
                  <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
                    <button
                      onClick={() => setType("expense")}
                      className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${
                        type === "expense"
                          ? "bg-white shadow text-red-600 dark:bg-zinc-800 dark:text-red-400"
                          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      Pengeluaran
                    </button>
                    <button
                      onClick={() => setType("income")}
                      className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${
                        type === "income"
                          ? "bg-white shadow text-green-600 dark:bg-zinc-800 dark:text-green-400"
                          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      Pemasukan
                    </button>
                  </div>

                  {/* Category Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Kategori
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {categories?.map((c) => {
                        const CatIcon = (Icons[c.icon as keyof typeof Icons] ||
                          Icons.HelpCircle) as React.ComponentType<{ className?: string }>;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCategoryId(c.id)}
                            className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all hover:bg-muted/50 active:scale-[0.98] ${
                              categoryId === c.id
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

                  {/* Wallet Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Dompet
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {wallets?.map((w) => {
                        const WalIcon = (Icons[w.icon as keyof typeof Icons] ||
                          Icons.Wallet) as React.ComponentType<{ className?: string }>;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setWalletId(w.id)}
                            className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all hover:bg-muted/50 active:scale-[0.98] ${
                              walletId === w.id
                                ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                                : "bg-card text-muted-foreground"
                            }`}
                          >
                            <WalIcon className="h-5 w-5 mb-1" />
                            <span className="text-[11px] font-medium text-center line-clamp-1 w-full">
                              {w.name}
                            </span>
                            <span
                              className={`text-[10px] font-medium text-center line-clamp-1 w-full mt-0.5 ${
                                walletId === w.id
                                  ? "text-primary/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Rp {w.current_balance.toLocaleString("id-ID")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date & Notes */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-500">
                        Waktu Transaksi
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-500">
                        Catatan (Opsional)
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
                        placeholder="Makan siang..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Delete Button */}
                  <div className="pt-2 pb-6">
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 p-3.5 text-sm font-medium text-red-600 transition-all hover:bg-red-100 active:scale-[0.98] dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                      <Icons.Trash2 className="h-4 w-4" />
                      Hapus Transaksi
                    </button>
                  </div>
                </div>
              </div>

              {/* Fixed numpad area at bottom */}
              <div className="shrink-0 border-t bg-background px-4 pt-2 pb-4">
                {/* Amount Display */}
                <div className="flex flex-col items-center justify-center pb-3">
                  <span className="text-xs font-medium text-muted-foreground mb-1">
                    Nominal
                  </span>
                  <h2
                    className={`text-3xl font-bold tracking-tight ${
                      type === "income" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    Rp{" "}
                    {parseInt(amountStr || "0", 10).toLocaleString("id-ID")}
                  </h2>
                </div>
                <CustomNumpad
                  value={amountStr}
                  onChange={setAmountStr}
                  onSubmit={handleUpdate}
                  submitLabel="Update Transaksi"
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
    </>
  );
}
