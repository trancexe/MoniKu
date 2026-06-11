"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
      toast.success("Pembayaran berhasil!");
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <label className="text-xs font-medium text-muted-foreground block mb-2">Pilih Dompet untuk Pembayaran</label>
        <select 
          className="w-full rounded-lg border bg-background p-2 text-sm outline-none"
          value={selectedWallet}
          onChange={(e) => setSelectedWallet(e.target.value)}
        >
          <option value="">Pilih Dompet...</option>
          {wallets?.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
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
                <p className="font-bold">Rp {debt.remaining_amount.toLocaleString("id-ID")}</p>
              </div>
            </div>
            
            {debt.status === 'active' ? (
              <Button 
                onClick={() => handleRepay(debt.id, debt.remaining_amount, debt.type)}
                className="w-full"
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

        {debts?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Belum ada catatan hutang/piutang.</p>
        )}
      </div>
    </div>
  );
}
