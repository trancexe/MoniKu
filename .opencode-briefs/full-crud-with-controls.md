# MoniKu: Edit/Delete untuk Semua Data + Internal Controls

## Context

MoniKu adalah PWA pencatat keuangan local-first (Next.js 16 + React 19 + Dexie/IndexedDB).
User (Ingga) minta SEMUA data input harus bisa di-edit dan di-delete, plus internal control
dan warning yang konsisten. Bahasa UI: Indonesia. Kode/comments English.

**Audit status sekarang (sudah saya baca semua file terkait):**

| Entitas | Create | Read | Update | Delete | Internal Control |
|---------|--------|------|--------|--------|------------------|
| Transaction | ✓ (`TransactionForm`) | ✓ (history, dashboard) | ✓ (`TransactionEditSheet`) | ✓ (`TransactionDeleteDialog`) | ✓ negative-balance warning, re-entrancy guard |
| Wallet | ✓ (`WalletForm`) | ✓ (`WalletList`) | **❌ tidak ada** | **❌ tidak ada** | ❌ |
| Category | ✓ (`CategoryForm`) | ✓ (`CategoryList`) | **❌ tidak ada** | **❌ tidak ada** | ❌ |
| DebtLoan | ✓ (`DebtForm`) | ✓ (`DebtList` + detail) | **❌ tidak ada** | ⚠ pakai `window.confirm()` | ❌ |
| DebtLink (unlink) | n/a (auto) | ✓ (terlihat di detail) | n/a | ⚠ pakai `window.confirm()` | ❌ |
| RecurringTx | auto-detect | ✓ (analytics) | ✓ (mark/ignore) | ✓ (remove) | ✓ processing state |

**Bug kritis yang ditemukan saat audit (WUJUD SEBELUM kerjakan):**

1. **`TransactionEditSheet` tidak recalculate debt setelah edit transaksi yang linked ke debt.**
   Lihat `src/components/transactions/TransactionEditSheet.tsx:118-126`. Field `debt_id`
   di-transaction TIDAK hilang (Dexie `update()` cuma modify field disebut), TAPI
   `remaining_amount` dan `status` debt jadi stale kalau amount/wallet/type berubah.
   Contoh: debt 1000, bayar 500 → remaining 500. User edit payment jadi 600 →
   transaction.amount = 600, debt.remaining_amount MASIH 500 (seharusnya 400).

2. **`TransactionDeleteDialog` tidak recalculate debt setelah delete transaksi linked.**
   Lihat `src/components/transactions/TransactionDeleteDialog.tsx:36-51`. Delete payment
   dari debt → transaction hilang, saldo dompet di-reverse, TAPI debt.remaining_amount
   dan status tidak di-recalculate.

3. **`DebtDetailClient` pakai `window.confirm()` (2 tempat).** Lines 61 dan 73.
   Tidak konsisten dengan pola Dialog shadcn yang dipakai di seluruh app.

## Goal

Tutup gap audit di atas. Hasil akhir: SEMUA data bisa di-edit/di-delete dari UI,
dengan confirmation dialog yang proper (bukan `window.confirm`), dan internal
control untuk sinkronisasi debt ↔ transactions.

## Constraints

- **JANGAN ubah schema Dexie** (`src/lib/db.ts`). Pakai entity yang ada.
- **JANGAN ubah `TransactionForm.tsx`** (logika sudah mature). Cukup `TransactionEditSheet`
  dan `TransactionDeleteDialog`.
- **JANGAN ubah `db.ts`, `seed.ts`, `webauthn.ts`, `crypto-utils.ts`** (di luar scope).
- **JANGAN ubah `RepaymentModal.tsx`** (sudah ada numpad, sudah linked ke recalculateDebt).
- **JANGAN commit.** User review manual.
- **JANGAN ubah AGENTS.md / package.json / tsconfig.json / eslint.config.mjs.**
- **JANGAN hapus file lama tanpa memastikan sudah ada pengganti.**
- Pakai Dialog shadcn (lihat `src/components/ui/dialog.tsx`) untuk semua confirmation.
  Pola style lihat `TransactionDeleteDialog.tsx` (variant="destructive").
