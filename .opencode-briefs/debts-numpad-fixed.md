# MoniKu: Numpad Fixed di Halaman /debts

## Context

User complain: "numpad nya ini apakah mau fix atau gmn? jelek sekali klo ikut gerak bareng page".

Current state: `<CustomNumpad>` di dalam `<form>` DebtForm (shrink-0 di bawah). Saat user scroll halaman, numpad ikut scroll. User mau numpad selalu visible di viewport (seperti /transactions yang pakai `position: fixed bottom-24`).

Pattern referensi (lihat `src/components/transactions/TransactionForm.tsx`):
- Wrapper: `flex flex-col h-full overflow-hidden`
- Fields area: `flex-1 overflow-y-auto` dengan dynamic `paddingBottom` via `useLayoutEffect` + `ResizeObserver` (ukur tinggi numpad). **WAJIB pakai pattern ini**, jangan hardcode pixel (per memory: "Poco F6 viewport... fixed-bottom UI butuh useLayoutEffect+ResizeObserver, jangan hardcode pixel").
- Numpad: `position: fixed bottom-24 left-0 right-0 z-40 md:max-w-md md:mx-auto` (di luar form wrapper, di viewport).
- Amount display: di dalam fixed wrapper numpad, di atas numpad.

## Constraints

- Jangan commit. User review dulu.
- Jangan ubah `CustomNumpad.tsx` (dipakai juga TransactionForm, RepaymentModal — biar konsisten).
- Jangan ubah `TransactionForm.tsx`, `RepaymentModal.tsx`, `TransactionEditSheet.tsx`, `TransactionHistory.tsx`.
- Jangan ubah `globals.css`, `layout.tsx`.
- Jangan ubah `DebtList.tsx` (visual). Boleh ubah wrapper di `page.tsx` saja.
- Jangan ubah i18n keys atau business logic.
- AGENTS.md: "NOT the Next.js you know" — baca `node_modules/next/dist/docs/` kalau perlu.
- Bahasa: komunikasi dengan user pakai Indonesia. Kode/comments English.
- Pre-existing `useT` duplicate import di DebtForm sudah fixed turn sebelumnya. JANGAN introduce error baru.

## Per-File Changes

### 1. `src/components/debts/DebtForm.tsx`

**Restructure: form fields scroll dalam card, numpad fixed di viewport.**

a. **Imports:** tambah `useLayoutEffect`, `useRef` dari React.

b. **Refs & state:**
   ```
   const numpadRef = useRef<HTMLDivElement>(null);
   const [scrollPaddingBottom, setScrollPaddingBottom] = useState(280); // fallback awal
   ```

c. **Effect ukur numpad (PERSIS pattern TransactionForm line 31-57):**
   ```
   useLayoutEffect(() => {
     const el = numpadRef.current;
     if (!el) return;
     const measure = () => {
       const rect = el.getBoundingClientRect();
       const viewportHeight = window.innerHeight;
       setScrollPaddingBottom(viewportHeight - rect.top + 16);
     };
     measure();
     const observer = new ResizeObserver(measure);
     observer.observe(el);
     window.addEventListener("resize", measure);
     return () => {
       observer.disconnect();
       window.removeEventListener("resize", measure);
     };
   }, []);
   ```

