"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction, Category, Wallet, RecurringTransaction } from "@/lib/db";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

// ─── Types ───────────────────────────────────────────────────────

export interface MonthlyAggregate {
  year: number;
  month: number;       // 0-indexed
  label: string;       // "Jun 2026"
  income: number;
  expense: number;
  net: number;
}

export interface CategoryAggregate {
  category_id: string;
  name: string;
  icon: string;
  amount: number;
  percent: number;
  type: "income" | "expense";
}

export interface DailyAggregate {
  date: string;         // YYYY-MM-DD
  dayOfWeek: number;    // 0=Sun, 6=Sat
  weekIndex: number;
  income: number;
  expense: number;
  net: number;
  count: number;
}

export interface MoMRow {
  category_id: string;
  name: string;
  icon: string;
  current: number;
  previous: number;
  delta: number;
  percentDelta: number | null;  // null if previous = 0
  status: "up" | "down" | "same" | "new" | "stopped";
}

export interface InsightItem {
  id: string;
  type: "category_spike" | "big_spending_day" | "income_drop" | "positive";
  params: Record<string, string | number>;
  severity: number;  // higher = more important, for sorting
}

export interface RecurringPattern {
  pattern_key: string;
  wallet_id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  amount: number;
  amount_variance: number;
  frequency: RecurringTransaction["frequency"];
  avg_interval_days: number;
  occurrences: number;
  confidence: number;
  last_date: number;
  next_expected: number;
}

// ─── Abbreviation ────────────────────────────────────────────────

export function abbreviateIDR(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000_000).toFixed(1)}T`;
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}Rp ${abs}`;
}

// ─── Main Hook ───────────────────────────────────────────────────

