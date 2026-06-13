"use client";

import { useState, useMemo, useCallback } from "react";
import { AnalyticsCard, AnalyticsEmpty } from "./AnalyticsCard";
import { useT, useFormatLocale } from "@/lib/i18n";
import { RecurringPattern } from "@/lib/analytics/useAnalyticsData";
import { db, RecurringTransaction } from "@/lib/db";
import { toast } from "sonner";
import {
  RefreshCw,
  Check,
  X,
  Trash2,
  Clock,
} from "lucide-react";

interface RecurringDetectionProps {
  detectRecurring: () => RecurringPattern[];
  confirmedRecurring: RecurringTransaction[];
  hasData: boolean;
}

const FREQ_LABELS: Record<string, string> = {
  daily: "analytics.recurring.daily",
  weekly: "analytics.recurring.weekly",
  monthly: "analytics.recurring.monthly",
  quarterly: "analytics.recurring.quarterly",
  yearly: "analytics.recurring.yearly",
};

export function RecurringDetection({
  detectRecurring,
  confirmedRecurring,
  hasData,
}: RecurringDetectionProps) {
  const t = useT();
  const { formatCurrency } = useFormatLocale();
  const [processing, setProcessing] = useState<string | null>(null);

  const detected = useMemo(() => detectRecurring(), [detectRecurring]);
  const confirmed = confirmedRecurring.filter((r) => r.status === "confirmed");

  const handleConfirm = useCallback(
    async (pattern: RecurringPattern) => {
      setProcessing(pattern.pattern_key);
      try {
        const record: RecurringTransaction = {
          id: crypto.randomUUID(),
          user_pattern_key: pattern.pattern_key,
          wallet_id: pattern.wallet_id,
          category_id: pattern.category_id,
          amount: pattern.amount,
          amount_variance: pattern.amount_variance,
          frequency: pattern.frequency,
          avg_interval_days: pattern.avg_interval_days,
          last_occurrence_date: pattern.last_date,
          next_expected_date: pattern.next_expected,
          status: "confirmed",
          detected_at: Date.now(),
          confirmed_at: Date.now(),
        };
        await db.recurring_transactions.add(record);
        toast.success(t("analytics.recurring.confirmed_toast"));
      } catch {
        toast.error(t("common.error"));
      } finally {
        setProcessing(null);
      }
    },
    [t]
  );

  const handleDismiss = useCallback(
    async (pattern: RecurringPattern) => {
      setProcessing(pattern.pattern_key);
      try {
        const record: RecurringTransaction = {
          id: crypto.randomUUID(),
          user_pattern_key: pattern.pattern_key,
          wallet_id: pattern.wallet_id,
          category_id: pattern.category_id,
          amount: pattern.amount,
          amount_variance: pattern.amount_variance,
          frequency: pattern.frequency,
          avg_interval_days: pattern.avg_interval_days,
          last_occurrence_date: pattern.last_date,
          next_expected_date: pattern.next_expected,
          status: "dismissed",
          detected_at: Date.now(),
        };
        await db.recurring_transactions.add(record);
        toast(t("analytics.recurring.ignored_toast"));
      } catch {
        toast.error(t("common.error"));
      } finally {
        setProcessing(null);
      }
    },
    [t]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      setProcessing(id);
      try {
        await db.recurring_transactions.delete(id);
        toast(t("analytics.recurring.removed_toast"));
      } catch {
        toast.error(t("common.error"));
      } finally {
        setProcessing(null);
      }
    },
    [t]
  );

  if (!hasData) return null;
  if (detected.length === 0 && confirmed.length === 0) return null;

  return (
    <AnalyticsCard
      title={t("analytics.recurring.title")}
      id="analytics-recurring"
    >
      {/* Detected patterns */}
      {detected.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("analytics.recurring.detected", { count: detected.length })}
          </h3>
          <div className="space-y-2">
            {detected.map((pattern) => {
              const isProcessing = processing === pattern.pattern_key;
              return (
                <div
                  key={pattern.pattern_key}
                  className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 border border-border/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pattern.category_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="tabular-nums">{formatCurrency(pattern.amount)}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t(FREQ_LABELS[pattern.frequency] || "analytics.recurring.monthly")}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleConfirm(pattern)}
                      disabled={isProcessing}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-50"
                      aria-label={t("analytics.recurring.mark")}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(pattern)}
                      disabled={isProcessing}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition disabled:opacity-50"
                      aria-label={t("analytics.recurring.ignore")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmed recurring */}
      {confirmed.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("analytics.recurring.confirmed", { count: confirmed.length })}
          </h3>
          <div className="space-y-2">
            {confirmed.map((rec) => {
              const isProcessing = processing === rec.id;
              return (
                <div
                  key={rec.id}
                  className="flex items-center gap-3 rounded-xl bg-primary/5 p-3 border border-primary/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {rec.category_id}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="tabular-nums">{formatCurrency(rec.amount)}</span>
                      <span>·</span>
                      <span>{t(FREQ_LABELS[rec.frequency] || "analytics.recurring.monthly")}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(rec.id)}
                    disabled={isProcessing}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition disabled:opacity-50"
                    aria-label={t("analytics.recurring.remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detected.length === 0 && confirmed.length === 0 && (
        <AnalyticsEmpty
          title={t("analytics.recurring.emptyDetected")}
          description=""
        />
      )}
    </AnalyticsCard>
  );
}
