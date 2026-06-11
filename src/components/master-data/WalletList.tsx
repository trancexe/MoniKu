"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function WalletList() {
  const wallets = useLiveQuery(() => db.wallets.toArray());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Dompet</h3>
        <Button variant="outline" size="sm" className="h-8">
          <Plus className="mr-1 h-4 w-4" /> Tambah
        </Button>
      </div>

      <div className="grid gap-3">
        {wallets?.map((wallet) => {
          // @ts-ignore
          const Icon = Icons[wallet.icon] || Icons.Wallet;
          return (
            <div key={wallet.id} className="flex items-center rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="ml-4 flex-1">
                <p className="font-medium">{wallet.name}</p>
                <p className="text-sm text-muted-foreground">Rp {wallet.current_balance.toLocaleString("id-ID")}</p>
              </div>
            </div>
          );
        })}
        {wallets?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Belum ada dompet.</p>
        )}
      </div>
    </div>
  );
}
