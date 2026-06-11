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
      toast.success("Tersimpan!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex rounded-lg bg-secondary/30 p-1">
        <button
          type="button"
          onClick={() => setType('debt')}
          className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${type === 'debt' ? 'bg-background shadow text-red-500' : 'text-muted-foreground'}`}
        >
          Saya Ngutang
        </button>
        <button
          type="button"
          onClick={() => setType('loan')}
          className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${type === 'loan' ? 'bg-background shadow text-green-500' : 'text-muted-foreground'}`}
        >
          Saya Minjamin
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Nama Orang</label>
        <input 
          type="text"
          required
          className="w-full rounded-lg border bg-background p-2 text-sm outline-none"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Nominal (Rp)</label>
        <input 
          type="number"
          required
          className="w-full rounded-lg border bg-background p-2 text-sm outline-none"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full">Tambah</Button>
    </form>
  );
}
