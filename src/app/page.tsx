import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default function Home() {
  return (
    <div className="flex flex-col p-4">
      <header className="mb-6 mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MoniKu</h1>
          <p className="text-muted-foreground text-sm">Dashboard Keuangan Anda</p>
        </div>
      </header>

      <DashboardOverview />
    </div>
  );
}
