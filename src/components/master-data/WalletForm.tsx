"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, Wallet } from "@/lib/db";
import { Plus } from "lucide-react";
import * as Icons from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

const ICONS = [
  "Wallet", "CreditCard", "Banknote", "PiggyBank", "Coins", "Landmark",
  "Bitcoin", "Smartphone", "Briefcase", "Gem", "Building", "Receipt",
  "Ticket", "DollarSign", "Euro", "PoundSterling", "JapaneseYen",
  "WalletCards", "Nfc"
];

interface WalletFormProps {
  wallet?: Wallet | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WalletForm({ wallet, open: externalOpen, onOpenChange: externalOnOpenChange }: WalletFormProps = {}) {
  const t = useT();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen! : internalOpen;
  const setOpen = isControlled ? externalOnOpenChange! : setInternalOpen;
  const isEdit = !!wallet;

  const [name, setName] = useState(wallet?.name || "");
  const [balance, setBalance] = useState(wallet ? String(wallet.current_balance) : "");
  const [icon, setIcon] = useState(wallet?.icon || "Wallet");

  const makeSchema = () => z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(100, t("validation.nameMax")),
    balance: z.number().min(0, t("wallet.balanceNonNegative")).max(1000000000000, t("validation.amountMax")),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const walletSchema = makeSchema();
    const parsed = walletSchema.safeParse({ name, balance: Number(balance) });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }

    try {
      if (isEdit) {
        await db.wallets.update(wallet!.id, {
          name: parsed.data.name,
          icon,
          current_balance: parsed.data.balance,
          updated_at: Date.now(),
        });
        toast.success(t("wallet.updated"));
      } else {
        await db.wallets.add({
          id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)),
          name: parsed.data.name,
          icon,
          current_balance: parsed.data.balance,
          updated_at: Date.now()
        });
        toast.success(t("wallet.saved"));
      }

      setOpen(false);
      if (!isControlled) {
        setName("");
        setBalance("");
        setIcon("Wallet");
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(error);
      toast.error(isEdit ? t("wallet.saveFailed") : t("wallet.saveFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={isControlled ? setOpen : setOpen}>
      {!isControlled && (
        <DialogTrigger render={<Button variant="outline" size="sm" className="h-8"><Plus className="mr-1 h-4 w-4" /> {t("wallet.add")}</Button>} />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("wallet.editWallet") : t("wallet.addWallet")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{t("wallet.name")}</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder={t("wallet.namePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("wallet.balance")}</Label>
            <Input required type="text" inputMode="numeric" pattern="[0-9]*" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-5 gap-2 mt-2 max-h-[200px] overflow-y-auto p-1">
              {ICONS.map(i => {
                const Icon = (Icons[i as keyof typeof Icons] || Icons.Question) as React.ElementType;
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
            <Button type="submit">{isEdit ? t("common.save") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
