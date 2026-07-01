"use client";

import { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AnalyticsCard, AnalyticsEmpty, PeriodToggle } from "./AnalyticsCard";
import { useT, useFormatLocale } from "@/lib/i18n";
import { MonthlyAggregate, abbreviateIDR } from "@/lib/analytics/useAnalyticsData";
import { TrendingUp } from "lucide-react";

interface CashFlowChartProps {
  getCashFlowData: (months: 6 | 12) => MonthlyAggregate[];
  hasData: boolean;
}

export function CashFlowChart({ getCashFlowData, hasData }: CashFlowChartProps) {
  const t = useT();
  const { formatCurrency } = useFormatLocale();
  const [range, setRange] = useState<"6" | "12">("6");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const data = useMemo(
    () => getCashFlowData(range === "6" ? 6 : 12),
    [getCashFlowData, range]
  );

  if (!hasData) {
    return (
      <AnalyticsCard title={t("analytics.cashflow.title")} id="analytics-cashflow">
        <AnalyticsEmpty
          icon={<TrendingUp className="h-6 w-6" />}
          title={t("analytics.cashflow.emptyTitle")}
          description={t("analytics.cashflow.emptyDesc")}
        />
      </AnalyticsCard>
    );
  }

  return (
    <AnalyticsCard
      title={t("analytics.cashflow.title")}
      id="analytics-cashflow"
      action={
        <PeriodToggle
          options={[
            { label: t("analytics.cashflow.toggle6m"), value: "6" },
            { label: t("analytics.cashflow.toggle12m"), value: "12" },
          ]}
          value={range}
          onChange={(v) => setRange(v as "6" | "12")}
        />
      }
    >
      <div
        className="w-full h-[260px]"
        role="img"
        aria-label={`Cash flow chart showing ${range} months of data`}
      >
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.split(" ")[0]}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => abbreviateIDR(v)}
                width={64}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="rounded-lg bg-popover border border-border p-3 shadow-lg text-sm">
                      <p className="font-medium text-foreground mb-1.5">{label}</p>
                      {payload.map((entry) => (
                        <div key={entry.dataKey as string} className="flex items-center gap-2 text-xs">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">{entry.name}</span>
                          <span className="ml-auto font-medium tabular-nums">
                            {formatCurrency(entry.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="income"
                name={t("analytics.cashflow.income")}
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-chart-1)" }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name={t("analytics.cashflow.expense")}
                stroke="var(--color-chart-5)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-chart-5)" }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="net"
                name={t("analytics.cashflow.net")}
                stroke="var(--color-muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={{ r: 2, fill: "var(--color-muted-foreground)" }}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </AnalyticsCard>
  );
}
