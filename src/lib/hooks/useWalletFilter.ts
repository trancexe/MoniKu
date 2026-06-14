"use client";

import { useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { db, type Wallet } from "@/lib/db";

/**
 * Single source of truth for the wallet-filter URL contract.
 * Used by both the dashboard and the transaction history page.
 */
export const WALLET_QUERY_PARAM = "wallet";

interface UseWalletFilterResult {
  /** Raw id from `?wallet=<id>`, may point to a deleted wallet. */
  selectedWalletId: string | null;
  /**
   * Wallet id that actually resolves to an existing record.
   * Stale ids (e.g. wallet was deleted while the URL still points to it)
   * collapse to `null` so consumers can render the unfiltered state.
   */
  effectiveWalletId: string | null;
  selectedWallet: Wallet | undefined;
  wallets: Wallet[];
  isLoading: boolean;
  setWalletFilter: (walletId: string | null) => void;
}

/**
 * Reads the active wallet filter from `?wallet=<id>` and provides a setter
 * that rewrites the URL via `router.replace(..., { scroll: false })` so the
 * back-button history isn't polluted.
 *
 * Must be used inside a `<Suspense>` boundary because `useSearchParams` is
 * not statically renderable in `output: "export"` mode.
 */
export function useWalletFilter(): UseWalletFilterResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wallets = useLiveQuery(() => db.wallets.toArray());

  const selectedWalletId = searchParams.get(WALLET_QUERY_PARAM);

  const selectedWallet = useMemo(
    () =>
      selectedWalletId
        ? (wallets ?? []).find((w) => w.id === selectedWalletId)
        : undefined,
    [selectedWalletId, wallets]
  );

  const effectiveWalletId = selectedWallet?.id ?? null;

  const setWalletFilter = useCallback(
    (walletId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (walletId) {
        params.set(WALLET_QUERY_PARAM, walletId);
      } else {
        params.delete(WALLET_QUERY_PARAM);
      }
      const qs = params.toString();
      // Use window.location.pathname so the same hook works from any route
      // (/, /transactions/history, …) without the consumer passing it in.
      const path =
        typeof window !== "undefined" ? window.location.pathname : "/";
      router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
    },
    [router, searchParams]
  );

  return {
    selectedWalletId,
    effectiveWalletId,
    selectedWallet,
    wallets: wallets ?? [],
    isLoading: wallets === undefined,
    setWalletFilter,
  };
}
