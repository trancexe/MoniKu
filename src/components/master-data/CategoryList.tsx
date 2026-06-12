"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import * as Icons from "lucide-react";
import { CategoryForm } from "./CategoryForm";
import { RevealStagger } from "@/components/ui/RevealStagger";

export function CategoryList() {
  const categories = useLiveQuery(() => db.categories.toArray());
  const incomes = categories?.filter((c) => c.type === "income") || [];
  const expenses = categories?.filter((c) => c.type === "expense") || [];

  if (!categories) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 rounded bg-muted/60" />
          <div className="h-8 w-24 rounded bg-muted/60" />
        </div>
        <div className="space-y-3 mt-4">
          <div className="h-4 w-20 rounded bg-muted/60" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-20 w-full rounded-xl bg-muted/60" />)}
          </div>
        </div>
      </div>
    );
  }

  const renderList = (list: typeof categories, title: string) => (
    <div className="space-y-3 mt-4">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <RevealStagger className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list?.map((category) => {
          const Icon = (Icons[category.icon as keyof typeof Icons] || Icons.HelpCircle) as any;
          return (
            <div key={category.id} className="flex flex-col items-center justify-center space-y-2 rounded-xl border bg-card p-3 shadow-sm text-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${category.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{category.name}</span>
            </div>
          );
        })}
      </RevealStagger>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Kategori</h3>
        <CategoryForm />
      </div>

      {renderList(expenses, "Pengeluaran")}
      {renderList(incomes, "Pemasukan")}
    </div>
  );
}
