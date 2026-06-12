"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { RevealStagger } from "@/components/ui/RevealStagger";

export function DebtList() {
  const debts = useLiveQuery(() => db.debt_loans.toArray());
  const wallets = useLiveQuery(() => db.wallets.toArray());
  const [selectedWallet, setSelectedWallet] = useState<string>("");

  const handleRepay = async (debtId: string, remainingAmount: number, type: 'debt' | 'loan') => {
    if (!selectedWallet) return toast.error("Pilih dompet untuk transaksi ini terlebih dahulu di bawah");
    
    // Repayment logic (Task 3.3)
    try {
      await db.transaction('rw', db.transactions, db.wallets, db.debt_loans, async () => {
        const wallet = await db.wallets.get(selectedWallet);
        if (!wallet) throw new Error("Wallet not found");

        const debt = await db.debt_loans.get(debtId);
        if (!debt) throw new Error("Debt not found");

        // Create transaction
        await db.transactions.add({
          id: crypto.randomUUID(),
          wallet_id: selectedWallet,
          category_id: "system-repayment", // We'd ideally need a system category for this
          type: type === 'debt' ? 'expense' : 'income',
          amount: remainingAmount,
          date: Date.now(),
          notes: `Pelunasan ${type === 'debt' ? 'Hutang ke' : 'Piutang dari'} ${debt.person_name}`,
          sync_status: 'pending'
        });

        // Update Wallet
        const newBalance = type === 'debt' 
          ? wallet.current_balance - remainingAmount 
          : wallet.current_balance + remainingAmount;

        await db.wallets.update(selectedWallet, {
          current_balance: newBalance,
          updated_at: Date.now()
        });

        // Update Debt
        await db.debt_loans.update(debtId, {
          remaining_amount: 0,
          status: 'paid'
        });
      });
      toast.success("Pembayaran tercatat");
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan.");
    }
  };

  const isLoading = !debts || !wallets;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 w-full rounded-xl bg-muted/60" />
        <div className="h-32 w-full rounded-xl bg-muted/60" />
        <div className="h-32 w-full rounded-xl bg-muted/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <label className="text-xs font-medium text-muted-foreground block mb-2">Pilih Dompet untuk Pembayaran</label>
        <Select value={selectedWallet} onValueChange={setSelectedWallet}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih Dompet..." />
          </SelectTrigger>
          <SelectContent>
            {wallets?.map(w => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <RevealStagger className="space-y-4">
          {debts?.map(debt => (
            <div key={debt.id} className="rounded-xl border bg-card p-4 shadow-sm flex flex-col space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className={`text-xs font-bold uppercase ${debt.type === 'debt' ? 'text-red-500' : 'text-green-500'}`}>
                  {debt.type === 'debt' ? 'Hutang Saya' : 'Piutang Orang'}
                </span>
                <p className="font-semibold text-lg">{debt.person_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Sisa</p>
                <p className="font-bold tabular-nums">Rp {debt.remaining_amount.toLocaleString("id-ID")}</p>
              </div>
            </div>
            
            {debt.status === 'active' ? (
              <Button 
                onClick={() => handleRepay(debt.id, debt.remaining_amount, debt.type)}
                className="w-full tabular-nums active:scale-[0.98] transition-transform"
              >
                Bayar Lunas (Rp {debt.remaining_amount.toLocaleString("id-ID")})
              </Button>
            ) : (
              <div className="rounded bg-green-100 text-green-600 text-center py-2 text-sm font-bold dark:bg-green-900/30 dark:text-green-400">
                LUNAS
              </div>
            )}
          </div>
        ))}
        </RevealStagger>

        {debts?.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-50 p-10 text-center dark:bg-zinc-900/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <Users className="h-6 w-6" />
            </div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">Belum ada catatan</p>
            <p className="mt-1 text-sm text-zinc-500 max-w-[200px]">
              Catat hutang atau piutang Anda di sini
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
