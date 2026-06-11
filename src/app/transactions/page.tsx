import { TransactionForm } from "@/components/transactions/TransactionForm";

export default function TransactionsPage() {
  return (
    <div className="absolute inset-0 bottom-16 flex flex-col p-4 bg-background z-10">
      <header className="mb-4 mt-2 shrink-0">
        <h1 className="text-2xl font-bold">Catat Transaksi</h1>
      </header>
      <div className="flex-1 min-h-0">
        <TransactionForm />
      </div>
    </div>
  );
}
