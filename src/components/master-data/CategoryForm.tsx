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
import { toast } from "sonner";
import { z } from "zod";
import { useT } from "@/lib/i18n";

export function CategoryForm() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [icon, setIcon] = useState("Coffee");

  const makeSchema = () => z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(100, t("validation.nameMax")),
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const categorySchema = makeSchema();
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }

    try {
      await db.categories.add({
        id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)),
        name: parsed.data.name,
        type,
        icon,
      });

      setOpen(false);
      setName("");
      setType("expense");
      setIcon("Coffee");
      toast.success(t("category.saved"));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(t("category.saveFailed"));
    }
  };

  const currentIcons = type === "expense" ? EXPENSE_ICONS : INCOME_ICONS;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-8"><Plus className="mr-1 h-4 w-4" /> {t("wallet.add")}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("category.addCategory")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{t("category.type")}</Label>
            <Select value={type} onValueChange={(val) => { if (val) { setType(val as "income" | "expense"); setIcon(val === "expense" ? "Coffee" : "Briefcase"); } }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">{t("category.typeExpense")}</SelectItem>
                <SelectItem value="income">{t("category.typeIncome")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("category.name")}</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder={t("category.namePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-5 gap-2 mt-2 max-h-[200px] overflow-y-auto p-1">
              {currentIcons.map(i => {
                const Icon = (Icons[i as keyof typeof Icons] || Icons.HelpCircle) as React.ElementType;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    aria-pressed={icon === i}
                    aria-label={i}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border ${icon === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit">{t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
