"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useT, useFormatLocale } from "@/lib/i18n";
import { InsightItem } from "@/lib/analytics/useAnalyticsData";
import {
  TrendingUp,
  CalendarDays,
  TrendingDown,
  PartyPopper,
  X,
  Lightbulb,
} from "lucide-react";

const DISMISS_KEY = "moniku-dismissed-insights";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
  } catch {
    return {};
  }
}

function dismissInsight(id: string) {
  const current = getDismissed();
  current[id] = Date.now();
  localStorage.setItem(DISMISS_KEY, JSON.stringify(current));
}



interface InsightCardsProps {
  getInsights: () => InsightItem[];
  hasData: boolean;
}

const INSIGHT_ICONS: Record<InsightItem["type"], React.ElementType> = {
  category_spike: TrendingUp,
  big_spending_day: CalendarDays,
  income_drop: TrendingDown,
  positive: PartyPopper,
};

const INSIGHT_COLORS: Record<InsightItem["type"], string> = {
  category_spike: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40",
  big_spending_day: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/40",
  income_drop: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/40",
  positive: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40",
};

const INSIGHT_ICON_COLORS: Record<InsightItem["type"], string> = {
  category_spike: "text-amber-600 dark:text-amber-400",
  big_spending_day: "text-orange-600 dark:text-orange-400",
  income_drop: "text-red-600 dark:text-red-400",
  positive: "text-emerald-600 dark:text-emerald-400",
};

export function InsightCards({ getInsights, hasData }: InsightCardsProps) {
  const t = useT();
  const { formatCurrency } = useFormatLocale();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const dismissed = getDismissed();
    const active = new Set<string>();
    for (const [id, ts] of Object.entries(dismissed)) {
      if (Date.now() - ts < DISMISS_DURATION_MS) active.add(id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissedIds(active);
  }, []);

  const insights = useMemo(() => getInsights(), [getInsights]);

  const visibleInsights = useMemo(
    () => insights.filter((i) => !dismissedIds.has(i.id)),
    [insights, dismissedIds]
  );

  const handleDismiss = useCallback((id: string) => {
    dismissInsight(id);
    setDismissedIds((prev) => new Set([...prev, id]));
  }, []);

  if (!hasData || visibleInsights.length === 0) return null;

  const getInsightText = (insight: InsightItem): string => {
    const p = insight.params;
    switch (insight.type) {
      case "category_spike":
        return t("analytics.insight.categorySpike", {
          name: String(p.name),
          percent: p.percent,
          amount: formatCurrency(p.amount as number),
        });
      case "big_spending_day":
        return t("analytics.insight.bigSpendingDay", {
          date: String(p.date),
          amount: formatCurrency(p.amount as number),
          multiplier: p.multiplier,
        });
      case "income_drop":
        return t("analytics.insight.incomeDrop", { percent: p.percent });
      case "positive":
        return t("analytics.insight.positive", { percent: p.percent });
    }
  };

  return (
    <section id="analytics-insights" className="space-y-2.5">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{t("analytics.insight.title")}</h2>
      </div>
      {visibleInsights.slice(0, 3).map((insight) => {
        const Icon = INSIGHT_ICONS[insight.type];
        return (
          <div
            key={insight.id}
            className={`relative flex items-start gap-3 rounded-xl p-3.5 border transition-all ${INSIGHT_COLORS[insight.type]}`}
          >
            <div className={`mt-0.5 shrink-0 ${INSIGHT_ICON_COLORS[insight.type]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-sm leading-relaxed flex-1 pr-6">{getInsightText(insight)}</p>
            <button
              type="button"
              onClick={() => handleDismiss(insight.id)}
              className="absolute top-2.5 right-2.5 h-6 w-6 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition text-muted-foreground"
              aria-label={t("analytics.insight.dismiss")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </section>
  );
}
