import { DebtForm } from "@/components/debts/DebtForm";
import { DebtList } from "@/components/debts/DebtList";

export default function DebtsPage() {
  return (
    <div className="flex min-h-screen flex-col p-4 space-y-8">
      <header className="mb-2 mt-4">
        <h1 className="text-2xl font-bold">Hutang & Piutang</h1>
        <p className="text-muted-foreground text-sm">Kelola catatan hutang dan piutang</p>
      </header>

      <section>
        <DebtForm />
      </section>

      <section className="border-t pt-8">
        <h3 className="font-semibold mb-4">Daftar Hutang / Piutang</h3>
        <DebtList />
      </section>
    </div>
  );
}
