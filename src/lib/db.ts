import Dexie, { type EntityTable } from 'dexie';

export interface Wallet {
  id: string;
  name: string;
  icon: string;
  current_balance: number;
  updated_at: number;
}

export interface Category {
  id: string;
  type: 'income' | 'expense';
  name: string;
  icon: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  category_id: string;
  type: 'income' | 'expense';
  amount: number;
  date: number;
  notes: string;
  sync_status: 'synced' | 'pending';
}

export interface DebtLoan {
  id: string;
  type: 'debt' | 'loan';
  person_name: string;
  total_amount: number;
  remaining_amount: number;
  status: 'active' | 'paid';
  /**
   * Optional. The current `DebtForm` does not collect this — it is
   * reserved for a future "due date" feature. When added, change to
   * `due_date: number` (required) and update `DebtForm.tsx` plus the
   * Zod schema in `lib/sync-utils.ts` to require it on import.
   */
  due_date?: number;
  notes?: string;
  created_at?: number;
  updated_at?: number;
}

export interface RecurringTransaction {
  id: string;
  user_pattern_key: string;      // normalized key: wallet_id + category_id + amount_bucket
  wallet_id: string;
  category_id: string;
  amount: number;                // avg or most-recent
  amount_variance: number;       // std dev (for forecast confidence)
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  avg_interval_days: number;     // actual avg
  last_occurrence_date: number;
  next_expected_date: number;    // computed: last + avg_interval
  status: 'detected' | 'confirmed' | 'dismissed';
  detected_at: number;
  confirmed_at?: number;
}

export const db = new Dexie('FinTrackDB') as Dexie & {
  wallets: EntityTable<Wallet, 'id'>;
  categories: EntityTable<Category, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
  debt_loans: EntityTable<DebtLoan, 'id'>;
  recurring_transactions: EntityTable<RecurringTransaction, 'id'>;
  security: EntityTable<{ key: string; value: string }, 'key'>;
};

// Schema declaration
db.version(1).stores({
  wallets: 'id, name, updated_at', // Primary key and indexed props
  categories: 'id, type, name',
  transactions: 'id, wallet_id, category_id, type, date, sync_status',
  debt_loans: 'id, type, person_name, status'
});

// v2: Add recurring_transactions table for analytics Tier 1
db.version(2).stores({
  wallets: 'id, name, updated_at',
  categories: 'id, type, name',
  transactions: 'id, wallet_id, category_id, type, date, sync_status',
  debt_loans: 'id, type, person_name, status',
  recurring_transactions: 'id, status, frequency, next_expected_date, [wallet_id+category_id]'
});

// v3: Add security table for sensitive material (PIN hash/salt, lockout state).
// Stored in IndexedDB instead of localStorage to reduce XSS-exfiltration
// surface: localStorage is readable by any script on the origin, while
// IndexedDB access is constrained by the same-origin policy and is
// typically enumerated separately from JSX/data paths.
db.version(3).stores({
  wallets: 'id, name, updated_at',
  categories: 'id, type, name',
  transactions: 'id, wallet_id, category_id, type, date, sync_status',
  debt_loans: 'id, type, person_name, status, due_date',
  recurring_transactions: 'id, status, frequency, next_expected_date, [wallet_id+category_id]',
  security: 'key'
});