- Bahasa i18n: tambah key di `src/lib/i18n/locales/id.json` DAN `en.json` (parity).
- Tidak ada `window.confirm()`, `alert()`, atau `prompt()` lagi di codebase.
- Per AGENTS.md: "NOT the Next.js you know". Baca `node_modules/next/dist/docs/` kalau
  perlu referensi pattern static export.

## Pattern Referensi (yang sudah ada, jangan ubah style-nya)

- **TransactionEditSheet** (`src/components/transactions/TransactionEditSheet.tsx`)
  - Sheet bottom dengan numpad di bawah, field di-scroll di atas
  - Tombol "Hapus" merah di paling bawah content area (line 326-335)
  - `TransactionDeleteDialog` di-trigger dari situ
  - Re-entrancy guard via `isSubmitting` state
- **TransactionDeleteDialog** (`src/components/transactions/TransactionDeleteDialog.tsx`)
  - Dialog standard: header + preview item + footer (Cancel + Delete destructive)
  - Toast success/failure
- **RecurringDetection delete button** (`src/components/analytics/RecurringDetection.tsx:216-225`)
  - Icon-only button di kanan card: `h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10`
- **DebtDetailClient header** (`src/app/debts/detail/DebtDetailClient.tsx:117-128`)
  - Pattern header dengan tombol back + tombol delete di kanan

## Per-File Changes

### 1. `src/components/ui/ConfirmDialog.tsx` (NEW)

Reusable confirmation dialog. Props:
```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | React.ReactNode;  // string OR rich content (untuk warning list)
  confirmLabel?: string;                   // default: t("common.delete")
  cancelLabel?: string;                    // default: t("common.cancel")
  variant?: "destructive" | "default";     // default destructive
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}
```

Body: pakai `<Dialog>` + `<DialogContent>` + `<DialogHeader>` (Title + Description)
+ `<DialogFooter>` (Cancel outline + Confirm destructive/default).
Description support ReactNode supaya caller bisa render list warning
(mis. "5 transaksi akan kehilangan referensi").

Export dari file ini. Jangan register di `src/components/ui/index.ts` kalau tidak ada.

### 2. `src/lib/debt-utils.ts` (MODIFY)

Tambah helper **WAJIB** yang akan dipanggil dari TransactionEditSheet & TransactionDeleteDialog:

```typescript
/**
 * Returns the debt_id of a transaction, or undefined if not linked.
 * Used by edit/delete paths to know whether to recalculate the debt after.
 */
export function getDebtIdForTx(tx: Pick<Transaction, "debt_id">): string | undefined {
  return tx.debt_id;
}
```

Sebenarnya ini trivial — caller cukup `if (transaction.debt_id) await recalculateDebt(transaction.debt_id)`.
**TIDAK PERLU** helper baru kalau caller cukup 2-baris. Cukup tambahkan **comment** di atas
`recalculateDebt` yang sudah ada untuk提醒 caller pattern-nya:

> Callers (TransactionEditSheet, TransactionDeleteDialog, DebtDetailClient unlink path)
> should invoke `recalculateDebt(debtId)` AFTER mutating transactions to keep the debt's
> `remaining_amount` and `status` in sync. The function is idempotent and silent on no-op.

Skip the helper. Just update the existing doc-comment.

### 3. `src/components/transactions/TransactionEditSheet.tsx` (MODIFY — bug fix)

**Critical: recalculate debt setelah edit.**

Di `executeUpdate` (sekitar line 82-140), TAMBAHKAN sebelum `toast.success(t("transaction.updated"))`:

```typescript
if (transaction.debt_id) {
  // Recalculate the linked debt's remaining_amount and status because
  // the transaction's amount/type may have changed. recalculateDebt is
  // idempotent and swallows errors (see debt-utils.ts).
  await recalculateDebt(transaction.debt_id);
}
```

Tambah import `import { recalculateDebt } from "@/lib/debt-utils";` di top file.

Catatan: field `debt_id` di transaction TIDAK hilang dari update (Dexie `update()` partial).
Tapi kalau user ganti `type` (income/expense) atau `amount`, debt perlu recalc.
Wallet change TIDAK affect debt (debt cuma peduli amount + type), tapi untuk konsistensi
dan safety tetap recalculate.

