"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, DebtLoan } from "@/lib/db";
import { toast } from "sonner";
import { useT, useFormatLocale } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

interface DebtEditSheetProps {
  debt: DebtLoan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function DebtEditSheet({ debt, open, onOpenChange, onUpdated }: DebtEditSheetProps) {
  const t = useT();
  const { formatCurrencyRaw } = useFormatLocale();

  const [personName, setPersonName] = useState(debt?.person_name || "");
  const [notes, setNotes] = useState(debt?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!debt || isSubmitting) return;

    const trimmedName = personName.trim();
    if (!trimmedName) {
      return toast.error(t("debt.validationRequired"));
    }

    setIsSubmitting(true);
    try {
      await db.debt_loans.update(debt.id, {
        person_name: trimmedName,
        notes: notes.trim(),
        updated_at: Date.now(),
      });

      toast.success(t("debt.updated"));
      onUpdated?.();
      onOpenChange(false);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error(error);
      toast.error(t("debt.saveFailedEdit"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0 overflow-hidden flex flex-col md:max-w-md md:mx-auto">
        <SheetHeader className="px-4 pt-5 pb-2 shrink-0">
          <SheetTitle>{t("common.edit")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
          <div className="space-y-2">
            <Label>{t("debt.personName")}</Label>
            <Input
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder={t("debt.personName")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("transaction.notes")}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("transaction.notesPlaceholder")}
            />
          </div>

          {debt && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("debt.detail.totalAmount")}</span>
                <span className="font-medium">{formatCurrencyRaw(debt.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("debt.type")}</span>
                <span className="font-medium">{debt.type === "debt" ? t("debt.type_debt") : t("debt.type_loan")}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-2">
                {t("debt.editLockedNote")}
              </p>
            </div>
          )}

          <Button
            className="w-full rounded-xl py-6 active:scale-[0.98] transition-transform font-semibold"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
