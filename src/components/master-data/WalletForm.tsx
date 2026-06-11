"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import { Plus } from "lucide-react";
import * as Icons from "lucide-react";

const ICONS = [
  "Wallet", "CreditCard", "Banknote", "PiggyBank", "Coins", "Landmark", 
  "Bitcoin", "Smartphone", "Briefcase", "Gem", "Building", "Receipt", 
  "Ticket", "DollarSign", "Euro", "PoundSterling", "JapaneseYen", 
  "WalletCards", "Nfc"
];

export function WalletForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [icon, setIcon] = useState("Wallet");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance) return;

    await db.wallets.add({
      id: crypto.randomUUID(),
      name,
      icon,
      current_balance: Number(balance),
      updated_at: Date.now()
    });

    setOpen(false);
    setName("");
    setBalance("");
    setIcon("Wallet");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-8"><Plus className="mr-1 h-4 w-4" /> Tambah</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Dompet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Nama Dompet</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Misal: BCA, GoPay" />
          </div>
          <div className="space-y-2">
            <Label>Saldo Awal</Label>
            <Input required type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Ikon</Label>
            <div className="grid grid-cols-5 gap-2 mt-2 max-h-[200px] overflow-y-auto p-1">
              {ICONS.map(i => {
                const Icon = (Icons as any)[i];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border ${icon === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
