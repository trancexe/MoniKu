"use client";

import { useState, useMemo } from "react";
import { AnalyticsCard, AnalyticsEmpty } from "./AnalyticsCard";
import { useT, useFormatLocale } from "@/lib/i18n";
import { MoMRow, abbreviateIDR } from "@/lib/analytics/useAnalyticsData";
import { ArrowDown, ArrowUp, Minus, TrendingDown, TrendingUp, Equal } from "lucide-react";

interface MonthCompareProps {
  getMonthComparison: () => {
    rows: MoMRow[];
    currentTotal: number;
    previousTotal: number;
  };
  hasData: boolean;
}

export function MonthCompare({ getMonthComparison, hasData }: MonthCompareProps) {
  const t = useT();
  const { formatCurrency } = useFormatLocale();
  const [showAll, setShowAll] = useState(false);

  const { rows, currentTotal, previousTotal } = useMemo(
    () => getMonthComparison(),
    [getMonthComparison]
  );

  if (!hasData || rows.length === 0) {
    return (
      <AnalyticsCard title={t("analytics.compare.title")} id="analytics-compare">
        <AnalyticsEmpty
          icon={<Equal className="h-6 w-6" />}
          title={t("analytics.compare.emptyTitle")}
          description={t("analytics.compare.emptyDesc")}
        />
      </AnalyticsCard>
    );
  }

  const delta = currentTotal - previousTotal;
  const percentDelta =
    previousTotal > 0 ? Math.round(Math.abs((delta / previousTotal) * 100)) : 0;
  const isBetter = delta < 0;

  const displayRows = showAll ? rows : rows.slice(0, 10);

  const formatDelta = (pct: number | null): string => {
    if (pct === null) return "";
    const abs = Math.abs(pct);
    if (abs >= 1000) return `${Math.round(abs / 100)}×`;
    return `${abs}%`;
  };

  return (
    <AnalyticsCard title={t("analytics.compare.title")} id="analytics-compare">
      {/* Summary card */}
      <div
        className={`rounded-xl p-4 mb-4 ${
          isBetter
            ? "bg-primary/5 border border-primary/20"
            : delta === 0
            ? "bg-muted/50 border border-border"
            : "bg-destructive/5 border border-destructive/20"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {isBetter ? (
            <TrendingDown className="h-4 w-4 text-primary" />
          ) : delta === 0 ? (
            <Minus className="h-4 w-4 text-muted-foreground" />
          ) : (
            <TrendingUp className="h-4 w-4 text-destructive" />
          )}
          <span className="text-sm font-medium">
            {isBetter
              ? t("analytics.compare.summaryBetter", {
                  percent: percentDelta,
                  amount: formatCurrency(Math.abs(delta)),
                })
              : delta === 0
              ? t("analytics.compare.summarySame")
              : t("analytics.compare.summaryWorse", {
                  percent: percentDelta,
                  amount: formatCurrency(Math.abs(delta)),
                })}
          </span>
        </div>
        <div className="flex gap-6 text-xs text-muted-foreground mt-2">
          <span>
            {t("analytics.compare.thisMonth")}: <span className="font-medium text-foreground tabular-nums">{formatCurrency(currentTotal)}</span>
          </span>
          <span>
            {t("analytics.compare.lastMonth")}: <span className="font-medium text-foreground tabular-nums">{formatCurrency(previousTotal)}</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                {t("analytics.compare.category")}
              </th>
              <th className="text-right py-2 text-xs font-medium text-muted-foreground">
                {t("analytics.compare.thisMonth")}
              </th>
              <th className="text-right py-2 text-xs font-medium text-muted-foreground">
                {t("analytics.compare.lastMonth")}
              </th>
              <th className="text-right py-2 text-xs font-medium text-muted-foreground w-20">
                {t("analytics.compare.delta")}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={row.category_id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5">
                  <span className="font-medium text-sm truncate block max-w-[120px]">{row.name}</span>
                </td>
                <td className="py-2.5 text-right tabular-nums text-sm">
                  {row.status === "stopped" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{abbreviateIDR(row.current)}</span>
                      {/* Mini bar */}
                      <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full bg-foreground/30"
                          style={{
                            width: `${Math.min(100, currentTotal > 0 ? (row.current / currentTotal) * 100 : 0)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </td>
                <td className="py-2.5 text-right tabular-nums text-sm text-muted-foreground">
                  {row.status === "new" ? "—" : abbreviateIDR(row.previous)}
                </td>
                <td className="py-2.5 text-right">
                  {row.status === "new" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {t("analytics.compare.new")}
                    </span>
                  ) : row.status === "stopped" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {t("analytics.compare.stopped")}
                    </span>
                  ) : (
                    <div
                      className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${
                        row.delta < 0
                          ? "text-primary"
                          : row.delta > 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {row.delta < 0 ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : row.delta > 0 ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : null}
                      {formatDelta(row.percentDelta)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 10 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 text-xs text-primary font-medium py-2 hover:underline transition"
        >
          {showAll ? t("analytics.compare.showLess") : t("analytics.compare.showMore")}
        </button>
      )}
    </AnalyticsCard>
  );
}
