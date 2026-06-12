import { db } from "./db";

export async function exportAllData() {
  const data = {
    wallets: await db.wallets.toArray(),
    categories: await db.categories.toArray(),
    transactions: await db.transactions.toArray(),
    debt_loans: await db.debt_loans.toArray(),
    exportDate: Date.now(),
    version: 1
  };
  return data;
}

import { z } from "zod";

const walletSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  current_balance: z.number(),
  created_at: z.number().optional(),
  updated_at: z.number().optional()
});

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['income', 'expense']),
  icon: z.string().optional(),
  created_at: z.number().optional()
});

const transactionSchema = z.object({
  id: z.string(),
  wallet_id: z.string(),
  category_id: z.string(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number(),
  date: z.number(),
  notes: z.string().optional(),
  sync_status: z.enum(['pending', 'synced']).optional()
});

const debtLoanSchema = z.object({
  id: z.string(),
  type: z.enum(['debt', 'loan']),
  person_name: z.string(),
  total_amount: z.number(),
  remaining_amount: z.number(),
  due_date: z.number(),
  status: z.enum(['active', 'paid']),
  notes: z.string().optional(),
  created_at: z.number().optional(),
  updated_at: z.number().optional()
});

const backupSchema = z.object({
  wallets: z.array(walletSchema).optional(),
  categories: z.array(categorySchema).optional(),
  transactions: z.array(transactionSchema).optional(),
  debt_loans: z.array(debtLoanSchema).optional(),
  exportDate: z.number().optional(),
  version: z.number().optional()
});

export function validateBackupData(data: any): boolean {
  try {
    backupSchema.parse(data);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Validation failed:', error);
    }
    return false;
  }
}

export async function importAllData(data: Record<string, unknown>) {
  // 1. Strict validation BEFORE clearing database
  const parsedData = backupSchema.safeParse(data);
  if (!parsedData.success) {
    throw new Error("Invalid backup data format. Restoration aborted to prevent data loss.");
  }

  const validData = parsedData.data;

  // 2. Perform clear and insert atomically
  return await db.transaction('rw', db.wallets, db.categories, db.transactions, db.debt_loans, async () => {
    // Clear existing data
    await db.wallets.clear();
    await db.categories.clear();
    await db.transactions.clear();
    await db.debt_loans.clear();

    // Insert new data
    if (validData.wallets?.length) await db.wallets.bulkAdd(validData.wallets as any[]);
    if (validData.categories?.length) await db.categories.bulkAdd(validData.categories as any[]);
    if (validData.transactions?.length) await db.transactions.bulkAdd(validData.transactions as any[]);
    if (validData.debt_loans?.length) await db.debt_loans.bulkAdd(validData.debt_loans as any[]);
  });
}

export function downloadJsonFile(data: Record<string, unknown>, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
