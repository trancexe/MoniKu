# MoniKu: Amount Field → Modal Numpad (Bukan Fixed)

## Context

User feedback: dengan numpad `position: fixed`, form fields jadi ketutup, list jadi tidak terlihat (numpad overlay bottom 96px). User propose: "keyboard hanya muncul jika kursor ada di input nilai uang" — numpad contextual, muncul saat amount field di-tap.

Pattern baru: amount field di DebtForm adalah tombol (display-only, bukan input). Tapping tombol → modal numpad muncul (sama style dengan `RepaymentModal`). User masukkan nominal → tap "Selesai" → modal tutup → form amount button ter-update. Form selalu visible, numpad cuma muncul saat konteksnya pas.

## Constraints

- Jangan commit. User review dulu.
- Jangan ubah `CustomNumpad.tsx` (component ini dipakai di banyak tempat — biarkan).
- Jangan ubah `RepaymentModal.tsx`, `TransactionForm.tsx`, `TransactionEditSheet.tsx`, `TransactionHistory.tsx`.
- Jangan ubah `DebtList.tsx` visual, `globals.css`, `layout.tsx`.
- Jangan ubah i18n keys (semua key sudah ada).
- Jangan ubah business logic.
- AGENTS.md: "NOT the Next.js you know".
- Pre-existing `useT` duplicate import di DebtForm sudah fixed.

## Per-File Changes

### 1. `src/app/debts/page.tsx`

**REVERT ke layout normal scroll-flow (hapus h-full restructure dari turn sebelumnya).**

Wrapper kembali ke:
```tsx
<div className="flex flex-col p-4 space-y-8">
  <header className="py-6">
    <h1 className="text-3xl font-bold tracking-tight">{t("debt.title")}</h1>
    <p className="text-muted-foreground text-sm mt-1">{t("debt.pageSubtitle")}</p>
  </header>
  <section>
    <DebtForm />
  </section>
  <section className="border-t pt-8">
    <h3 className="font-semibold tracking-tight mb-4">{t("debt.listTitle")}</h3>
    <DebtList />
  </section>
</div>
```

(Hampir identik dengan file sebelum turn restructure, TAPI pakai polish dari turn design-polish: `tracking-tight` di h3, `mt-1` di subtitle, `space-y-8` instead of `space-y-10` karena numpad tidak fixed lagi, jadi tidak butuh breathing extra.)

### 2. `src/components/debts/DebtForm.tsx`

**Restructure: amount field jadi tombol → modal numpad, REVERT fixed-numpad pattern.**

a. **Hapus import `useLayoutEffect`, `useRef` (tidak dipakai lagi).** Tetap import `useState` dari react.

b. **Hapus ref + effect untuk ukur numpad** (sudah tidak relevan):
   - Hapus `const numpadRef = useRef<HTMLDivElement>(null);`
   - Hapus `const [scrollPaddingBottom, setScrollPaddingBottom] = useState(280);`
   - Hapus `useLayoutEffect(() => {...}, []);`

c. **Tambah state untuk modal:**
   ```
   const [amountModalOpen, setAmountModalOpen] = useState(false);
   const [tempAmountStr, setTempAmountStr] = useState(amountStr);
   ```
   `tempAmountStr` adalah draft value di dalam modal — tidak commit ke `amountStr` sampai user tap "Selesai".

d. **Hapus helper `e.preventDefault` di form onSubmit** (kalau ada). Form tetap `<form>` element dengan onSubmit handler yang dipanggil oleh numpad. Sama seperti turn sebelumnya.

