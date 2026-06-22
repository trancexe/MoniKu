import { db, DebtLoan, Transaction } from "./db";
import { logError } from "./logger";

/**
 * `recalculateDebt` is the single source of truth for keeping a
 * debt's `remaining_amount` and `status` consistent with the set of
 * transactions linked to it via `Transaction.debt_id`.
 *
 * Call this whenever a transaction is added, linked, unlinked,
 * edited, or deleted from a debt. The function:
 *
 *   1. Loads the debt by id. If it does not exist, no-op.
 *   2. Queries all transactions with `debt_id === debtId` via the
 *      `debt_id` index introduced in Dexie schema v4.
 *   3. Sums the payment amount, filtering by type:
 *        - debt  (user owes): only 'expense' transactions count
 *        - loan  (user is owed): only 'income' transactions count
 *      The filter is defense-in-depth: the UI normally only shows
 *      the matching type in the "Link Existing" tab, but a wrong-
 *      type row can sneak in via backup restore or manual DB edit.
 *      Without the filter, an income row linked to a debt would
 *      inflate the paid sum and underflow the remaining.
 *   4. Sets `remaining_amount = max(0, total_amount - paid_sum)`.
 *      Overpayment is clamped at 0 — the debt shows 'paid' even if
 *      the linked transactions sum to more than `total_amount`.
 *      Per the feature brief, the surplus is not refunded or
 *      redistributed; the user can unlink the offending row if
 *      it was a mistake.
 *   5. Sets `status = 'paid'` when remaining_amount === 0,
 *      otherwise `'active'`.
 *
 * Idempotent: calling twice in a row with no changes produces no
 * diff. Safe to call on every link/unlink.
 *
 * Callers (TransactionEditSheet, TransactionDeleteDialog, DebtDetailClient
 * unlink path) should invoke `recalculateDebt(debtId)` AFTER mutating
 * transactions to keep the debt's `remaining_amount` and `status` in sync.
 * The function is idempotent and silent on no-op.
 *
 * Concurrency: a multi-tab user could trigger two parallel
 * recalculations and race the final `db.debt_loans.update`. Dexie's
 * transaction wrapper would not help here because the two recalcs
 * are separate transactions. The race is benign — both would write
 * the same `remaining_amount` and `status` because the calculation
 * is deterministic from the set of linked transactions. Not worth
 * the complexity to lock.
 */
export async function recalculateDebt(debtId: string): Promise<void> {
  try {
    const debt = await db.debt_loans.get(debtId);
    if (!debt) {
      // The debt was deleted while a payment was in flight. Quietly
      // no-op — the caller (modal/page) will see the deletion via
      // useLiveQuery and bail out.
      return;
    }

    const linked = await db.transactions
      .where("debt_id")
      .equals(debtId)
      .toArray();

    const paidSum = sumPaymentsForDebt(linked, debt.type);

    const newRemaining = Math.max(0, debt.total_amount - paidSum);
    const newStatus: DebtLoan["status"] = newRemaining === 0 ? "paid" : "active";

    // Skip the write if nothing actually changed — keeps the
    // useLiveQuery listeners from re-running on every recalc.
    if (newRemaining === debt.remaining_amount && newStatus === debt.status) {
      return;
    }

    await db.debt_loans.update(debtId, {
      remaining_amount: newRemaining,
      status: newStatus,
      updated_at: Date.now(),
    });
  } catch (error) {
    // Don't throw — the caller has already committed the transaction
    // (or performed the unlink) and the UI should not blow up. Log
    // and leave the debt in its previous state; the next link/unlink
    // or app launch will trigger another recalc.
    logError(`recalculateDebt failed for ${debtId}`, error);
  }
}

/**
 * Pure function — exported for testability. Sums the `amount` of
 * linked transactions in the direction that counts as "payment"
 * for the given debt type.
 */
export function sumPaymentsForDebt(
  linked: Transaction[],
  debtType: DebtLoan["type"]
): number {
  // 'debt'  (user owes)  → expense = paying down
  // 'loan'  (user is owed) → income  = receiving back
  const matchingType: Transaction["type"] = debtType === "debt" ? "expense" : "income";
  let sum = 0;
  for (const tx of linked) {
    if (tx.type === matchingType) {
      sum += tx.amount;
    }
  }
  return sum;
}
