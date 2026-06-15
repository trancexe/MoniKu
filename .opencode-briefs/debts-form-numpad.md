# MoniKu: Numpad Permanen di Halaman /debts

## Context

User bandingin UX halaman:
- `/transactions` (lihat `src/app/transactions/page.tsx` + `src/components/transactions/TransactionForm.tsx`): seluruh halaman = form. Numpad nempel di bawah viewport (`position: fixed bottom-24`). User selalu lihat numpad saat buka halaman itu.
- `/debts` (lihat `src/app/debts/page.tsx` + `src/components/debts/DebtForm.tsx`): halaman gabungan form + list. `DebtForm` saat ini pakai `<input type="text" inputMode="numeric" pattern="[0-9]*">` untuk nominal — TIDAK konsisten dengan TransactionForm. User harus pakai soft keyboard.

Tujuan: DebtForm jadi numpad-centric, sama seperti TransactionForm. Konsistensi UX.

## Constraints

- Jangan ubah `TransactionForm.tsx`, `CustomNumpad.tsx`, atau schema Dexie.
- Jangan commit. User review dulu.
- Jangan ubah logika bisnis DebtForm (kalkulasi wallet, pembuatan debt, dll).
- Pre-existing error `DebtForm.tsx:6,10` duplicate `useT` import — JANGAN perbaiki di task ini (di luar scope, user decide terpisah).
- Bahasa i18n: komunikasikan dengan user pakai Indonesia. Kode/comments English.
- AGENTS.md: "NOT the Next.js you know" — baca `node_modules/next/dist/docs/` kalau perlu.

## Per-File Changes

### `src/components/debts/DebtForm.tsx`

Restructure form jadi numpad-centric, pattern dari `TransactionForm.tsx`:

**Layout baru (di dalam `<form>`):**
1. **Type toggle** (existing, line 102-119): "Saya Ngutang" / "Saya Minjamin" — tetap di atas, tidak discroll ke numpad. Pattern lihat TransactionForm line 199-216.
2. **Scrollable area** (flex-1, overflow-y-auto) berisi:
   - **Person name** (existing, line 121-131): text input.
   - **Date** — TAMBAH. Default `dayjs().format("YYYY-MM-DDTHH:mm")`. Pakai pattern `TransactionForm.tsx` line 269-278. Label `t("transaction.date")`. Field ini BELUM ADA di DebtForm saat ini — tambahkan karena debt creation juga perlu tanggal pencatatan (saat ini default ke `Date.now()` di `db.transactions.add` line 69, yang OK tapi user tidak bisa override). Tambah di antara person name dan wallet.
   - **Wallet selector** (existing, line 147-173): grid 2-3 kolom dengan tombol per wallet, klik select/deselect.
   - **Notes** (optional) — TAMBAH. Text input dengan label `t("transaction.notes")` dan placeholder `t("transaction.notesPlaceholder")`. Mirip TransactionForm line 280-290. Field ini BELUM ADA di DebtForm — tambahkan untuk konsistensi dengan TransactionForm.
3. **Amount display + Numpad** (shrink-0, di bawah):
   - Label "Nominal" (atau `t("transaction.amountLabel")`).
   - `<h2>` besar: `formatCurrencyRaw(parseInt(amountStr || "0", 10))`. Warna: `text-red-500` untuk `type === 'debt'`, `text-green-500` untuk `type === 'loan'`. Style lihat TransactionForm line 304.
   - `<CustomNumpad value={amountStr} onChange={setAmountStr} onSubmit={handleSubmit} disabled={isSubmitting} submitLabel={t("debt.save")} ariaLabelNumber={(n) => ${n}} ariaLabelDelete={t("common.delete")} />`.
   - Hapus `<Button type="submit">` lama (line 175) — numpad yang handle submit.

**State & logic:**
- Tambah `date` state default `dayjs().format("YYYY-MM-DDTHH:mm")`.
- Tambah `notes` state default `""`.
- Hapus `setDate`/`setNotes` references di handler — tambahkan. `date` masuk ke `db.transactions.add` field `date` (replace `Date.now()` di line 69). `notes` masuk ke field `notes` (replace atau gabung dengan `notes` template `Pencatatan awal ...`).
  - Kalau `notes` kosong → pakai template existing.
  - Kalau `notes` ada → pakai input user (jangan gabung, biar simple).
- `amountStr` existing (line 17) tetap.
- `handleSubmit` signature: ubah dari `(e: React.FormEvent) =>` jadi `() =>` (hapus `e.preventDefault()`, hapus parameter).
- Submit guard `if (isSubmitting) return;` tetap.

**Hapus:**
- `<input id="amountStr" type="text" inputMode="numeric" pattern="[0-9]*" ...>` (line 135-144).
- `<div className="space-y-2">` untuk amount field (line 133-145).
- `<Button type="submit" ...>` (line 175).

**Tambah import:**
- `import { CustomNumpad } from "@/components/transactions/CustomNumpad";`
- `import dayjs from "dayjs";` — untuk default date.

**i18n (jika perlu):**
- Key `transaction.amountLabel` sudah ada. Key `transaction.date` sudah ada. Key `transaction.notes` dan `transaction.notesPlaceholder` sudah ada. Key `debt.save` sudah ada (`"Simpan Catatan"`). Jadi tidak perlu tambah i18n key baru.

**Wrapping form:**
Bungkus form dengan div yang jadi flex column (seperti `TransactionForm.tsx` line 192): `<div className="flex flex-col">`. Hapus `rounded-2xl border bg-card p-6 shadow-sm` dari `<form>` — pindahkan ke wrapper div jika diinginkan, atau biarkan styling apa adanya (consistency dengan TransactionForm yang tidak punya card wrapper).

Style existing DebtForm: `rounded-2xl border bg-card p-6 shadow-sm`. Pertahankan style ini di `<form>` atau wrapper, jangan ubah visual selain restructure DOM.

**Date/notes field — letak detail:**
Tempatkan date field SETELAH person name, SEBELUM wallet selector. Notes tempatkan SETELAH wallet, SEBELUM numpad. Posisi lihat TransactionForm.tsx: date di line 269-278, notes di line 280-290.

## Dropped (Tidak Diubah)

- `TransactionForm.tsx`, `CustomNumpad.tsx`, `RepaymentModal.tsx` (sudah ada numpad), `DebtList.tsx`, `DebtDetailClient.tsx` — tidak disentuh.
- `db.ts`, `debt-utils.ts` — tidak disentuh.
- Pre-existing error `useT` duplicate import di line 6,10 — JANGAN perbaiki (di luar scope).
- Tidak ubah logic business: wallet deduction, debt creation, recalculation.

## Verification

1. `npx tsc --noEmit` — error pre-existing `DebtForm.tsx:6,10` boleh muncul. **0 error baru** dari diff.
2. `npm run lint` — error pre-existing line 41 (was 42, now will be 42) `set-state-in-effect` TIDAK ada di DebtForm. 0 lint error baru.
3. `npm run build` — bakal gagal karena `DebtForm.tsx` duplicate `useT` (pre-existing). Laporkan apa adanya.

## Commit

JANGAN commit. User review dulu.

## Failure Handling

- Error baru yang tidak terkait → laporkan apa adanya, jangan auto-fix.
- Error pre-existing → laporkan sebagai caveat.

## Report Format

1. File berubah (path + 1 kalimat).
2. Output tsc/lint/build (ringkas).
3. Caveat: pre-existing `useT` duplicate, build belum bisa verifikasi.
