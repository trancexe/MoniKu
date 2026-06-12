"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DebtForm() {
  const [type, setType] = useState<'debt' | 'loan'>('debt');
  const [personName, setPersonName] = useState("");
  const [amountStr, setAmountStr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr, 10);
    if (!personName || !amount || amount <= 0) return toast.error("Data tidak valid");

    try {
      await db.debt_loans.add({
        id: crypto.randomUUID(),
        type,
        person_name: personName,
        total_amount: amount,
        remaining_amount: amount,
        status: 'active'
      });
      setPersonName("");
      setAmountStr("");
      toast.success("Tersimpan");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setType('debt')}
          className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${type === 'debt' ? 'bg-background shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-500'}`}
        >
          Saya Ngutang
        </button>
        <button
          type="button"
          onClick={() => setType('loan')}
          className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-all active:scale-[0.98] ${type === 'loan' ? 'bg-background shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-500'}`}
        >
          Saya Minjamin
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-500">Nama Orang</label>
        <input 
          type="text"
          required
          className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-500">Nominal (Rp)</label>
        <input 
          type="number"
          required
          className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full rounded-full py-6 text-sm font-semibold active:scale-[0.98] transition-transform">Simpan Catatan</Button>
    </form>
  );
}