e. **JSX restructure:**

   i. **Form wrapper:** kembali ke pattern turn design-polish. Tidak ada `h-full overflow-hidden`, tidak ada `flex flex-col`. Cukup:
   ```jsx
   <form className="space-y-6 rounded-2xl bg-card p-6" onSubmit={(e) => e.preventDefault()}>
   ```
   Border + shadow juga sudah di-drop di turn design-polish. Form adalah `flex flex-col gap-7` — keep, atau kembali ke `space-y-6`? **Decision: pakai `flex flex-col gap-7`** (gap-7 lebih breathing per design-polish brief).

   ii. **Type toggle:** keep dari turn design-polish (`rounded-full py-3 text-sm ... ease-smooth active:scale-[0.98]`).

   iii. **Person name, date, wallet, notes:** keep dari turn design-polish. Field inputs pakai `transition-colors duration-200 ease-smooth`. Wallet button pakai `ease-smooth active:scale-[0.98]`. Labels `mb-1.5`.

   iv. **Amount field — REPLACE dengan button:**
   ```jsx
   <div className="space-y-2">
     <label className="text-xs font-medium text-zinc-500">
       {t("transaction.amountLabel")}
     </label>
     <button
       type="button"
       onClick={() => {
         setTempAmountStr(amountStr || "0");
         setAmountModalOpen(true);
       }}
       className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-left transition-all duration-200 ease-smooth hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-muted/30 active:scale-[0.99]"
     >
       <div className="flex items-baseline justify-between">
         <span className={`text-3xl font-bold tracking-tight tabular-nums ${type === 'debt' ? 'text-red-500' : 'text-green-500'}`}>
           {formatCurrencyRaw(parseInt(amountStr || "0", 10))}
         </span>
         <span className="text-xs text-muted-foreground">
           {amountStr && amountStr !== "0" ? "Ubah" : "Pilih nominal"}
         </span>
       </div>
     </button>
   </div>
   ```
   - Label di atas (sesuai `design-taste-frontend.md` rule: "Label ABOVE input").
   - Button menampilkan nominal yang sudah di-enter (atau placeholder "Pilih nominal").
   - "Ubah" hint muncul kalau sudah ada nilai.
   - Hover/active state konsisten dengan design system (`ease-smooth active:scale-[0.99]`).

   v. **Submit button:** TAMBAHKAN kembali. Pattern dari turn numpad add: tombol "Simpan Catatan" sebagai submit form. **Tidak pakai numpad sebagai submit lagi.**
   ```jsx
   <Button
     type="submit"
     disabled={isSubmitting}
     className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold transition-all duration-200 ease-smooth active:scale-[0.98] disabled:opacity-60"
   >
     {t("debt.save")}
   </Button>
   ```
   Import `Button` dari `@/components/ui/button`. Submit handler `handleSubmit` (existing) di-trigger via form onSubmit. Signature bisa tetap `() =>` atau `(e: React.FormEvent) =>` (keduanya OK karena `e.preventDefault()` di form onSubmit).

   vi. **Modal numpad (TAMBAH di akhir JSX, setelah `</form>`):**
   ```jsx
   {amountModalOpen && (
     <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4 animate-in fade-in duration-200">
       <div className="w-full max-h-[90vh] bg-background sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-lg shadow-black/5 dark:shadow-black/20 flex flex-col animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 ease-smooth">
         <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-between p-4 border-b border-border/60">
           <h2 className="font-semibold text-lg">{t("transaction.amountLabel")}</h2>
           <Button
             variant="ghost"
             size="icon"
             className="h-8 w-8 rounded-full transition-colors duration-200 ease-smooth"
             onClick={() => setAmountModalOpen(false)}
             aria-label={t("common.cancel")}
           >
             <X className="h-5 w-5" />
           </Button>
         </div>
         
         <div className="flex-1 overflow-y-auto px-4 pt-6">
           <div className="text-center py-6">
             <span className="text-xs font-medium text-muted-foreground mb-2 block">
               {t("transaction.amountLabel")}
             </span>
             <h2 aria-live="polite" aria-atomic="true" className={`text-4xl font-bold tracking-tight tabular-nums ${type === 'debt' ? 'text-red-500' : 'text-green-500'}`}>
               {formatCurrencyRaw(parseInt(tempAmountStr || "0", 10))}
             </h2>
           </div>
         </div>

         <div className="shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-sm px-4 pt-3 pb-4">
           <CustomNumpad
             value={tempAmountStr}
             onChange={setTempAmountStr}
             onSubmit={() => {
               setAmountStr(tempAmountStr);
               setAmountModalOpen(false);
             }}
             submitLabel={t("common.save")}
             ariaLabelNumber={(n) => `${n}`}
             ariaLabelDelete={t("common.delete")}
           />
         </div>
       </div>
     </div>
   )}
   ```
   - `X` icon: import dari `lucide-react` (sudah ada di project, lihat turn RepaymentModal).
   - TIDAK ada disabled pada numpad (modal adalah quick-entry, isSubmitting tidak relevan di sini).
   - submitLabel "Simpan" supaya jelas beda dengan submit form.
   - OnSubmit: commit `tempAmountStr` ke `amountStr` lalu tutup modal.

f. **handleSubmit:** signature boleh `(e: React.FormEvent) =>` lagi (kembali ke asal), atau `() =>` (kalau form sudah ada `e.preventDefault()` di onSubmit). **Decision: tetap `() =>`** (seperti turn numpad add), karena form onSubmit sudah handle `e.preventDefault()`.

g. **CLEANUP:** Hapus import `useLayoutEffect` (line 4) dan `useRef` (line 4). Import yang dipakai sekarang: `useState` only. Tambah import `X` dari `lucide-react`. Tambah import `Button` dari `@/components/ui/button`.

## Dropped (Tidak Diubah)

- `CustomNumpad.tsx` — biarkan.
- `RepaymentModal.tsx` — biarkan (punya pattern sendiri untuk payment flow).
- `TransactionForm.tsx` — biarkan (pattern fixed-numpad cocok di sana karena page=hanya form).
- `DebtList.tsx` — biarkan.
- `globals.css`, `layout.tsx` — biarkan.

## Verification

1. `npx tsc --noEmit` — 0 error.
2. `npm run lint` — 0 error baru.
3. `npm run build` — success.

## Commit

JANGAN commit. User review dulu.

## Failure Handling

- Error baru yang tidak terkait → laporkan apa adanya.
- Pre-existing error → laporkan sebagai caveat.

## Report Format

1. File berubah (path + 1 kalimat).
2. Output tsc/lint/build (ringkas).
3. Caveat: pre-existing apa? sebutkan.