### 4. `src/components/transactions/TransactionDeleteDialog.tsx` (MODIFY — bug fix)

**Critical: recalculate debt setelah delete.**

Di `handleDelete` (line 32-60), TAMBAHKAN di dalam transaction wrapper atau setelah:

```typescript
if (transaction.debt_id) {
  await recalculateDebt(transaction.debt_id);
}
```

Tambah import `import { recalculateDebt } from "@/lib/debt-utils";` di top.

Posisikan: di dalam `db.transaction()` block TIDAK bisa (recalculateDebt bukan bagian dari
tx yang sama). Taruh SETELAH `db.transaction(...)` resolve (line 52, setelah `await db.transaction`).
recalculateDebt baca transactions & update debt di transaction terpisah — aman.

### 5. `src/components/master-data/WalletForm.tsx` (MODIFY — add edit mode)

Refactor supaya bisa create + edit. Pattern: optional prop `wallet?: Wallet | null`.

- Tambah prop `wallet?: Wallet | null` ke component. Default `null` = create mode.
- Kalau `wallet` ada:
  - Default state `name = wallet.name`, `balance = String(wallet.current_balance)`,
    `icon = wallet.icon`. Pakai `useEffect` untuk populate saat dialog open + wallet prop
    berubah.
  - Title dialog jadi `t("wallet.editWallet")`.
  - Tombol submit jadi `t("common.save")`.
  - Handler jadi `db.wallets.update(wallet.id, { name, icon, current_balance: Number(balance), updated_at: Date.now() })`
    instead of `db.wallets.add(...)`. Toast `t("wallet.updated")`.
- Validasi schema sama (name required, balance numeric, non-negative).

Style: biarkan structure `<Dialog>` + `<DialogContent>` existing. Tidak perlu Sheet pattern.

### 6. `src/components/master-data/CategoryForm.tsx` (MODIFY — add edit mode)

Sama pattern dengan WalletForm.

- Tambah prop `category?: Category | null`.
- Default state populated dari prop saat edit.
- Title dialog jadi `t("category.editCategory")`.
- Handler `db.categories.update(category.id, { name, type, icon })` kalau edit.
- Toast `t("category.updated")`.

### 7. `src/components/master-data/WalletList.tsx` (MODIFY)

Tambah tombol edit + delete di setiap card wallet. Pattern icon-only button.

- State: `const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);`
- State: `const [deletingWallet, setDeletingWallet] = useState<Wallet | null>(null);`
- Setiap card jadi `<div>` (existing) dengan dua icon button di kanan:
  - Edit (Pencil icon): `onClick={() => setEditingWallet(wallet)}`
  - Delete (Trash2 icon): `onClick={() => setDeletingWallet(wallet)}`
- Style tombol: `h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted` (edit) dan
  `hover:bg-destructive/10 hover:text-destructive` (delete). Pattern lihat
  RecurringDetection line 216-225.
- Render di akhir:
  ```jsx
  <WalletForm wallet={editingWallet} onOpenChange={(o) => !o && setEditingWallet(null)} />
  ```
  CATATAN: WalletForm perlu handle open state via prop juga. Tambahkan prop
  `open?: boolean` dan `onOpenChange?: (open: boolean) => void` ke WalletForm.
  Default behavior (kalau prop undefined) = manage sendiri seperti sekarang.
