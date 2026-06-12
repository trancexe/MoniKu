"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import * as Icons from "lucide-react";
import { WalletForm } from "./WalletForm";
import { RevealStagger } from "@/components/ui/RevealStagger";

export function WalletList() {
  const wallets = useLiveQuery(() => db.wallets.toArray());

  if (!wallets) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 rounded bg-muted/60" />
          <div className="h-8 w-24 rounded bg-muted/60" />
        </div>
        <div className="grid gap-3">
          {[1,2,3].map(i => <div key={i} className="h-16 w-full rounded-xl bg-muted/60" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Dompet</h3>
        <WalletForm />
      </div>

      <div className="grid gap-3">
        <RevealStagger className="grid gap-3">
          {wallets?.map((wallet) => {
            const Icon = (Icons[wallet.icon as keyof typeof Icons] || Icons.Wallet) as React.ElementType;
            return (
              <div key={wallet.id} className="flex items-center rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-medium">{wallet.name}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">Rp {wallet.current_balance.toLocaleString("id-ID")}</p>
                </div>
              </div>
            );
          })}
        </RevealStagger>
        {wallets?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Belum ada dompet.</p>
        )}
      </div>
    </div>
  );
}