export function useAnalyticsData() {
  const transactions = useLiveQuery(() => db.transactions.orderBy("date").toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const wallets = useLiveQuery(() => db.wallets.toArray());
  const recurringRecords = useLiveQuery(() => db.recurring_transactions.toArray());

  const isLoading = !transactions || !categories || !wallets || !recurringRecords;

  const categoryMap = useMemo(() => {
    if (!categories) return new Map<string, Category>();
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // ─── Cash Flow Trend (§3.1) ──────────────────────────────────

  const monthlyData = useMemo((): MonthlyAggregate[] => {
    if (!transactions || transactions.length === 0) return [];

    const map = new Map<string, MonthlyAggregate>();
    for (const t of transactions) {
      const d = dayjs(t.date);
      const key = `${d.year()}-${d.month()}`;
      let agg = map.get(key);
      if (!agg) {
        agg = {
          year: d.year(),
          month: d.month(),
          label: d.format("MMM YYYY"),
          income: 0,
          expense: 0,
          net: 0,
        };
        map.set(key, agg);
      }
      if (t.type === "income") agg.income += t.amount;
      else agg.expense += t.amount;
      agg.net = agg.income - agg.expense;
    }

    return Array.from(map.values()).sort(
      (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
    );
  }, [transactions]);

  const getCashFlowData = (months: 6 | 12): MonthlyAggregate[] => {
    if (monthlyData.length === 0) return [];
    const now = dayjs();
    const result: MonthlyAggregate[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const target = now.subtract(i, "month");
      const y = target.year();
      const m = target.month();
      const existing = monthlyData.find((d) => d.year === y && d.month === m);
      result.push(
        existing || {
          year: y,
          month: m,
          label: target.format("MMM YYYY"),
          income: 0,
          expense: 0,
          net: 0,
        }
      );
    }
    return result;
  };

  // ─── Category Breakdown (§3.2) ───────────────────────────────

  const getCategoryBreakdown = (
    type: "income" | "expense",
    fromDate: number | null,
    toDate: number | null
  ): CategoryAggregate[] => {
    if (!transactions) return [];

    const filtered = transactions.filter((t) => {
      if (t.type !== type) return false;
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      return true;
    });

    const map = new Map<string, number>();
    let total = 0;
    for (const t of filtered) {
      map.set(t.category_id, (map.get(t.category_id) || 0) + t.amount);
      total += t.amount;
    }

    const sorted = Array.from(map.entries())
      .map(([id, amount]) => {
        const cat = categoryMap.get(id);
        return {
          category_id: id,
          name: cat?.name || "?",
          icon: cat?.icon || "CircleDollarSign",
          amount,
          percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
          type,
        };
      })
      .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));

    // Top 5 + "Others"
    if (sorted.length <= 5) return sorted;
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const othersAmount = rest.reduce((s, r) => s + r.amount, 0);
    top5.push({
      category_id: "__others__",
      name: "Lainnya",
      icon: "MoreHorizontal",
      amount: othersAmount,
      percent: total > 0 ? Math.round((othersAmount / total) * 1000) / 10 : 0,
      type,
    });
    return top5;
  };

  // ─── Daily Heatmap (§3.3) ────────────────────────────────────

  const getDailyHeatmap = (
    weeksCount: number,
    mode: "expense" | "income" | "net"
  ): { days: DailyAggregate[]; maxValue: number; percentile90: number } => {
    if (!transactions) return { days: [], maxValue: 0, percentile90: 0 };

    const now = dayjs();
    const startDate = now.subtract(weeksCount * 7, "day").startOf("day");
    const dayMap = new Map<string, DailyAggregate>();

    // Initialize all days
    for (let i = 0; i < weeksCount * 7; i++) {
      const d = startDate.add(i, "day");
      const key = d.format("YYYY-MM-DD");
      dayMap.set(key, {
        date: key,
        dayOfWeek: d.day(),
        weekIndex: Math.floor(i / 7),
        income: 0,
        expense: 0,
        net: 0,
        count: 0,
      });
    }

    // Fill from transactions
    for (const t of transactions) {
      const d = dayjs(t.date);
      if (d.isBefore(startDate)) continue;
      const key = d.format("YYYY-MM-DD");
      const agg = dayMap.get(key);
      if (!agg) continue;
      if (t.type === "income") agg.income += t.amount;
      else agg.expense += t.amount;
      agg.net = agg.income - agg.expense;
      agg.count++;
    }

    const days = Array.from(dayMap.values());
    const values = days
      .map((d) => {
        if (mode === "income") return d.income;
        if (mode === "expense") return d.expense;
        return Math.abs(d.net);
      })
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    const maxValue = values.length > 0 ? values[values.length - 1] : 0;
    const p90Index = Math.floor(values.length * 0.9);
    const percentile90 = values.length > 0 ? values[Math.min(p90Index, values.length - 1)] : 0;

    return { days, maxValue, percentile90 };
  };

  // ─── Month-over-Month Compare (§3.4) ─────────────────────────

  const getMonthComparison = (): {
    rows: MoMRow[];
    currentTotal: number;
    previousTotal: number;
  } => {
    if (!transactions) return { rows: [], currentTotal: 0, previousTotal: 0 };

    const now = dayjs();
    const thisMonthStart = now.startOf("month").valueOf();
    const thisMonthEnd = now.endOf("month").valueOf();
    const lastMonthStart = now.subtract(1, "month").startOf("month").valueOf();
    const lastMonthEnd = now.subtract(1, "month").endOf("month").valueOf();

    const currentMap = new Map<string, number>();
    const previousMap = new Map<string, number>();
    let currentTotal = 0;
    let previousTotal = 0;

    for (const t of transactions) {
      if (t.type !== "expense") continue;
      if (t.date >= thisMonthStart && t.date <= thisMonthEnd) {
        currentMap.set(t.category_id, (currentMap.get(t.category_id) || 0) + t.amount);
        currentTotal += t.amount;
      } else if (t.date >= lastMonthStart && t.date <= lastMonthEnd) {
        previousMap.set(t.category_id, (previousMap.get(t.category_id) || 0) + t.amount);
        previousTotal += t.amount;
      }
    }

    const allCategoryIds = new Set([...currentMap.keys(), ...previousMap.keys()]);
    const rows: MoMRow[] = [];

    for (const id of allCategoryIds) {
      const current = currentMap.get(id) || 0;
      const previous = previousMap.get(id) || 0;
      if (current === 0 && previous === 0) continue;

      const delta = current - previous;
      let percentDelta: number | null = null;
      let status: MoMRow["status"] = "same";

      if (previous === 0 && current > 0) {
        status = "new";
      } else if (current === 0 && previous > 0) {
        status = "stopped";
      } else if (previous > 0) {
        percentDelta = Math.round((delta / previous) * 100);
        status = delta > 0 ? "up" : delta < 0 ? "down" : "same";
      }

      const cat = categoryMap.get(id);
      rows.push({
        category_id: id,
        name: cat?.name || "?",
        icon: cat?.icon || "CircleDollarSign",
        current,
        previous,
        delta,
        percentDelta,
        status,
      });
    }

    rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return { rows, currentTotal, previousTotal };
  };

  // ─── Insights (§3.5) ─────────────────────────────────────────

  const getInsights = (): InsightItem[] => {
    if (!transactions || transactions.length === 0) return [];

    const insights: InsightItem[] = [];
    const now = dayjs();

    // Rule 1: Category spike (week vs 3-month avg)
    const weekStart = now.subtract(7, "day").valueOf();
    const threeMonthsAgo = now.subtract(3, "month").valueOf();

    const weekByCat = new Map<string, number>();
    const threeMonthByCat = new Map<string, number>();

    for (const t of transactions) {
      if (t.type !== "expense") continue;
      if (t.date >= weekStart) {
        weekByCat.set(t.category_id, (weekByCat.get(t.category_id) || 0) + t.amount);
      }
      if (t.date >= threeMonthsAgo && t.date < weekStart) {
        threeMonthByCat.set(t.category_id, (threeMonthByCat.get(t.category_id) || 0) + t.amount);
      }
    }

    // Compute weeks in 3-month period
    const weeksIn3M = now.diff(dayjs(threeMonthsAgo), "week") || 1;

    let bestSpike: InsightItem | null = null;
    for (const [catId, weekTotal] of weekByCat) {
      const avg = (threeMonthByCat.get(catId) || 0) / Math.max(weeksIn3M - 1, 1);
      if (avg > 0) {
        const pct = Math.round(((weekTotal - avg) / avg) * 100);
        if (pct > 30) {
          const cat = categoryMap.get(catId);
          const item: InsightItem = {
            id: `spike-${catId}`,
            type: "category_spike",
            params: { name: cat?.name || "?", percent: pct, amount: weekTotal },
            severity: pct,
          };
          if (!bestSpike || item.severity > bestSpike.severity) bestSpike = item;
        }
      }
    }
    if (bestSpike) insights.push(bestSpike);

    // Rule 2: Big spending day (> 2x daily avg this month)
    const monthStart = now.startOf("month").valueOf();
    let monthExpense = 0;
    let daysWithExpense = 0;
    const dailyMap = new Map<string, number>();

    for (const t of transactions) {
      if (t.type !== "expense" || t.date < monthStart) continue;
      const dKey = dayjs(t.date).format("YYYY-MM-DD");
      dailyMap.set(dKey, (dailyMap.get(dKey) || 0) + t.amount);
      monthExpense += t.amount;
    }

    daysWithExpense = now.date();
    const dailyAvg = daysWithExpense > 0 ? monthExpense / daysWithExpense : 0;

    let biggestDay: { date: string; amount: number; mult: number } | null = null;
    for (const [dKey, amount] of dailyMap) {
      if (dailyAvg > 0 && amount > dailyAvg * 2) {
        const mult = Math.round((amount / dailyAvg) * 10) / 10;
        if (!biggestDay || amount > biggestDay.amount) {
          biggestDay = { date: dKey, amount, mult };
        }
      }
    }
    if (biggestDay) {
      insights.push({
        id: `bigday-${biggestDay.date}`,
        type: "big_spending_day",
        params: {
          date: dayjs(biggestDay.date).format("D MMM"),
          amount: biggestDay.amount,
          multiplier: biggestDay.mult,
        },
        severity: biggestDay.mult * 10,
      });
    }

    // Rule 3: Income drop (> 20% vs last month)
    const thisMonthIncome = transactions
      .filter((t) => t.type === "income" && t.date >= monthStart)
      .reduce((s, t) => s + t.amount, 0);

    const lastMonthStart = now.subtract(1, "month").startOf("month").valueOf();
    const lastMonthEnd = now.subtract(1, "month").endOf("month").valueOf();
    const lastMonthIncome = transactions
      .filter((t) => t.type === "income" && t.date >= lastMonthStart && t.date <= lastMonthEnd)
      .reduce((s, t) => s + t.amount, 0);

    if (lastMonthIncome > 0) {
      const dropPct = Math.round(((lastMonthIncome - thisMonthIncome) / lastMonthIncome) * 100);
      if (dropPct > 20) {
        insights.push({
          id: "income-drop",
          type: "income_drop",
          params: { percent: dropPct },
          severity: dropPct,
        });
      }
    }

    // Positive: if expense this month < 3-month avg
    if (insights.length === 0 && monthlyData.length >= 2) {
      const recentMonths = monthlyData.slice(-4, -1);  // last 3 months excluding current
      if (recentMonths.length > 0) {
        const avgExpense =
          recentMonths.reduce((s, m) => s + m.expense, 0) / recentMonths.length;
        if (avgExpense > 0 && monthExpense < avgExpense) {
          const savePct = Math.round(((avgExpense - monthExpense) / avgExpense) * 100);
          if (savePct > 0) {
            insights.push({
              id: "positive-save",
              type: "positive",
              params: { percent: savePct },
              severity: 0,
            });
          }
        }
      }
    }

    return insights.sort((a, b) => b.severity - a.severity).slice(0, 3);
  };

  // ─── Saving Rate (§3.7) ──────────────────────────────────────

  const getSavingRate = () => {
    if (!transactions) return { rate: null, income: 0, expense: 0, saved: 0, avg3m: null, sparkline: [] };

    const now = dayjs();
    const monthStart = now.startOf("month").valueOf();
    const monthEnd = now.endOf("month").valueOf();

    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      if (t.date < monthStart || t.date > monthEnd) continue;
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }

    const saved = income - expense;
    const rate = income > 0 ? Math.round((saved / income) * 100) : null;

    // 3-month avg
    const rates: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const ms = now.subtract(i, "month").startOf("month").valueOf();
      const me = now.subtract(i, "month").endOf("month").valueOf();
      let mi = 0;
      let me2 = 0;
      for (const t of transactions) {
        if (t.date < ms || t.date > me) continue;
        if (t.type === "income") mi += t.amount;
        else me2 += t.amount;
      }
      if (mi > 0) rates.push(Math.round(((mi - me2) / mi) * 100));
    }
    const avg3m = rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;

    // 6-month sparkline
    const sparkline: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const ms = now.subtract(i, "month").startOf("month").valueOf();
      const me = now.subtract(i, "month").endOf("month").valueOf();
      let si = 0;
      let se = 0;
      for (const t of transactions) {
        if (t.date < ms || t.date > me) continue;
        if (t.type === "income") si += t.amount;
        else se += t.amount;
      }
      sparkline.push(si > 0 ? Math.round(((si - se) / si) * 100) : 0);
    }

    return { rate, income, expense, saved, avg3m, sparkline };
  };

  // ─── Forecast (§3.8) ─────────────────────────────────────────

  const getForecast = () => {
    if (!transactions || !wallets || !recurringRecords)
      return { balance: 0, income: 0, expense: 0, remainingDays: 0, confidence: "low" as const, upcoming: [] as Array<{ name: string; amount: number; date: string }> };

    const now = dayjs();
    const endOfMonth = now.endOf("month");
    const remainingDays = Math.max(0, endOfMonth.diff(now, "day"));

    // Current balance
    const currentBalance = wallets.reduce((s, w) => s + w.current_balance, 0);

    // Average daily income/expense (last 30 days)
    const thirtyDaysAgo = now.subtract(30, "day").valueOf();
    let recentIncome = 0;
    let recentExpense = 0;
    for (const t of transactions) {
      if (t.date < thirtyDaysAgo) continue;
      if (t.type === "income") recentIncome += t.amount;
      else recentExpense += t.amount;
    }

    const avgDailyIncome = recentIncome / 30;
    const avgDailyExpense = recentExpense / 30;

    // Confirmed recurring in remaining window
    const confirmed = recurringRecords.filter((r) => r.status === "confirmed");
    let recurringIncome = 0;
    let recurringExpense = 0;
    const upcoming: Array<{ name: string; amount: number; date: string }> = [];

    for (const r of confirmed) {
      const nextDate = dayjs(r.next_expected_date);
      if (nextDate.isAfter(now) && nextDate.isBefore(endOfMonth) || nextDate.isSame(endOfMonth, "day")) {
        const cat = categoryMap.get(r.category_id);
        const catType = cat?.type || "expense";
        if (catType === "income") {
          recurringIncome += r.amount;
        } else {
          recurringExpense += r.amount;
        }
        upcoming.push({
          name: cat?.name || "?",
          amount: r.amount,
          date: nextDate.format("D MMM"),
        });
      }
    }

    const projectedIncome = avgDailyIncome * remainingDays + recurringIncome;
    const projectedExpense = avgDailyExpense * remainingDays + recurringExpense;
    const projectedBalance = currentBalance + projectedIncome - projectedExpense;

    // Confidence
    const hasEnoughData = monthlyData.length >= 3;
    const hasRecurring = confirmed.length > 0;
    const confidence: "high" | "medium" | "low" =
      hasEnoughData && hasRecurring ? "high" : hasEnoughData || monthlyData.length >= 1 ? "medium" : "low";

    return {
      balance: Math.round(projectedBalance),
      income: Math.round(projectedIncome),
      expense: Math.round(projectedExpense),
      remainingDays,
      confidence,
      upcoming: upcoming.sort((a, b) => a.date.localeCompare(b.date)),
    };
  };

  // ─── Recurring Detection (§3.6) ──────────────────────────────

  const detectRecurring = (): RecurringPattern[] => {
    if (!transactions || transactions.length < 3) return [];

    // Group transactions by normalized key: wallet_id + category_id + amount_bucket
    const groups = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (t.type === "income") continue;  // exclude income by default
      const amountBucket = Math.round(t.amount / (t.amount * 0.05 || 1)) * (t.amount * 0.05 || 1);
      const key = `${t.wallet_id}__${t.category_id}__${Math.round(t.amount / 100) * 100}`;
      const group = groups.get(key) || [];
      group.push(t);
      groups.set(key, group);
    }

    const patterns: RecurringPattern[] = [];

    for (const [key, txns] of groups) {
      if (txns.length < 3) continue;

      // Sort by date
      const sorted = [...txns].sort((a, b) => a.date - b.date);

      // Compute intervals
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const diff = dayjs(sorted[i].date).diff(dayjs(sorted[i - 1].date), "day");
        if (diff > 0) intervals.push(diff);
      }

      if (intervals.length < 2) continue;

      // Detect frequency
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      let frequency: RecurringTransaction["frequency"] | null = null;

      if (avgInterval >= 1 && avgInterval <= 2) frequency = "daily";
      else if (avgInterval >= 6 && avgInterval <= 8) frequency = "weekly";
      else if (avgInterval >= 25 && avgInterval <= 35) frequency = "monthly";
      else if (avgInterval >= 85 && avgInterval <= 95) frequency = "quarterly";
      else if (avgInterval >= 350 && avgInterval <= 380) frequency = "yearly";

      if (!frequency) continue;

      // Confidence
      const expectedInPeriod = Math.floor(
        dayjs(sorted[sorted.length - 1].date).diff(dayjs(sorted[0].date), "day") / avgInterval
      ) + 1;
      const confidence = Math.min(1, sorted.length / Math.max(expectedInPeriod, 1));

      if (confidence < 0.7) continue;

      // Skip already confirmed/dismissed
      const existing = recurringRecords?.find(
        (r) => r.user_pattern_key === key && (r.status === "confirmed" || r.status === "dismissed")
      );
      if (existing) continue;

      const amounts = sorted.map((t) => t.amount);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = Math.sqrt(
        amounts.reduce((s, a) => s + (a - avgAmount) ** 2, 0) / amounts.length
      );

      const cat = categoryMap.get(sorted[0].category_id);
      const lastTxn = sorted[sorted.length - 1];

      patterns.push({
        pattern_key: key,
        wallet_id: sorted[0].wallet_id,
        category_id: sorted[0].category_id,
        category_name: cat?.name || "?",
        category_icon: cat?.icon || "CircleDollarSign",
        amount: Math.round(avgAmount),
        amount_variance: Math.round(variance),
        frequency,
        avg_interval_days: Math.round(avgInterval),
        occurrences: sorted.length,
        confidence: Math.round(confidence * 100) / 100,
        last_date: lastTxn.date,
        next_expected: dayjs(lastTxn.date).add(Math.round(avgInterval), "day").valueOf(),
      });
    }

    return patterns.sort((a, b) => b.confidence - a.confidence || b.occurrences - a.occurrences);
  };

  return {
    isLoading,
    transactions: transactions || [],
    categories: categories || [],
    wallets: wallets || [],
    recurringRecords: recurringRecords || [],
    categoryMap,
    monthlyData,
    getCashFlowData,
    getCategoryBreakdown,
    getDailyHeatmap,
    getMonthComparison,
    getInsights,
    getSavingRate,
    getForecast,
    detectRecurring,
  };
}
