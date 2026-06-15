"use client";

import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AnalyticsCard, AnalyticsEmpty, PeriodToggle } from "./AnalyticsCard";
import { useT, useFormatLocale } from "@/lib/i18n";
import { CategoryAggregate } from "@/lib/analytics/useAnalyticsData";
import { PieChart as PieIcon } from "lucide-react";
import dayjs from "dayjs";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted-foreground)",
];

type Period = "thisMonth" | "3m" | "6m" | "12m" | "all";

interface CategoryBreakdownProps {
  getCategoryBreakdown: (
    type: "income" | "expense",
    from: number | null,
    to: number | null
  ) => CategoryAggregate[];
  hasData: boolean;
}

function getPeriodRange(period: Period): { from: number | null; to: number | null } {
  const now = dayjs();
  switch (period) {
    case "thisMonth":
      return { from: now.startOf("month").valueOf(), to: now.endOf("month").valueOf() };
    case "3m":
      return { from: now.subtract(3, "month").startOf("month").valueOf(), to: now.endOf("month").valueOf() };
    case "6m":
      return { from: now.subtract(6, "month").startOf("month").valueOf(), to: now.endOf("month").valueOf() };
    case "12m":
      return { from: now.subtract(12, "month").startOf("month").valueOf(), to: now.endOf("month").valueOf() };
    case "all":
      return { from: null, to: null };
  }
}

export function CategoryBreakdown({ getCategoryBreakdown, hasData }: CategoryBreakdownProps) {
  const t = useT();
  const { formatCurrency } = useFormatLocale();
  const [period, setPeriod] = useState<Period>("thisMonth");
  const [type, setType] = useState<"expense" | "income">("expense");

  const { from, to } = useMemo(() => getPeriodRange(period), [period]);
  const data = useMemo(
    () => getCategoryBreakdown(type, from, to),
    [getCategoryBreakdown, type, from, to]
  );
  const total = data.reduce((s, d) => s + d.amount, 0);

  if (!hasData) {
    return (
      <AnalyticsCard title={t("analytics.category.title")} id="analytics-category">
        <AnalyticsEmpty
          icon={<PieIcon className="h-6 w-6" />}
          title={t("analytics.category.emptyTitle")}
          description={t("analytics.category.emptyDesc")}
        />
      </AnalyticsCard>
    );
  }

  const periodOptions: { label: string; value: string }[] = [
    { label: t("analytics.category.periodThisMonth"), value: "thisMonth" },
    { label: t("analytics.category.period3m"), value: "3m" },
    { label: t("analytics.category.period6m"), value: "6m" },
    { label: t("analytics.category.period12m"), value: "12m" },
    { label: t("analytics.category.periodAll"), value: "all" },
  ];

  return (
    <AnalyticsCard
      title={t("analytics.category.title")}
      id="analytics-category"
      action={
        <PeriodToggle
          options={periodOptions}
          value={period}
          onChange={(v) => setPeriod(v as Period)}
        />
      }
    >
      {/* Type toggle */}
      <div className="flex gap-1 mb-4">
        <button
          type="button"
          aria-pressed={type === "expense"}
          onClick={() => setType("expense")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            type === "expense"
              ? "bg-destructive/10 text-destructive"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("analytics.category.expense")}
        </button>
        <button
          type="button"
          aria-pressed={type === "income"}
          onClick={() => setType("income")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            type === "income"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("analytics.category.income")}
        </button>
      </div>

      {data.length === 0 ? (
        <AnalyticsEmpty
          title={t("analytics.category.emptyTitle")}
          description={
            type === "income"
              ? t("analytics.category.noIncome")
              : t("analytics.category.emptyDesc")
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Pie Chart */}
          <div
            className="w-full h-[200px] mx-auto max-w-[240px]"
            role="img"
            aria-label={`Category breakdown pie chart for ${type}`}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  dataKey="amount"
                  nameKey="name"
                  strokeWidth={2}
                  stroke="var(--color-card)"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload as CategoryAggregate;
                    return (
                      <div className="rounded-lg bg-popover border border-border p-2.5 shadow-lg text-xs">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {formatCurrency(item.amount)} · {item.percent}%
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Center total */}
          <div className="text-center -mt-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(total)}</p>
          </div>

          {/* Bar list */}
          <div className="space-y-2.5">
            {data.map((item, i) => (
              <div key={item.category_id} className="flex items-center gap-3 group">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium truncate">{item.name}</span>
                    <span className="tabular-nums text-muted-foreground ml-2 shrink-0">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-smooth"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-10 text-right shrink-0">
                  {item.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AnalyticsCard>
  );
}
