# MoniKu: Edit Transaksi di Halaman Hutang + Konsistensi Numpad

## Context

MoniKu adalah PWA local-first finance. Next.js 16 + React 19 + Dexie. Bahasa UI: Indonesia.

User (Ingga) melaporkan 2 bug pada halaman hutang (`/debts/detail`):

1. **Transaksi di payment history tidak bisa diedit.** Card cuma punya tombol "Putuskan" (unlink). Padahal `TransactionEditSheet` (di `src/components/transactions/`) sudah ada dan dipakai oleh `TransactionHistory`. Pemakaian yang benar: klik row → buka `TransactionEditSheet`.
2. **Numpad di `RepaymentModal` tidak sama dengan `TransactionForm`.** Repayment pakai native `<input type="number">`, sedangkan `TransactionForm` pakai `CustomNumpad` (1-9, 0, 000, del, tombol submit built-in).

Risiko tambahan yang harus ditangani: `TransactionEditSheet` cuma reverse old wallet + apply new wallet. Untuk transaksi yang `debt_id`-nya terisi, setelah edit harus panggil `recalculateDebt(debtId)` (lihat `src/lib/debt-utils.ts`) supaya `remaining_amount` dan `status` hutang tetap sinkron dengan list transaksi yang terhubung.

## Constraints

- Jangan ubah API `recalculateDebt`, `db`, atau schema Dexie. Pakai saja.
- Jangan commit. User review manual dulu.
- Jangan ubah `TransactionForm.tsx`, `TransactionHistory.tsx`, `TransactionEditSheet.tsx` logic di luar poin-poin di bawah.
- i18n: tambah key `debt.modal.savePayment` di `id.json` dan `en.json` (lihat bagian i18n).
- Warna amount display: merah untuk `debt.type === "debt"` (expense), hijau untuk `debt.type === "loan"` (income). Pola lihat `TransactionForm.tsx` line 304.
- Bahasa: komunikasikan dengan user pakai Indonesia. Kode/comments boleh bahasa Inggris (mengikuti style existing).
- AGENTS.md: "NOT the Next.js you know" — baca `node_modules/next/dist/docs/` kalau perlu.

## Per-File Changes

### 1. `src/components/transactions/TransactionEditSheet.tsx`

- Tambah optional prop `onUpdated?: () => void` ke `TransactionEditSheetProps` (sekitar line 21-25).
- Di `executeUpdate` (line 80-137), panggil `onUpdated?.()` **sebelum** `onOpenChange(false)`. Posisi: setelah `toast.success(t("transaction.updated"))` (line 127), sebelum `onOpenChange(false)` (line 128).
- **JANGAN** ubah reversal/aplikasi wallet logic. `TransactionEditSheet` tetap domain-agnostic — soal debt ditangani oleh caller via `onUpdated`.
- Pertahanan: `debt_id` field di transaction tidak di-`update` (existing `db.transactions.update` hanya menulis field yang disebutkan). Jadi link ke hutang tetap terjaga.

### 2. `src/app/debts/detail/DebtDetailClient.tsx`

- Import `TransactionEditSheet` dari `@/components/transactions/TransactionEditSheet`. Import `recalculateDebt` sudah ada, jadi tidak perlu import lagi.
- Tambah state:
  ```
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  ```
  Import `Transaction` dari `@/lib/db` jika belum.
- Ubah card payment history (line 178-203) dari `<div>` jadi `<button>` (atau bungkus dengan `<button>`). `onClick` handler: `setSelectedTransaction(tx); setEditOpen(true);`. Pertahankan styling (hover, padding, layout). Tambahkan `cursor-pointer` jika belum.
- Di akhir JSX (sebelum closing `</div>` root, sekitar line 212), render:
  ```
  <TransactionEditSheet
    transaction={selectedTransaction}
    open={editOpen}
    onOpenChange={setEditOpen}
    onUpdated={() => { if (id) void recalculateDebt(id); }}
  />
  ```
  Pakai `void` untuk fire-and-forget (recalculateDebt async, return Promise<void>, errors sudah di-handle internal).

### 3. `src/components/debts/RepaymentModal.tsx`

Restructure layout modal untuk pakai `CustomNumpad`. Lihat `TransactionForm.tsx` line 296-318 untuk referensi.

