"use client";

import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n";
import { useAnalyticsData } from "@/lib/analytics/useAnalyticsData";
import { InsightCards } from "@/components/analytics/InsightCards";
import { AnalyticsSkeleton } from "@/components/analytics/AnalyticsCard";

// Dynamic imports for chart components (SSR: false to avoid window reference issues)
const CashFlowChart = dynamic(
  () => import("@/components/analytics/CashFlowChart").then((m) => m.CashFlowChart),
  { ssr: false, loading: () => <AnalyticsSkeleton height="h-[320px]" /> }
);
const CategoryBreakdown = dynamic(
  () => import("@/components/analytics/CategoryBreakdown").then((m) => m.CategoryBreakdown),
  { ssr: false, loading: () => <AnalyticsSkeleton height="h-[420px]" /> }
);
const DailyHeatmap = dynamic(
  () => import("@/components/analytics/DailyHeatmap").then((m) => m.DailyHeatmap),
  { ssr: false, loading: () => <AnalyticsSkeleton height="h-[240px]" /> }
);
const MonthCompare = dynamic(
  () => import("@/components/analytics/MonthCompare").then((m) => m.MonthCompare),
  { ssr: false, loading: () => <AnalyticsSkeleton height="h-[300px]" /> }
);
const SavingRateGauge = dynamic(
  () => import("@/components/analytics/SavingRateGauge").then((m) => m.SavingRateGauge),
  { ssr: false, loading: () => <AnalyticsSkeleton height="h-[280px]" /> }
);
const CashFlowForecast = dynamic(
  () => import("@/components/analytics/CashFlowForecast").then((m) => m.CashFlowForecast),
  { ssr: false, loading: () => <AnalyticsSkeleton height="h-[240px]" /> }
);
const RecurringDetection = dynamic(
  () => import("@/components/analytics/RecurringDetection").then((m) => m.RecurringDetection),
  { ssr: false, loading: () => <AnalyticsSkeleton height="h-[200px]" /> }
);

export default function AnalyticsPage() {
  const t = useT();
  const analytics = useAnalyticsData();

  const hasData = !analytics.isLoading && analytics.transactions.length > 0;

  if (analytics.isLoading) {
    return (
      <div className="flex flex-col p-4 space-y-4" aria-busy="true">
        <header className="py-6">
          <div className="h-8 w-32 rounded bg-muted/60 animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted/40 animate-pulse mt-2" />
        </header>
        <AnalyticsSkeleton height="h-20" />
        <AnalyticsSkeleton height="h-[280px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnalyticsSkeleton height="h-[320px]" />
          <AnalyticsSkeleton height="h-[420px]" />
        </div>
        <AnalyticsSkeleton height="h-[300px]" />
        <AnalyticsSkeleton height="h-[240px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 pb-8">
      {/* Header */}
      <header className="py-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.analytics")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("analytics.subtitle")}</p>
      </header>

      {/* Content */}
      <div className="space-y-4">
        {/* §3.5 Insight Cards — top prominence */}
        <InsightCards getInsights={analytics.getInsights} hasData={hasData} />

        {/* Top row: Saving Rate + Forecast */}
        {/* §3.7 Saving Rate Gauge */}
        <SavingRateGauge
          getSavingRate={analytics.getSavingRate}
          hasData={hasData}
        />

        {/* §3.8 Cash Flow Forecast */}
        <CashFlowForecast
          getForecast={analytics.getForecast}
          monthlyDataLength={analytics.monthlyData.length}
          hasData={hasData}
        />

        {/* Charts row: Cash Flow + Category side-by-side on desktop */}
        {/* §3.1 Cash Flow Trend */}
        <CashFlowChart
          getCashFlowData={analytics.getCashFlowData}
          hasData={hasData}
        />

        {/* §3.2 Category Breakdown */}
        <CategoryBreakdown
          getCategoryBreakdown={analytics.getCategoryBreakdown}
          hasData={hasData}
        />

        {/* §3.4 Month-over-Month Compare */}
        <MonthCompare
          getMonthComparison={analytics.getMonthComparison}
          hasData={hasData}
        />

        {/* §3.3 Daily Heatmap */}
        <DailyHeatmap
          getDailyHeatmap={analytics.getDailyHeatmap}
          hasData={hasData}
        />

        {/* §3.6 Recurring Detection */}
        <RecurringDetection
          detectRecurring={analytics.detectRecurring}
          confirmedRecurring={analytics.recurringRecords}
          categoryMap={analytics.categoryMap}
          hasData={hasData}
        />
      </div>
    </div>
  );
}
