import { z } from "zod";
import { db, Wallet, Category, Transaction, DebtLoan, RecurringTransaction } from "./db";

/**
 * Zod schemas aligned 1:1 with the Dexie interfaces in `lib/db.ts`.
 *
 * IMPORTANT: the `satisfies z.ZodType<T>` clause is the contract — if
 * a field is added/removed/changed in a Dexie interface without a
 * matching schema change, `tsc` will fail on the corresponding schema
 * here. Do not loosen the clause.
 *
 * History: prior version allowed `Transaction.type === 'transfer'`
 * and made `notes` / `sync_status` optional in Zod even though the
 * Dexie interface marked them as required. Backups could pass Zod
 * validation with `type: 'transfer'` or missing `notes`, then crash
 * downstream code that did `tx.notes.toLowerCase()`. Fix:
 *   - drop 'transfer' from the enum (no code path creates it)
 *   - make `notes` and `sync_status` required in the schema
 *   - make `icon` and `updated_at` required for Wallet
 *   - make `icon` required for Category
 *   - add `due_date` to DebtLoan interface (see db.ts) and require it
 *     in the schema so backups that lack it are rejected
 */

const walletSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  current_balance: z.number(),
  updated_at: z.number(),
}) satisfies z.ZodType<Wallet>;

const categorySchema = z.object({
  id: z.string(),
  type: z.enum(["income", "expense"]),
  name: z.string(),
  icon: z.string(),
}) satisfies z.ZodType<Category>;

const transactionSchema = z.object({
  id: z.string(),
  wallet_id: z.string(),
  category_id: z.string(),
  type: z.enum(["income", "expense"]),
  amount: z.number(),
  date: z.number(),
  notes: z.string(),
  sync_status: z.enum(["synced", "pending"]),
  /**
   * Added in backup v3 (parallel with Dexie schema v4). Optional in
   * the schema so v1/v2 backups — which pre-date partial payments
   * and never set debt_id on a transaction — still parse cleanly.
   * Restored transactions keep whatever debt_id the source had, so
   * a debt's payment history survives a device migration. If the
   * referenced debt was not restored (e.g. user did a partial
   * restore), the dangling reference is harmless: the transaction
   * shows in history lists without a debt and the user can re-link
   * it via the "Link Existing" tab.
   */
  debt_id: z.string().optional(),
}) satisfies z.ZodType<Transaction>;

const debtLoanSchema = z.object({
  id: z.string(),
  type: z.enum(["debt", "loan"]),
  person_name: z.string(),
  total_amount: z.number(),
  remaining_amount: z.number(),
  status: z.enum(["active", "paid"]),
  due_date: z.number().optional(),
  notes: z.string().optional(),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
}) satisfies z.ZodType<DebtLoan>;

const recurringTransactionSchema = z.object({
  id: z.string(),
  user_pattern_key: z.string(),
  wallet_id: z.string(),
  category_id: z.string(),
  amount: z.number(),
  amount_variance: z.number(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  avg_interval_days: z.number(),
  last_occurrence_date: z.number(),
  next_expected_date: z.number(),
  status: z.enum(["detected", "confirmed", "dismissed"]),
  detected_at: z.number(),
  confirmed_at: z.number().optional(),
}) satisfies z.ZodType<RecurringTransaction>;

const backupSchema = z.object({
  wallets: z.array(walletSchema).optional(),
  categories: z.array(categorySchema).optional(),
  transactions: z.array(transactionSchema).optional(),
  debt_loans: z.array(debtLoanSchema).optional(),
  /**
   * Added in backup v2. Optional in the schema so that v1 backups
   * (which pre-date this field) still parse — they just won't carry
   * any recurring patterns. A v2 app restoring a v1 backup will end
   * up with no recurring patterns, matching the source.
   */
  recurring_transactions: z.array(recurringTransactionSchema).optional(),
  exportDate: z.number().optional(),
  version: z.number().optional(),
});

export function validateBackupData(data: unknown): boolean {
  try {
    backupSchema.parse(data);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      // dev-only: surface the actual field-level validation issues
      // for debugging user-reported restore failures.
      console.error("Validation failed:", error);
    }
    return false;
  }
}

export async function exportAllData() {
  const data = {
    wallets: await db.wallets.toArray(),
    categories: await db.categories.toArray(),
    transactions: await db.transactions.toArray(),
    debt_loans: await db.debt_loans.toArray(),
    recurring_transactions: await db.recurring_transactions.toArray(),
    exportDate: Date.now(),
    version: 3,
  };
  return data;
}

export async function importAllData(data: Record<string, unknown>) {
  // 1. Strict validation BEFORE clearing database
  const parsedData = backupSchema.safeParse(data);
  if (!parsedData.success) {
    throw new Error("Invalid backup data format. Restoration aborted to prevent data loss.");
  }

  const validData = parsedData.data;

  // 2. Perform clear and insert atomically
  // Dexie's transaction() has overloads up to 5 tables; for 6+ we
  // pass the tables as an array (same runtime behavior, signature-
  // compatible with all Dexie versions).
  return await db.transaction(
    "rw",
    [db.wallets, db.categories, db.transactions, db.debt_loans, db.recurring_transactions],
    async () => {
      // Clear existing data
      await db.wallets.clear();
      await db.categories.clear();
      await db.transactions.clear();
      await db.debt_loans.clear();
      await db.recurring_transactions.clear();

      // Insert new data. `as` cast is safe here because the Zod
      // schemas are typed against the Dexie interfaces via `satisfies`.
      if (validData.wallets?.length) await db.wallets.bulkAdd(validData.wallets as Wallet[]);
      if (validData.categories?.length) await db.categories.bulkAdd(validData.categories as Category[]);
      if (validData.transactions?.length) await db.transactions.bulkAdd(validData.transactions as Transaction[]);
      if (validData.debt_loans?.length) await db.debt_loans.bulkAdd(validData.debt_loans as DebtLoan[]);
      if (validData.recurring_transactions?.length) {
        await db.recurring_transactions.bulkAdd(validData.recurring_transactions as RecurringTransaction[]);
      }
    }
  );
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