**Layout target:**
```
<modal-overlay>
  <modal-panel max-h-[90vh] flex flex-col>
    <header sticky top-0>...</header>
    <tab-nav p-4 shrink-0>...</tab-nav>
    <scrollable flex-1 overflow-y-auto>
      {activeTab === "new" ? <form>date/wallet/notes</form> : <link-list>}
    </scrollable>
    {activeTab === "new" && (
      <footer sticky-bottom border-t>
        <amount-display />
        <CustomNumpad onSubmit={handleNewPaymentSubmit} ... />
      </footer>
    )}
  </modal-panel>
</modal-overlay>
```

**Detail:**
- Hapus `<input type="number">` untuk amount (line 182-189 di file asli).
- Hapus `<Button type="submit">` di akhir form (line 237-241) — tombol submit numpad yang akan handle.
- Ubah signature `handleNewPaymentSubmit` dari `(e: React.FormEvent) =>` jadi `() =>` (event tidak ada, hapus `e.preventDefault()`). Body lain identik.
- Tambah import `CustomNumpad` dari `@/components/transactions/CustomNumpad`.
- Tambah import `formatCurrencyRaw` sudah ada (`useFormatLocale`), `t` sudah ada (`useT`).
- Footer amount display: `t("transaction.amountLabel")` untuk label, `formatCurrencyRaw(parseInt(amountStr || "0", 10))` untuk nilai, color `red-500` untuk debt, `green-500` untuk loan. Pola: lihat `TransactionForm.tsx` line 302-307.
- `<CustomNumpad>` props: `value={amountStr}`, `onChange={setAmountStr}`, `onSubmit={handleNewPaymentSubmit}`, `disabled={isSubmitting}`, `submitLabel={t("debt.modal.savePayment")}`, `ariaLabelNumber={(n) => ${n}}`, `ariaLabelDelete={t("common.delete")}`.
- Hapus `required` + `min="1"` di input number (sudah dihapus saat pakai numpad). Validasi tetap di handler `parseInt(amountStr, 10) <= 0` → toast error (sudah ada, line 87-89).
- Pindahkan header dari `sticky top-0` (sudah benar) — tidak perlu diubah.
- `max-h-[90vh] overflow-y-auto` di modal-panel diganti: modal-panel jadi `flex flex-col` (sudah), scrollable inner div yang `flex-1 overflow-y-auto`. Header + footer tidak ikut scroll. **Penting**: kelas `overflow-y-auto` di modal-panel HARUS dihapus/dipindah ke inner content div, kalau tidak numpad akan ikut scroll.

**Style minimal:** jangan ubah warna, font, layout lain. Cukup restructure DOM.

### 4. i18n

- `src/lib/i18n/locales/id.json`: tambah `"savePayment": "Simpan Pembayaran"` di object `debt.modal` (setelah `"loadFailed"` line 168).
- `src/lib/i18n/locales/en.json`: tambah `"savePayment": "Save Payment"` di object `debt.modal` (setelah `"loadFailed"` line 168).

## Dropped (Tidak Diubah)

- `TransactionForm.tsx` — tidak disentuh.
- `TransactionHistory.tsx` — tidak disentuh (referensi saja).
- `CustomNumpad.tsx` — tidak disentuh.
- `db.ts`, `debt-utils.ts` — tidak disentuh.
- Type toggle di `TransactionEditSheet` untuk debt-linked transaction: **tidak di-disable** untuk saat ini. Type filter defense-in-depth di `sumPaymentsForDebt` (`debt-utils.ts` line 88-101) sudah handle kalo tipe diganti — transaksi akan di-skip dari sum. Wallet balance tetap disesuaikan dengan tipe baru (expected behavior). User bisa unlink manual kalau bingung.

## Verification

Jalankan semua, kumpulkan output:

1. `npx tsc --noEmit` — expected: no errors.
2. `npm run lint` — expected: no errors (warning existing yang tidak terkait boleh).
3. `npm run build` — expected: build success.

Kalau ada error, **jangan auto-fix di luar scope**. Report error dan diff yang menyebabkan. User decide.

## Commit

JANGAN commit. User review dulu.

## Failure Handling

- Kalau opencode dispatch-nya timeout/error, laporkan apa adanya. Jangan spin retry loop.
- Kalau tsc/lint/build fail dan error-nya terkait dengan diff yang baru, laporkan. User decide.
- Kalau error tidak terkait (pre-existing), laporkan sebagai caveat.

## Report Format

Laporan ke user harus berisi:
1. Daftar file yang berubah (path + 1 kalimat perubahan).
2. Output tsc, lint, build (stdout/stderr ringkas, hanya bagian yang relevan).
3. Caveat atau follow-up (mis: ada warning existing, behavior edit untuk debt-linked transaction seperti dijelaskan di "Dropped").
