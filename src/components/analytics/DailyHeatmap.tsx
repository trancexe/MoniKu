"use client";

import { useState, useMemo, useCallback, useLayoutEffect } from "react";
import { AnalyticsCard, AnalyticsEmpty, PeriodToggle } from "./AnalyticsCard";
import { useT, useFormatLocale } from "@/lib/i18n";
import { DailyAggregate } from "@/lib/analytics/useAnalyticsData";
import { CalendarDays } from "lucide-react";

const HEATMAP_COLORS = [
  "var(--color-muted)",
  "oklch(0.75 0.08 155)",
  "oklch(0.65 0.10 155)",
  "oklch(0.55 0.12 155)",
  "oklch(0.45 0.14 155)",
];

type HeatmapMode = "expense" | "income" | "net";

interface DailyHeatmapProps {
  getDailyHeatmap: (
    weeksCount: number,
    mode: HeatmapMode
  ) => { days: DailyAggregate[]; maxValue: number; percentile90: number };
  hasData: boolean;
}

function getIntensityLevel(
  value: number,
  p90: number
): number {
  if (value <= 0) return 0;
  if (p90 <= 0) return value > 0 ? 4 : 0;
  const ratio = value / p90;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DailyHeatmap({ getDailyHeatmap, hasData }: DailyHeatmapProps) {
  const t = useT();
  const { formatCurrency, formatDate, locale } = useFormatLocale();
  const [mode, setMode] = useState<HeatmapMode>("expense");
  const [tooltip, setTooltip] = useState<{
    day: DailyAggregate;
    x: number;
    y: number;
  } | null>(null);

  // Responsive: track viewport width via ResizeObserver (matches the
  // AGENTS.md "fixed-bottom UI" rule). Initial state assumes the wider
  // layout so the first render uses the larger week/cell sizes; the
  // layout effect then updates synchronously before paint, so there is
  // no visible flash on mount or on rotation/resize.
  const [isNarrow, setIsNarrow] = useState(false);
  useLayoutEffect(() => {
    const update = () => setIsNarrow(window.innerWidth < 640);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);
  const weeksCount = isNarrow ? 8 : 12;

  const { days, percentile90 } = useMemo(
    () => getDailyHeatmap(weeksCount, mode),
    [getDailyHeatmap, weeksCount, mode]
  );

  const dayLabels = locale === "id" ? DAY_LABELS : DAY_LABELS_EN;

  const getValue = useCallback(
    (day: DailyAggregate) => {
      if (mode === "income") return day.income;
      if (mode === "expense") return day.expense;
      return Math.abs(day.net);
    },
    [mode]
  );

  // Group days by weekIndex x dayOfWeek grid
  const grid = useMemo(() => {
    const g: (DailyAggregate | null)[][] = Array.from({ length: 7 }, () =>
      Array(weeksCount).fill(null)
    );
    for (const day of days) {
      if (day.dayOfWeek >= 0 && day.dayOfWeek < 7 && day.weekIndex >= 0 && day.weekIndex < weeksCount) {
        g[day.dayOfWeek][day.weekIndex] = day;
      }
    }
    return g;
  }, [days, weeksCount]);

  if (!hasData) {
    return (
      <AnalyticsCard title={t("analytics.heatmap.title")} id="analytics-heatmap">
        <AnalyticsEmpty
          icon={<CalendarDays className="h-6 w-6" />}
          title={t("analytics.heatmap.emptyTitle")}
          description={t("analytics.heatmap.emptyDesc")}
        />
      </AnalyticsCard>
    );
  }

  const cellSize = isNarrow ? 28 : 24;
  const gap = 3;

  return (
    <AnalyticsCard
      title={t("analytics.heatmap.title")}
      id="analytics-heatmap"
      action={
        <PeriodToggle
          options={[
            { label: t("analytics.heatmap.expense"), value: "expense" },
            { label: t("analytics.heatmap.income"), value: "income" },
            { label: t("analytics.heatmap.net"), value: "net" },
          ]}
          value={mode}
          onChange={(v) => setMode(v as HeatmapMode)}
        />
      }
    >
      <div className="relative overflow-x-auto pb-2">
        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 rounded-lg bg-popover border border-border p-2.5 shadow-lg text-xs pointer-events-none"
            style={{
              left: Math.min(tooltip.x, (weeksCount * (cellSize + gap)) - 140),
              top: tooltip.y - 60,
            }}
          >
            <p className="font-medium text-foreground">
              {formatDate(new Date(tooltip.day.date))}
            </p>
            <p className="text-muted-foreground mt-0.5">
              {formatCurrency(getValue(tooltip.day))} · {tooltip.day.count}{" "}
              {locale === "id" ? "transaksi" : "transactions"}
            </p>
          </div>
        )}

        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col shrink-0" style={{ gap }}>
            {dayLabels.map((label, i) => (
              <div
                key={i}
                className="text-[10px] text-muted-foreground flex items-center justify-end pr-1"
                style={{ height: cellSize }}
              >
                {i % 2 === 1 ? label : ""}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex" style={{ gap }}>
            {Array.from({ length: weeksCount }).map((_, weekIdx) => (
              <div key={weekIdx} className="flex flex-col" style={{ gap }}>
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const day = grid[dayIdx]?.[weekIdx];
                  const value = day ? getValue(day) : 0;
                  const level = getIntensityLevel(value, percentile90);

                  return (
                    <button
                      key={dayIdx}
                      type="button"
                      className="rounded-[3px] transition-colors hover:ring-1 hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: HEATMAP_COLORS[level],
                      }}
                      aria-label={
                        day
                          ? `${formatDate(new Date(day.date))}, ${formatCurrency(value)}`
                          : ""
                      }
                      onPointerEnter={(e) => {
                        if (day) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const parent = e.currentTarget.closest("section")?.getBoundingClientRect();
                          setTooltip({
                            day,
                            x: rect.left - (parent?.left || 0),
                            y: rect.top - (parent?.top || 0),
                          });
                        }
                      }}
                      onPointerLeave={() => setTooltip(null)}
                      onClick={() => {
                        if (day && tooltip?.day === day) setTooltip(null);
                        else if (day) {
                          const rect = (
                            document.querySelector(`[aria-label*="${day.date}"]`) as HTMLElement | null
                          )?.getBoundingClientRect();
                          if (rect) {
                            const parent = document.getElementById("analytics-heatmap")?.getBoundingClientRect();
                            setTooltip({
                              day,
                              x: rect.left - (parent?.left || 0),
                              y: rect.top - (parent?.top || 0),
                            });
                          }
                        }
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 justify-end text-[10px] text-muted-foreground">
          <span>{t("analytics.heatmap.legendLess")}</span>
          {HEATMAP_COLORS.map((color, i) => (
            <span
              key={i}
              className="rounded-[2px]"
              style={{
                width: 12,
                height: 12,
                backgroundColor: color,
              }}
            />
          ))}
          <span>{t("analytics.heatmap.legendMore")}</span>
        </div>
      </div>
    </AnalyticsCard>
  );
}
