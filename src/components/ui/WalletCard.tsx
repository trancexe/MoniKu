"use client";

import * as React from "react";

export interface WalletCardProps {
  label: string;
  icon: React.ElementType;
  /**
   * Pre-formatted amount (e.g. `"Rp 500.000"`). When omitted, the bottom
   * row is reserved with a min-height placeholder so the card stays the
   * same height as its siblings. Caller decides what to show:
   * - per-wallet cards: `formatCurrency(wallet.current_balance)`
   * - hidden-balance state: `"Rp •••••"` (matches Total Balance Card)
   */
  amount?: string;
  active: boolean;
  onClick: () => void;
}

/**
 * Wallet selector card used in the home dashboard. Visually a smaller
 * sibling of the Total Balance Card: same active-state treatment
 * (zinc-950 / zinc-100 inverted), but with an icon + label row above
 * the amount so a horizontal scroll can show all wallets at a glance.
 *
 * Pairs with `WalletChip` (compact variant used in the transaction
 * history page) — same contract, different visual density.
 */
export function WalletCard({ label, icon: Icon, amount, active, onClick }: WalletCardProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex min-w-[160px] shrink-0 flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ease-smooth duration-smooth active:scale-[0.98] ${
        active
          ? "border-zinc-950 bg-zinc-950 text-zinc-50 shadow-xl shadow-black/10 dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:hover:border-zinc-800"
      }`}
    >
      <div className="flex w-full items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
        <span className="truncate text-[11px] font-medium opacity-80">{label}</span>
      </div>
      <div className="min-h-[1.25rem] text-sm font-semibold leading-tight tabular-nums">
        {amount ?? ""}
      </div>
    </button>
  );
}
