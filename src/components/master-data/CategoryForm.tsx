"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/db";
import { Plus } from "lucide-react";
import * as Icons from "lucide-react";

const EXPENSE_ICONS = [
  "Coffee", "ShoppingCart", "Utensils", "Car", "Home", "HeartPulse", "Plane", 
  "Gift", "Smartphone", "Monitor", "Bus", "Train", "Fuel", "Zap", "Droplet", 
  "Wifi", "Tv", "Music", "Film", "Book", "GraduationCap", "Baby", "Dog", 
  "Cat", "Pill", "Stethoscope", "Dumbbell", "Scissors", "Shirt", "Smile", 
  "Gamepad2", "Ticket", "Wrench", "Hammer"
];

const INCOME_ICONS = [
  "Briefcase", "TrendingUp", "Award", "Gift", "Banknote", "Building", 
  "Wallet", "LineChart", "PieChart", "Landmark", "Coins", "DollarSign", 
  "HandCoins", "PiggyBank", "BadgeDollar", "Gem", "Bitcoin"
];

export function CategoryForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [icon, setIcon] = useState("Coffee");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    await db.categories.add({
      id: crypto.randomUUID(),
      name,
      type,
      icon,
    });

    setOpen(false);
    setName("");
    setType("expense");
    setIcon("Coffee");
  };

  const currentIcons = type === "expense" ? EXPENSE_ICONS : INCOME_ICONS;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-8"><Plus className="mr-1 h-4 w-4" /> Tambah</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Kategori</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Tipe</Label>
            <Select value={type} onValueChange={(val: any) => { setType(val); setIcon(val === "expense" ? "Coffee" : "Briefcase"); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Pengeluaran</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nama Kategori</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Misal: Makanan, Gaji" />
          </div>
          <div className="space-y-2">
            <Label>Ikon</Label>
            <div className="grid grid-cols-5 gap-2 mt-2 max-h-[200px] overflow-y-auto p-1">
              {currentIcons.map(i => {
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
