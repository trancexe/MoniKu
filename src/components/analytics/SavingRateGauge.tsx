"use client";

import { useMemo } from "react";
import { AnalyticsCard, AnalyticsEmpty } from "./AnalyticsCard";
import { useT, useFormatLocale } from "@/lib/i18n";
import { Gauge } from "lucide-react";

interface SavingRateGaugeProps {
  getSavingRate: () => {
    rate: number | null;
    income: number;
    expense: number;
    saved: number;
    avg3m: number | null;
    sparkline: number[];
  };
  hasData: boolean;
}

function GaugeArc({
  rate,
  size = 160,
}: {
  rate: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;

  // Arc from 135° to 405° (270° sweep)
  const startAngle = 135;
  const endAngle = 405;
  const totalSweep = 270;

  const clampedRate = Math.max(0, Math.min(100, rate));
  const fillAngle = startAngle + (clampedRate / 100) * totalSweep;

  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (start: number, end: number) => {
    const s = toRadians(start);
    const e = toRadians(end);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Color zones
  let strokeColor: string;
  if (clampedRate < 10) strokeColor = "var(--color-destructive)";
  else if (clampedRate < 20) strokeColor = "var(--color-chart-4)"; // amber/orange
  else strokeColor = "var(--color-primary)"; // emerald

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      {/* Background track */}
      <path
        d={arcPath(startAngle, endAngle)}
        fill="none"
        stroke="var(--color-muted)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Fill */}
      {clampedRate > 0 && (
        <path
          d={arcPath(startAngle, fillAngle)}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-700 ease-smooth"
        />
      )}
      {/* Target marker at 20% */}
      {(() => {
        const targetAngle = startAngle + (20 / 100) * totalSweep;
        const rad = toRadians(targetAngle);
        const inner = r - strokeWidth / 2 - 4;
        const outer = r + strokeWidth / 2 + 4;
        return (
          <line
            x1={cx + inner * Math.cos(rad)}
            y1={cy + inner * Math.sin(rad)}
            x2={cx + outer * Math.cos(rad)}
            y2={cy + outer * Math.sin(rad)}
            stroke="var(--color-foreground)"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.3}
          />
        );
      })()}
    </svg>
  );
}

function MiniSparkline({ data, height = 32 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null;
  const width = 120;
  const padding = 4;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="mx-auto">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
      {/* Dots on each point */}
      {data.map((_, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = padding + (1 - (data[i] - min) / range) * (height - padding * 2);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={2}
            fill="var(--color-primary)"
            opacity={0.4}
          />
        );
      })}
    </svg>
  );
}

export function SavingRateGauge({ getSavingRate, hasData }: SavingRateGaugeProps) {
  const t = useT();
  const { formatCurrency } = useFormatLocale();

  const { rate, income, expense, saved, avg3m, sparkline } = useMemo(
    () => getSavingRate(),
    [getSavingRate]
  );

  if (!hasData) {
    return (
      <AnalyticsCard title={t("analytics.savingRate.title")} id="analytics-saving-rate">
        <AnalyticsEmpty
          icon={<Gauge className="h-6 w-6" />}
          title={t("analytics.cashflow.emptyTitle")}
          description={t("analytics.cashflow.emptyDesc")}
        />
      </AnalyticsCard>
    );
  }

  const displayRate = rate !== null ? rate : 0;
  const hasNoIncome = rate === null;

  return (
    <AnalyticsCard
      title={t("analytics.savingRate.title")}
      id="analytics-saving-rate"
    >
      <div
        className="flex flex-col items-center"
        aria-label={
          rate !== null
            ? `Saving rate ${rate}%, target 20%${avg3m !== null ? `, 3-month average ${avg3m}%` : ""}`
            : t("analytics.savingRate.noIncome")
        }
      >
        {/* Gauge */}
        <div className="relative">
          <GaugeArc rate={displayRate} />
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
            <span className="text-3xl font-bold tabular-nums">
              {hasNoIncome ? "—" : `${displayRate}%`}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              {hasNoIncome
                ? t("analytics.savingRate.noIncome")
                : t("analytics.savingRate.target", { percent: 20 })}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 mt-2 text-xs">
          <div className="text-center">
            <p className="text-muted-foreground">{t("analytics.savingRate.thisMonth")}</p>
            <p className="font-semibold tabular-nums">
              {rate !== null ? `${rate}%` : "—"}
            </p>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="text-center">
            <p className="text-muted-foreground">{t("analytics.savingRate.avg3m")}</p>
            <p className="font-semibold tabular-nums">
              {avg3m !== null ? `${avg3m}%` : "—"}
            </p>
          </div>
        </div>

        {/* Sparkline */}
        {sparkline.some((v) => v !== 0) && (
          <div className="mt-3">
            <MiniSparkline data={sparkline} />
          </div>
        )}

        {/* Breakdown */}
        {!hasNoIncome && (
          <div className="w-full mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("analytics.savingRate.income")}</span>
              <span className="font-medium tabular-nums text-primary">{formatCurrency(income)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("analytics.savingRate.expense")}</span>
              <span className="font-medium tabular-nums text-destructive">{formatCurrency(expense)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("analytics.savingRate.saved")}</span>
              <span className={`font-medium tabular-nums ${saved >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(saved)}
              </span>
            </div>
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}
