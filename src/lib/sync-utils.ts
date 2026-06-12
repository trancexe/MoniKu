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

export async function importAllData(data: Record<string, unknown>) {
  return await db.transaction('rw', db.wallets, db.categories, db.transactions, db.debt_loans, async () => {
    // Clear existing data
    await db.wallets.clear();
    await db.categories.clear();
    await db.transactions.clear();
    await db.debt_loans.clear();

    // Insert new data
    if (data.wallets?.length) await db.wallets.bulkAdd(data.wallets);
    if (data.categories?.length) await db.categories.bulkAdd(data.categories);
    if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
    if (data.debt_loans?.length) await db.debt_loans.bulkAdd(data.debt_loans);
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
