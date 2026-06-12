"use client";

import { TransactionForm } from "@/components/transactions/TransactionForm";
import { useT } from "@/lib/i18n";

export default function TransactionsPage() {
  const t = useT();
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="py-6 px-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("transaction.pageTitle")}</h1>
      </header>
      <div className="flex-1 min-h-0">
        <TransactionForm />
      </div>
    </div>
  );
}
