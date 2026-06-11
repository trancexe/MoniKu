import { TransactionForm } from "@/components/transactions/TransactionForm";

export default function TransactionsPage() {
  return (
    <div className="flex min-h-screen flex-col p-4">
      <header className="mb-4 mt-2">
        <h1 className="text-2xl font-bold">Catat Transaksi</h1>
      </header>
      <div className="flex-1">
        <TransactionForm />
      </div>
    </div>
  );
}
