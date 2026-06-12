"use client";

import { DebtForm } from "@/components/debts/DebtForm";
import { DebtList } from "@/components/debts/DebtList";
import { useT } from "@/lib/i18n";

export default function DebtsPage() {
  const t = useT();
  return (
    <div className="flex flex-col p-4 space-y-8">
      <header className="py-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("debt.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("debt.pageSubtitle")}</p>
      </header>

      <section>
        <DebtForm />
      </section>

      <section className="border-t pt-8">
        <h3 className="font-semibold mb-4">{t("debt.listTitle")}</h3>
        <DebtList />
      </section>
    </div>
  );
}