- Delete: pakai `ConfirmDialog` (komponen #1):
  - Title: `t("wallet.deleteTitle")`
  - Description: render `<div>` dengan summary wallet (nama + saldo) +
    warning "Dompet yang dihapus tidak dapat dikembalikan. Transaksi yang terkait
    akan kehilangan referensi dompet dan ditampilkan dengan dompet 'Lainnya'.".
    Pakai template i18n dengan parameter count transaksi: `t("wallet.deleteDescWithCount", { count })`.
    Kalau count = 0, pakai versi generic `t("wallet.deleteDesc")`.
  - onConfirm:
    ```typescript
    await db.wallets.delete(wallet.id);
    toast.success(t("wallet.deleted"));
    ```
  - Hitung count dengan `useLiveQuery(() => db.transactions.where("wallet_id").equals(wallet.id).count(), [wallet?.id])`.
- Loading state pakai `isSubmitting` di ConfirmDialog.

### 8. `src/components/master-data/CategoryList.tsx` (MODIFY)

Sama pattern dengan WalletList.

- State `editingCategory` + `deletingCategory`.
- Setiap card tambah 2 icon button (edit + delete).
- Delete pakai `ConfirmDialog`:
  - Description: warning + count of transactions using this category.
    `t("category.deleteDescWithCount", { count })` kalau count > 0, else `t("category.deleteDesc")`.
  - onConfirm: `db.categories.delete(category.id)` + toast `t("category.deleted")`.

### 9. `src/components/debts/DebtEditSheet.tsx` (NEW)

Sheet untuk edit hutang/piutang. Pattern lihat `TransactionEditSheet.tsx`.

Props: `{ debt: DebtLoan | null; open: boolean; onOpenChange: (open: boolean) => void; onUpdated?: () => void }`.

Behavior:
- Edit HANYA untuk field `person_name` dan `notes` (saja, demi kesederhanaan — see design rationale di bawah).
- `type` dan `total_amount` read-only. Tampilkan info text: "Untuk mengubah tipe atau
  nominal total, hapus catatan dan buat baru." (`t("debt.detail.editLockedNote")`)
- Kalau user edit `person_name` dan/atau `notes`, simpan dengan `db.debt_loans.update()`.
- Re-entrancy guard `isSubmitting`.
- Toast `t("debt.updated")` on success.

**Design rationale untuk read-only type/total_amount:**
- `type` change akan affect initial transaction direction (income vs expense).
- `total_amount` change akan affect initial transaction amount dan saldo wallet.
- Mengubah keduanya butuh cascade edit ke initial transaction + wallet recalc = kompleks.
- Untuk v1 ini, lock field itu. Future enhancement bisa split "adjustment" mechanism.

Layout:
- SheetContent bottom, !h-[auto] (auto height, lebih kecil dari TransactionEdit).
- Header: "Edit Catatan"
- Form: person_name (text input) + notes (text input) + info text read-only type/total.
- Tombol Save di bawah.

### 10. `src/app/debts/detail/DebtDetailClient.tsx` (MODIFY)

**Replace 2x `window.confirm()` dengan `ConfirmDialog`.**

- Tambah import `ConfirmDialog` dari `@/components/ui/ConfirmDialog`.
- Tambah import `DebtEditSheet` dari `@/components/debts/DebtEditSheet`.
- Tambah state:
  - `const [editOpen, setEditOpen] = useState(false);` (untuk edit sheet)
  - `const [deleteDebtOpen, setDeleteDebtOpen] = useState(false);`
  - `const [unlinkTarget, setUnlinkTarget] = useState<string | null>(null);` (txId)
- Hapus `handleDeleteDebt` lama. Ganti dengan handler baru yang di-trigger ConfirmDialog:
  ```typescript
  const handleDeleteDebt = async () => {
    try {
      const txs = await db.transactions.where("debt_id").equals(id).toArray();
      await db.transaction("rw", db.transactions, db.debt_loans, async () => {
        for (const tx of txs) {
          await db.transactions.update(tx.id, { debt_id: undefined });
        }
        await db.debt_loans.delete(id);
      });
      toast.success(t("common.deleted"));
      router.push("/debts");
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("Delete failed", error);
      toast.error(t("common.deleteFailed"));
    } finally {
      setDeleteDebtOpen(false);
    }
  };
  ```
- Hapus `handleUnlink` yang pakai `confirm()`. Ganti:
  ```typescript
  const handleUnlink = async (txId: string) => {
    try {
      await db.transactions.update(txId, { debt_id: undefined });
      if (id) await recalculateDebt(id);
      toast.success(t("debt.modal.unlinkSuccess"));
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("Unlink failed", error);
      toast.error(t("debt.modal.unlinkFailed"));
    } finally {
      setUnlinkTarget(null);
    }
  };
  ```
- Tombol unlink di payment row (line 195-202) ganti `onClick` jadi:
  ```jsx
  onClick={(e) => { e.stopPropagation(); setUnlinkTarget(tx.id); }}
  ```
- Header (line 116-128) ganti tombol delete icon jadi `setDeleteDebtOpen(true)` + tambah
  tombol edit icon (Pencil) di sebelahnya. Tambah `aria-label={t("common.edit")}` di edit button.
  Pattern lihat `RecurringDetection.tsx:216-225` untuk icon button style.
- Render di akhir JSX (sebelum closing `</div>` root):
  ```jsx
  <DebtEditSheet debt={debt} open={editOpen} onOpenChange={setEditOpen} />
  <ConfirmDialog
    open={deleteDebtOpen}
    onOpenChange={setDeleteDebtOpen}
    title={t("debt.deleteTitle")}
    description={
      <div className="space-y-2">
        <p>{t("debt.deleteConfirmDesc")}</p>
        <p className="text-xs text-muted-foreground">{t("debt.deleteWithCountNote", { count: linkedTransactions?.length ?? 0 })}</p>
      </div>
    }
    confirmLabel={t("common.delete")}
    onConfirm={handleDeleteDebt}
  />
  <ConfirmDialog
    open={unlinkTarget !== null}
    onOpenChange={(o) => !o && setUnlinkTarget(null)}
    title={t("debt.detail.unlinkConfirmTitle")}
    description={t("debt.detail.unlinkConfirmDesc")}
    confirmLabel={t("debt.detail.unlink")}
    onConfirm={() => unlinkTarget && handleUnlink(unlinkTarget)}
  />
  ```

## i18n Additions

Tambah di `src/lib/i18n/locales/id.json` DAN `en.json` (parity WAJIB):

### `src/lib/i18n/locales/id.json` (tambah ke section yang sesuai)

```json
"wallet": {
  // ... existing
  "editWallet": "Edit Dompet",
  "updated": "Dompet berhasil diperbarui",
  "deleteTitle": "Hapus Dompet",
  "deleteDesc": "Dompet yang dihapus tidak dapat dikembalikan. Transaksi terkait akan kehilangan referensi dompet.",
  "deleteDescWithCount": "Dompet ini dipakai oleh {count} transaksi. Setelah dihapus, transaksi tersebut akan kehilangan referensi dompet dan ditampilkan dengan dompet 'Lainnya'.",
  "deleted": "Dompet berhasil dihapus",
  "deleteFailed": "Gagal menghapus dompet"
},
"category": {
  // ... existing
  "editCategory": "Edit Kategori",
  "updated": "Kategori berhasil diperbarui",
  "deleteTitle": "Hapus Kategori",
  "deleteDesc": "Kategori yang dihapus tidak dapat dikembalikan. Transaksi terkait akan ditampilkan sebagai 'Lainnya'.",
  "deleteDescWithCount": "Kategori ini dipakai oleh {count} transaksi. Setelah dihapus, transaksi tersebut akan ditampilkan sebagai 'Lainnya'.",
  "deleted": "Kategori berhasil dihapus",
  "deleteFailed": "Gagal menghapus kategori"
},
"debt": {
  // ... existing di section "detail"
  "editLockedNote": "Untuk mengubah tipe atau nominal total, hapus catatan dan buat baru.",
  "deleteTitle": "Hapus Catatan Hutang/Piutang",
  "deleteConfirmDesc": "Catatan hutang/piutang akan dihapus. Transaksi pembayaran yang terkait akan diputuskan dari catatan ini tetapi transaksi tetap ada di riwayat Anda.",
  "deleteWithCountNote": "{count} transaksi pembayaran terikat pada catatan ini akan diputuskan.",
  "updated": "Catatan berhasil diperbarui",
  "saveFailedEdit": "Gagal memperbarui catatan"
},
"common": {
  // ... existing
  "deleted": "Berhasil dihapus",
  "deleteFailed": "Gagal menghapus"
}
```

### `src/lib/i18n/locales/en.json`

Mirror semua key di atas dengan terjemahan Inggris yang natural. Contoh:
- `"editWallet": "Edit Wallet"`, `"updated": "Wallet updated"`, dst.

**Verifikasi parity**: pakai script atau grep manual setelah edit:
```bash
diff <(jq -r 'paths(scalars) | join(".")' src/lib/i18n/locales/id.json | sort) \
     <(jq -r 'paths(scalars) | join(".")' src/lib/i18n/locales/en.json | sort)
```
Harus kosong. Kalau tidak, fix.

## Verification (WAJIB dijalankan sebelum lapor selesai)

1. **TypeScript**: `npx tsc --noEmit` → 0 error baru.
   Pre-existing error di file yang TIDAK disentuh boleh muncul.
2. **Lint**: `npm run lint` → 0 error baru. Pre-existing boleh.
3. **Build**: `npm run build` → sukses.
4. **i18n parity**: diff id vs en keys (command di atas) → empty.
5. **Grep window.confirm/alert/prompt**: `grep -rn "window.confirm\|window.alert\|window.prompt\|confirm(\|alert(\|prompt(" src/` → tidak ada di file yang baru kita ubah.
   Boleh ada di file yang TIDAK disentuh (out of scope).
6. **Git diff scope**: `git diff --stat` → hanya file yang ada di brief ini.

## Dropped (TIDAK dilakukan di task ini)

- Edit `total_amount` atau `type` debt (lihat design rationale).
- Edit `debt_id` link dari transaction (butuh dedicated picker UI; future work).
- Cascade delete transactions saat delete wallet/category (data preservation principle —
  transaksi tetap ada dengan referensi orphan, ditampilin "Lainnya").
- Undo mechanism untuk destructive actions (lihat roadmap.md — planned).
- Edit `created_at`/`updated_at` fields (internal, jangan expose).
- Pindah ke Sheet pattern untuk wallet/category edit (Dialog cukup, konsisten dengan form create).
- Recurring transaction edit UI (di `RecurringDetection.tsx` — sudah ada edit via mark/ignore, di luar scope).
- Analytics page edit affordances (di luar scope — analytics read-only by design).
- Schema migration untuk FK constraint (lihat `db.ts` — saat ini pakai soft FK string).

## Critical Reminders

- **TIDAK commit.** Brief ini eksplisit minta review manual dulu.
- **Verifikasi `git diff --stat`** sebelum lapor. Kalau ada file di luar list, cek kenapa.
- **Pattern consistency**: Pakai style icon button yang sama dengan RecurringDetection.
- **Re-entrancy guard** (`isSubmitting`) WAJIB di semua submit handler.
- **Toast di SEMUA success/failure** path — pola existing.
- **Bahasa UI: Indonesia.** Kode/comments English.
- **Baca AGENTS.md**: Next.js 16 static export — pastikan tidak pakai dynamic route yang
  butuh server runtime.

## Report Format (yang opencode harus output)

```
=== Implementation Report ===

File changes:
  NEW:  src/components/ui/ConfirmDialog.tsx
  MOD:  src/components/transactions/TransactionEditSheet.tsx
  MOD:  src/components/transactions/TransactionDeleteDialog.tsx
  MOD:  src/components/master-data/WalletForm.tsx
  MOD:  src/components/master-data/WalletList.tsx
  MOD:  src/components/master-data/CategoryForm.tsx
  MOD:  src/components/master-data/CategoryList.tsx
  NEW:  src/components/debts/DebtEditSheet.tsx
  MOD:  src/app/debts/detail/DebtDetailClient.tsx
  MOD:  src/lib/i18n/locales/id.json
  MOD:  src/lib/i18n/locales/en.json
  MOD:  src/lib/debt-utils.ts  (doc comment update only)

Verification:
  npx tsc --noEmit: <pass/fail + error count>
  npm run lint:    <pass/fail + error count>
  npm run build:   <pass/fail + warning count>
  i18n parity:     <match/mismatch + key count>
  window.confirm:  <remaining count in modified files>

Blockers: <none / list>

Notes:
  - <any deviation from brief>
  - <any open question>
```

## Working Directory

`/home/inggapranata/project/MoniKu`

## Final Notes

Brief ini self-contained. Baca `src/lib/db.ts`, `src/lib/debt-utils.ts`, dan
file-file referensi yang disebut di "Pattern Referensi" sebelum coding.
Pre-existing errors/warnings di file yang TIDAK disentuh = di luar scope,
jangan perbaiki.
