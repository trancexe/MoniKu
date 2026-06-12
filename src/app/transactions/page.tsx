import { TransactionForm } from "@/components/transactions/TransactionForm";

export default function TransactionsPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="py-6 px-4">
        <h1 className="text-3xl font-bold tracking-tight">Catat Transaksi</h1>
      </header>
      <div className="flex-1 min-h-0">
        <TransactionForm />
      </div>
    </div>
  );
}
