"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { CustomNumpad } from "./CustomNumpad";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const transactionSchema = z.object({
  amount: z.number().positive("Nominal harus lebih dari 0").max(1000000000000, "Nominal maksimal adalah 1 Triliun"),
  notes: z.string().max(100, "Catatan maksimal 100 karakter").optional(),
});

export function TransactionForm() {
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

  const wallets = useLiveQuery(() => db.wallets.toArray());
  const categories = useLiveQuery(() => 
    db.categories.where("type").equals(type).toArray()
  , [type]);

  const executeTransaction = async (amount: number, parsedNotes: string) => {
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
      toast.success("Transaksi tersimpan");
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error("Gagal menyimpan transaksi");
    } finally {
      setIsWarningOpen(false);
      setPendingTransaction(null);
    }
  };

  const handleSubmit = async () => {
    const rawAmount = parseInt(amountStr, 10);
    
    const parsed = transactionSchema.safeParse({ amount: rawAmount, notes });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }
    const amount = parsed.data.amount;

    if (!walletId) return toast.error("Pilih dompet");
    if (!categoryId) return toast.error("Pilih kategori");

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
      toast.error("Gagal memvalidasi transaksi");
    }
  };

  const isLoading = !wallets || !categories;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full space-y-6 p-4">
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
      <div className="flex-1 overflow-y-auto pb-[380px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-6 p-2">
          {/* Type Toggle */}
          <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900 mx-2 mt-2">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${type === 'expense' ? 'bg-white shadow text-red-600 dark:bg-zinc-800 dark:text-red-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Pengeluaran
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${type === 'income' ? 'bg-white shadow text-green-600 dark:bg-zinc-800 dark:text-green-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Pemasukan
            </button>
          </div>

          {/* Quick Pickers */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Pilih Jenis Transaksi (Kategori)</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-2">
                {categories?.map(c => {
                  const Icon = (Icons[c.icon as keyof typeof Icons] || Icons.HelpCircle) as React.ElementType;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all hover:bg-muted/50 active:scale-[0.98] ${categoryId === c.id ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20' : 'bg-card text-muted-foreground'}`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-[11px] font-medium text-center line-clamp-1 w-full">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Pilih Sumber Uang (Dompet)</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-2">
                {wallets?.map(w => {
                  const Icon = (Icons[w.icon as keyof typeof Icons] || Icons.Wallet) as React.ElementType;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWalletId(w.id)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all hover:bg-muted/50 active:scale-[0.98] ${walletId === w.id ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20' : 'bg-card text-muted-foreground'}`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-[11px] font-medium text-center line-clamp-1 w-full">{w.name}</span>
                      <span className={`text-[10px] font-medium text-center line-clamp-1 w-full mt-0.5 ${walletId === w.id ? 'text-primary/80' : 'text-muted-foreground'}`}>
                        Rp {w.current_balance.toLocaleString("id-ID")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4 px-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500">Waktu Transaksi</label>
              <input 
                type="datetime-local"
                className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500">Catatan (Opsional)</label>
              <input 
                type="text"
                className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
                placeholder="Makan siang..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed numpad section - stays above bottom nav */}
      <div className="fixed bottom-24 left-0 right-0 z-40 md:max-w-md md:mx-auto">
        <div className="border-t pt-2 pb-2 bg-background px-4">
          {/* Amount Display */}
          <div className="flex flex-col items-center justify-center pb-4">
            <span className="text-xs font-medium text-muted-foreground mb-1">Masukkan Nominal</span>
            <h2 className={`text-4xl font-bold tracking-tight ${type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
              Rp {parseInt(amountStr || "0", 10).toLocaleString("id-ID")}
            </h2>
          </div>
          <CustomNumpad value={amountStr} onChange={setAmountStr} onSubmit={handleSubmit} />
        </div>
      </div>

      <Dialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Peringatan Saldo</DialogTitle>
            <DialogDescription>
              Transaksi ini akan membuat saldo dompet menjadi negatif. Apakah Anda yakin ingin melanjutkan?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsWarningOpen(false);
              setPendingTransaction(null);
            }}>
              Batal
            </Button>
            <Button variant="destructive" onClick={() => {
              if (pendingTransaction) {
                executeTransaction(pendingTransaction.amount, pendingTransaction.notes);
              }
            }}>
              Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