d. **JSX restructure:**
   - Bungkus seluruh return dalam `<div className="flex flex-col h-full overflow-hidden">`.
   - Form fields section (`<div className="flex-1 overflow-y-auto ...">`) dapat:
     - Class: `flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
     - Style: `style={{ paddingBottom: scrollPaddingBottom }}`
     - Class sudah ada `space-y-6` — pertahankan.
   - Amount display: PINDAHKAN keluar dari dalam form card, ke dalam numpad wrapper (lihat point e).
   - Form fields tetap di dalam `<form>` dengan `e.preventDefault()` di onSubmit. Form wrapper: hapus `rounded-2xl bg-card p-6` (jadi plain wrapper), atau pertahankan styling card. **Decision: pertahankan card styling**, form adalah `<form className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-6 rounded-2xl bg-card p-6" style={{ paddingBottom: scrollPaddingBottom }}>`. Type toggle + fields + amount description ada di sini.
   - **Numpad wrapper (di LUAR form, sibling dari form di flex parent):**
     ```
     <div
       ref={numpadRef}
       className="fixed bottom-24 left-0 right-0 z-40 md:max-w-md md:mx-auto"
     >
       <div className="border-t border-border/60 bg-background/95 backdrop-blur-sm px-4 pt-3 pb-4">
         {/* Amount display */}
         <div className="text-center mb-2">
           <span className="text-xs font-medium text-muted-foreground">{t("transaction.amountLabel")}</span>
           <h2
             aria-live="polite"
             aria-atomic="true"
             className={`text-3xl font-bold tracking-tight ${type === 'debt' ? 'text-red-500' : 'text-green-500'}`}
           >
             {formatCurrencyRaw(parseInt(amountStr || "0", 10))}
           </h2>
         </div>
         {/* Numpad */}
         <CustomNumpad
           value={amountStr}
           onChange={setAmountStr}
           onSubmit={handleSubmit}
           disabled={isSubmitting}
           submitLabel={t("debt.save")}
           ariaLabelNumber={(n) => `${n}`}
           ariaLabelDelete={t("common.delete")}
         />
       </div>
     </div>
     ```
   - Hapus amount chip `rounded-xl bg-muted/40 border border-border/40` (dari turn sebelumnya) — amount display di fixed wrapper cukup plain (no chip, biar tidak double border). Plain text-3xl di wrapper numpad sudah cukup visual weight karena ada background `bg-background/95`.

e. **Form internal layout (di dalam `<form>`):**
   - Type toggle (rounded-full pill) — keep existing.
   - Fields container — fields person name, date, wallet, notes (sama dengan sekarang, gap default).
   - Hapus hairline divider `<div className="h-px bg-border/60 -mx-6" />` (sudah dipindah ke numpad wrapper sebagai `border-t`).

f. **Validation:** form wrapper harus `<form>` element untuk semantic. onSubmit prevent default.

### 2. `src/app/debts/page.tsx`

**Restructure: list area scrolls, form area fixed height (form h-full).**

a. Wrapper structure:
   ```
   <div className="flex flex-col h-full bg-background">
     <header className="px-4 pt-8 pb-4 shrink-0">
       <h1>...</h1>
       <p>...</p>
     </header>
     <div className="flex-1 min-h-0 flex flex-col">
       <section className="shrink-0 px-4">
         <DebtForm />  {/* form mengambil space secukupnya, internal scroll */}
       </section>
       <section className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 pb-32">
         <h3>...</h3>
         <DebtList />
       </section>
     </div>
   </div>
   ```

b. **Penjelasan layout:**
   - Page wrapper `flex flex-col h-full` — page tidak scroll.
   - Header `shrink-0` — fixed di atas.
   - Inner `flex-1 min-h-0 flex flex-col` — container untuk form + list.
   - Form section `shrink-0` — form mengambil space se-natural mungkin, internal scroll.
   - List section `flex-1 min-h-0 overflow-y-auto pb-32` — list scroll di area sisanya, padding-bottom 32 (~128px) untuk clearance numpad fixed.
   - **`pb-32` WAJIB** — numpad fixed di `bottom-24` (= 96px) + extra breathing ~32px.

c. **Caveat:** form section `shrink-0` artinya form mengambil height sesuai content. Kalau form fields pendek, list area dapat banyak space. Kalau form fields panjang, form scroll internal. Trade-off acceptable.

d. Hapus `space-y-8/10/12` lama — layout baru pakai flex-col.

### 3. TIDAK ubah

- `CustomNumpad.tsx` (component ini dipakai di banyak tempat — biarkan).
- `DebtList.tsx` (visual, sudah OK).
- `RepaymentModal.tsx` (numpad di modal berbeda — modal punya max-h, internal flow).
- `globals.css`, `layout.tsx`.

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
