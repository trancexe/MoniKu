"use client";

import { AddDebtDialog } from "@/components/debts/AddDebtDialog";
import { DebtList } from "@/components/debts/DebtList";
import { useT } from "@/lib/i18n";

export default function DebtsPage() {
  const t = useT();
  return (
    <div className="flex flex-col p-4 space-y-8">
      <header className="flex items-center justify-between py-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("debt.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("debt.pageSubtitle")}</p>
        </div>
        <AddDebtDialog />
      </header>
      <section>
        <h3 className="font-semibold tracking-tight mb-4">{t("debt.listTitle")}</h3>
        <DebtList />
      </section>
    </div>
  );
}
