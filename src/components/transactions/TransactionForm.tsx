"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { CustomNumpad } from "./CustomNumpad";
import * as Icons from "lucide-react";
import { toast } from "sonner";

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

  const wallets = useLiveQuery(() => db.wallets.toArray());
  const categories = useLiveQuery(() => 
    db.categories.where("type").equals(type).toArray()
  , [type]);

  const handleSubmit = async () => {
    const amount = parseInt(amountStr, 10);
    if (amount <= 0) return toast.error("Masukkan nominal yang valid");
    if (!walletId) return toast.error("Pilih dompet");
    if (!categoryId) return toast.error("Pilih kategori");

    try {
      // Local Ledger Logic - Task 2.4
      await db.transaction('rw', db.transactions, db.wallets, async () => {
        const wallet = await db.wallets.get(walletId);
        if (!wallet) throw new Error("Wallet not found");

        // Record transaction
        await db.transactions.add({
          id: crypto.randomUUID(),
          wallet_id: walletId,
          category_id: categoryId,
          type,
          amount,
          date: new Date(transactionDate).getTime(),
          notes,
          sync_status: 'pending'
        });

        // Update Wallet Balance
        const newBalance = type === 'income' 
          ? wallet.current_balance + amount 
          : wallet.current_balance - amount;

        await db.wallets.update(walletId, {
          current_balance: newBalance,
          updated_at: Date.now()
        });
      });

      // Reset form
      setAmountStr("0");
      setNotes("");
      setTransactionDate(() => {
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
      });
      toast.success("Transaksi berhasil disimpan!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan transaksi");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="space-y-6 flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Type Toggle */}
        <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900 mx-2 mt-2">
          <button
            onClick={() => setType('expense')}
            className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all ${type === 'expense' ? 'bg-white shadow text-red-600 dark:bg-zinc-800 dark:text-red-400' : 'text-zinc-500'}`}
          >
            Pengeluaran
          </button>
          <button
            onClick={() => setType('income')}
            className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all ${type === 'income' ? 'bg-white shadow text-green-600 dark:bg-zinc-800 dark:text-green-400' : 'text-zinc-500'}`}
          >
            Pemasukan
          </button>
        </div>

        {/* Quick Pickers */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">1. Pilih Jenis Transaksi (Kategori)</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-2">
              {categories?.map(c => {
                // @ts-ignore
                const Icon = Icons[c.icon] || Icons.HelpCircle;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-colors ${categoryId === c.id ? 'border-primary bg-primary/10 text-primary' : 'bg-card text-muted-foreground'}`}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-medium text-center line-clamp-1 w-full">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">2. Pilih Sumber Uang (Dompet)</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-2">
              {wallets?.map(w => {
                // @ts-ignore
                const Icon = Icons[w.icon] || Icons.Wallet;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWalletId(w.id)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-colors ${walletId === w.id ? 'border-primary bg-primary/10 text-primary' : 'bg-card text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-medium text-center line-clamp-1 w-full">{w.name}</span>
                    <span className={`text-[9px] font-medium text-center line-clamp-1 w-full mt-0.5 ${walletId === w.id ? 'text-primary/80' : 'text-muted-foreground'}`}>
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
            <label className="text-xs font-medium text-zinc-500">3. Waktu Transaksi</label>
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

      <div className="shrink-0 border-t pt-2 pb-2 bg-background z-10 mt-2">
        {/* Amount Display */}
        <div className="flex flex-col items-center justify-center pb-4">
          <span className="text-xs font-medium text-muted-foreground mb-1">4. Masukkan Nominal</span>
          <h2 className={`text-4xl font-bold tracking-tight ${type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
            Rp {parseInt(amountStr || "0", 10).toLocaleString("id-ID")}
          </h2>
        </div>
        <CustomNumpad value={amountStr} onChange={setAmountStr} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
