"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function CategoryList() {
  const categories = useLiveQuery(() => db.categories.toArray());
  const incomes = categories?.filter((c) => c.type === "income") || [];
  const expenses = categories?.filter((c) => c.type === "expense") || [];

  const renderList = (list: typeof categories, title: string) => (
    <div className="space-y-3 mt-4">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list?.map((category) => {
          // @ts-ignore
          const Icon = Icons[category.icon] || Icons.HelpCircle;
          return (
            <div key={category.id} className="flex flex-col items-center justify-center space-y-2 rounded-xl border bg-card p-3 shadow-sm text-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${category.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{category.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Kategori</h3>
        <Button variant="outline" size="sm" className="h-8">
          <Plus className="mr-1 h-4 w-4" /> Tambah
        </Button>
      </div>

      {renderList(expenses, "Pengeluaran")}
      {renderList(incomes, "Pemasukan")}
    </div>
  );
}
