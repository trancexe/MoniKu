"use client";

import { useMemo } from "react";
import { AnalyticsCard, AnalyticsEmpty } from "./AnalyticsCard";
import { useT, useFormatLocale } from "@/lib/i18n";
import { abbreviateIDR } from "@/lib/analytics/useAnalyticsData";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  ShieldAlert,
  ShieldOff,
  Calendar,
} from "lucide-react";

interface CashFlowForecastProps {
  getForecast: () => {
    balance: number;
    income: number;
    expense: number;
    remainingDays: number;
    confidence: "high" | "medium" | "low";
    upcoming: Array<{ name: string; amount: number; date: string }>;
  };
  monthlyDataLength: number;
  hasData: boolean;
}

const CONFIDENCE_CONFIG = {
  high: {
    icon: Shield,
    colorClass: "text-primary bg-primary/10",
    key: "analytics.forecast.confidenceHigh",
  },
  medium: {
    icon: ShieldAlert,
    colorClass: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
    key: "analytics.forecast.confidenceMedium",
  },
  low: {
    icon: ShieldOff,
    colorClass: "text-muted-foreground bg-muted",
    key: "analytics.forecast.confidenceLow",
  },
};

export function CashFlowForecast({
  getForecast,
  monthlyDataLength,
  hasData,
}: CashFlowForecastProps) {
  const t = useT();
  const { formatCurrency } = useFormatLocale();

  const forecast = useMemo(() => getForecast(), [getForecast]);

  if (!hasData || monthlyDataLength < 1) {
    return (
      <AnalyticsCard title={t("analytics.forecast.title")} id="analytics-forecast">
        <AnalyticsEmpty
          icon={<Target className="h-6 w-6" />}
          title={t("analytics.forecast.emptyTitle")}
          description={t("analytics.forecast.emptyDesc")}
        />
      </AnalyticsCard>
    );
  }

  const conf = CONFIDENCE_CONFIG[forecast.confidence];
  const ConfIcon = conf.icon;

  return (
    <AnalyticsCard
      title={t("analytics.forecast.title")}
      id="analytics-forecast"
      action={
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium ${conf.colorClass}`}>
          <ConfIcon className="h-3 w-3" />
          {t(conf.key)}
        </div>
      }
    >
      {/* 3 Key figures */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center rounded-xl bg-primary/5 p-3 border border-primary/10">
          <Wallet className="h-4 w-4 text-primary mx-auto mb-1.5" />
          <p className="text-[11px] text-muted-foreground mb-0.5">
            {t("analytics.forecast.estimatedBalance")}
          </p>
          <p className="text-sm font-bold tabular-nums">{abbreviateIDR(forecast.balance)}</p>
        </div>
        <div className="text-center rounded-xl bg-muted/30 p-3 border border-border/50">
          <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1.5" />
          <p className="text-[11px] text-muted-foreground mb-0.5">
            {t("analytics.forecast.estimatedIncome")}
          </p>
          <p className="text-sm font-bold tabular-nums text-primary">{abbreviateIDR(forecast.income)}</p>
        </div>
        <div className="text-center rounded-xl bg-muted/30 p-3 border border-border/50">
          <TrendingDown className="h-4 w-4 text-destructive mx-auto mb-1.5" />
          <p className="text-[11px] text-muted-foreground mb-0.5">
            {t("analytics.forecast.estimatedExpense")}
          </p>
          <p className="text-sm font-bold tabular-nums text-destructive">{abbreviateIDR(forecast.expense)}</p>
        </div>
      </div>

      {/* Remaining days */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-4">
        <Calendar className="h-3.5 w-3.5" />
        {t("analytics.forecast.remaining", { days: forecast.remainingDays })}
      </div>

      {/* Upcoming recurring */}
      {forecast.upcoming.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("analytics.forecast.upcoming")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {forecast.upcoming.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs"
              >
                <span className="font-medium truncate max-w-[100px]">{item.name}</span>
                <span className="text-muted-foreground">~{abbreviateIDR(item.amount)}</span>
                <span className="text-muted-foreground/60">tgl {item.date}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground/60 mt-3 leading-relaxed italic">
        *{t("analytics.forecast.disclaimer", {
          months: Math.min(monthlyDataLength, 3),
        })}
      </p>
    </AnalyticsCard>
  );
}
