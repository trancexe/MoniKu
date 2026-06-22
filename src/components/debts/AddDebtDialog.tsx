"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DebtForm } from "./DebtForm";
import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n";

export function AddDebtDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-8"><Plus className="mr-1 h-4 w-4" /> {t("debt.addDebt")}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("debt.addDebt")}</DialogTitle>
        </DialogHeader>
        <DebtForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
