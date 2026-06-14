import { Suspense } from "react";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default function Home() {
  return (
    <div className="flex flex-col">
      <Suspense fallback={null}>
        <DashboardOverview />
      </Suspense>
    </div>
  );
}
