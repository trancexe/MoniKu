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

export function validateBackupData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const checkArray = (arr: any) => arr === undefined || Array.isArray(arr);
  
  if (!checkArray(data.wallets) || 
      !checkArray(data.categories) || 
      !checkArray(data.transactions) || 
      !checkArray(data.debt_loans)) {
    return false;
  }

  const validateItem = (arr: any[], requiredKeys: string[]) => {
    if (arr && arr.length > 0) {
      const item = arr[0];
      return requiredKeys.every(key => key in item);
    }
    return true;
  };

  if (!validateItem(data.wallets, ['id', 'name', 'current_balance'])) return false;
  if (!validateItem(data.categories, ['id', 'type', 'name'])) return false;
  if (!validateItem(data.transactions, ['id', 'wallet_id', 'amount', 'date'])) return false;
  if (!validateItem(data.debt_loans, ['id', 'type', 'total_amount'])) return false;

  return true;
}

export async function importAllData(data: Record<string, unknown>) {
  if (!validateBackupData(data)) {
    throw new Error("Invalid backup data format. Restoration aborted to prevent data loss.");
  }

  return await db.transaction('rw', db.wallets, db.categories, db.transactions, db.debt_loans, async () => {
    // Clear existing data
    await db.wallets.clear();
    await db.categories.clear();
    await db.transactions.clear();
    await db.debt_loans.clear();

    // Insert new data
    if (data.wallets && Array.isArray(data.wallets) && data.wallets.length) await db.wallets.bulkAdd(data.wallets as any[]);
    if (data.categories && Array.isArray(data.categories) && data.categories.length) await db.categories.bulkAdd(data.categories as any[]);
    if (data.transactions && Array.isArray(data.transactions) && data.transactions.length) await db.transactions.bulkAdd(data.transactions as any[]);
    if (data.debt_loans && Array.isArray(data.debt_loans) && data.debt_loans.length) await db.debt_loans.bulkAdd(data.debt_loans as any[]);
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
