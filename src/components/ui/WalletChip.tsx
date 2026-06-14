"use client";

import * as React from "react";

export interface WalletChipProps {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  /**
   * Optional right-aligned balance (e.g. `"Rp 500.000"`). Omit to render
   * the chip as a pure label — the "Semua" chip on the dashboard does
   * this because the aggregate balance is already shown in the Total
   * Balance Card directly above.
   *
   * When the caller wants the balance hidden entirely (e.g. user toggled
   * hide-balance), pass `undefined`. Don't pre-render `•••` here — keep
   * this component free of feature-level privacy state.
   */
  amount?: string;
}

/**
 * Pill-shaped filter chip used in the dashboard and transaction history
 * wallet selectors. Mirrors the visual treatment of the all/income/expense
 * filter chips in `TransactionHistory` so the two filter rows feel like
 * the same control family.
 */
export function WalletChip({ label, icon: Icon, amount, active, onClick }: WalletChipProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-[0.97] ${
        active
          ? "bg-zinc-900 text-zinc-50 shadow dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {amount && (
        <>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span className="tabular-nums opacity-80">{amount}</span>
        </>
      )}
    </button>
  );
}
