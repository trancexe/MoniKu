# MoniKu: Design Polish — Debts Page

## Context

User bilang current state "kurang oke" setelah DebtForm pakai numpad. Audit terhadap `redesign-existing-projects.md` + `minimalist-ui.md` menemukan 5 isu di DebtForm, RepaymentModal, dan DebtsPage wrapper. Project sudah punya foundation bagus (Plus Jakarta Sans, emerald primary, zinc neutrals, custom radius, ease-smooth utility) — tidak perlu ganti fundamental. Tujuannya: targeted polish, bukan redesign dari nol.

## Constraints

- Jangan commit. User review dulu.
- Jangan ubah schema Dexie, db logic, i18n keys, atau API hooks (`onUpdated`, `recalculateDebt`).
- Jangan ubah `CustomNumpad.tsx` (dipakai juga oleh TransactionForm — biarkan konsisten).
- Jangan ubah `DebtList.tsx`, `TransactionForm.tsx`, `TransactionEditSheet.tsx`, `TransactionHistory.tsx`, `globals.css`, `layout.tsx`.
- Jangan tambah dependencies baru.
- Jangan ubah logika bisnis: form submission, debt creation, wallet update.
- Gunakan CSS vars yang sudah ada (`--radius`, `--color-*`, `ease-smooth`, `ease-spring`).
- AGENTS.md: "NOT the Next.js you know" — baca `node_modules/next/dist/docs/` kalau perlu.
- Bahasa i18n: kode/comments English.

## Design Read

Local-first finance PWA untuk auditor pemerintah Indonesia. **Premium utilitarian minimalist** — warm-monochrome-ish, single accent (emerald), typographic emphasis pada nominal uang. Tidak playful, tidak glassmorphism, tidak purple AI gradient. Project sudah dekat dengan style ini — gap-nya di polish & consistency.

**Radius scale (pilih SATU, doc di file ini, JANGAN introduce radius baru):**
- `rounded-full` — pill: type toggle, status badges, submit button numpad
- `rounded-xl` (12px via `--radius-lg`) — buttons (wallet, numpad digit, "X" close), inputs
- `rounded-2xl` (16px via `--radius-xl`) — card containers (DebtForm, RepaymentModal panel, DebtList card)
- `rounded-t-2xl` (mobile modal top corners only) — RepaymentModal panel mobile

**Color rules (lock):**
- Primary: emerald (existing `--primary`) — submit button, focus ring
- Expense/Debt: `text-red-500` (existing)
- Income/Loan: `text-green-500` (existing)
- Background neutrals: zinc only (existing)
- **TIDAK tambah accent baru.** No purple, no orange, no new status colors.

**Motion:**
- Pakai utility `ease-smooth` (`cubic-bezier(0.16, 1, 0.3, 1)`) untuk transitions, bukan `transition-all` default.
- Hover/active states pakai `active:scale-[0.98]` + `transition-all duration-200 ease-smooth`.
- TIDAK tambah animation baru. Pakai apa yang sudah ada (RevealStagger, animate-in, etc).

## Per-File Changes

### 1. `src/app/debts/page.tsx`

**Issues:** Header `py-6` terlalu ketat untuk `text-3xl`. Section separator `space-y-8` generic.

**Fix:**
- Wrapper: ganti `space-y-8` jadi `space-y-10` atau `space-y-12` (lebih breathing).
- Header: ganti `py-6` jadi `py-8`. Subtitle: tambah `mt-2` (bukan `mt-1`) untuk breathing.
- List section header (`Daftar Hutang / Piutang`): tambah `tracking-tight` ke h3 untuk konsistensi dengan h1.
- Tidak ubah struktur section.

### 2. `src/components/debts/DebtForm.tsx`

**Issues utama:**
- Generic card: `rounded-2xl border bg-card p-6 shadow-sm` — pattern textbook AI.
- Type toggle: `rounded-full` mixed dengan `rounded-xl` lain — OK karena pill rule, tapi styling internal bisa lebih distinctive.
- Amount display: bare text `text-4xl font-bold` — no visual weight, blends dengan field lain.
- Submit (numpad): plain text "Simpan Catatan", no icon, no signal.
- Form fields: standard inputs, no consistent focus state styling, no hover pada wallet buttons.

**Fix detail:**

a. **Form wrapper:** ganti `rounded-2xl border bg-card p-6 shadow-sm` jadi:
   - `rounded-2xl bg-card p-6` — DROP border dan shadow-sm. Punya background card yang sudah memisahkan dari page. Lebih clean. (Pattern dari redesign skill: "Remove the border, or use only background color, or use only spacing.")
   - Tambah `space-y-7` (sebelumnya `space-y-6`) untuk lebih breathing.
   - TIDAK pakai `shadow-sm` (generic, flagged di skill).

b. **Type toggle:** tetap `rounded-full` (pill sesuai rule). Improve:
   - Padding: `py-3` (bukan `py-2.5`) — lebih comfortable touch target.
   - Text size: `text-sm` (bukan `text-xs`) — lebih readable.
   - Active state tetap `bg-background shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50`. Tambah `ease-smooth` ke transition: `transition-all duration-200 ease-smooth`.
   - Hover (inactive): `hover:text-zinc-700 dark:hover:text-zinc-200` (subtle).

c. **Form fields (person name, date, notes):** polish:
   - Label: tetap `text-xs font-medium text-zinc-500`. Tambah `mb-1.5` (bukan default) untuk breathing. Pattern: label di-atas input, gap-2. (Per design-taste: "Label ABOVE input. Helper text optional but present in markup.")
   - Input: existing `rounded-xl border border-zinc-200 ...` OK. Tambah `transition-colors duration-200 ease-smooth` agar focus transition halus.
   - Notes: tambah `placeholder:text-zinc-400` untuk hierarchy placeholder.

d. **Wallet selector:** polish:
   - Grid: tetap `grid-cols-2 sm:grid-cols-3 gap-2 pb-2`.
   - Buttons: existing styling OK. Tambah `ease-smooth` ke transition.
   - Optional improvement: kalau wallet kosong, tampilkan empty state yang lebih helpful (bukan grid kosong). TAPI ini di luar scope, skip.

e. **Amount display:** tambah visual weight tanpa tambah warna baru.
   - Bungkus h2 dengan container: `<div className="text-center py-5 px-4 rounded-xl bg-muted/40 border border-border/40">`.
   - Text tetap: `text-4xl font-bold tracking-tight ${type === 'debt' ? 'text-red-500' : 'text-green-500'}`.
   - Label `transaction.amountLabel` di atas, h2 di bawah. Center alignment.
   - Ini memberi "chip" feel untuk amount display — visual focus point.

f. **Numpad (CustomNumpad):** JANGAN ubah componentnya. Caller side (DebtForm) bisa pass props yang lebih polished. TAPI submitLabel hanya bisa "Simpan Catatan" — itu sudah OK.
   - TIDAK ubah CustomNumpad. TIDAK wrap numpad dengan styling baru (CustomNumpad sudah self-contained).

g. **Container flow:** struktur tetap flex-col (type toggle → scrollable fields → amount + numpad). TAPI tambah visual separator:
   - Sebelum amount display: `<div className="h-px bg-border/60 -mx-6" />` — hairline divider full-width dalam card. Memisahkan "input fields" dari "amount + numpad".

### 3. `src/components/debts/RepaymentModal.tsx`

**Issues:**
- Header: `bg-background/80 backdrop-blur-sm` sudah baik, tapi `border-b` bisa diganti `border-b border-border/60` untuk konsistensi (border lebih halus).
- Tab nav: `rounded-lg` (8px) — INCONSISTENT dengan pill rule. Ganti ke `rounded-full` (sesuai radius scale).
- Modal panel: `rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col` — `shadow-xl` flagged di minimalist-ui. Ganti ke `shadow-2xl shadow-black/5` (lebih diffuse) atau cukup `shadow-lg shadow-black/5`. TAPI `shadow-xl` di modal adalah acceptable untuk elevation — keep, atau turunkan ke `shadow-lg`. Decision: turunkan ke `shadow-lg shadow-black/5` (lebih subtle).
- Wallet button: identical dengan DebtForm — tambahkan `ease-smooth` ke transition.
- Amount display: sama dengan DebtForm — tambah container `rounded-xl bg-muted/40 border border-border/40` + center alignment.

**Fix detail:**

a. **Modal panel:** ganti `shadow-xl` jadi `shadow-lg shadow-black/5 dark:shadow-black/20`. Drop `animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200` kalau terlalu agresif — keep tapi tambah `ease-smooth` timing.

b. **Header:** tambah `border-b border-border/60` (lebih halus dari `border-b` plain). Tambah `transition-colors duration-200 ease-smooth` ke X button.

c. **Tab nav:** ganti `rounded-lg` ke `rounded-full`. Padding: tetap `p-1`. Active: `bg-background shadow`. Tambah `transition-all duration-200 ease-smooth`.

d. **Scrollable content:** tambah `transition-opacity` atau keep. Skip — tidak perlu ubah.

e. **Wallet button:** tambah `ease-smooth`. Identik dengan DebtForm treatment.

f. **Amount display:** sama dengan DebtForm — tambah container visual weight.

g. **Numpad footer:** tambah hairline divider `border-t border-border/60` (lebih halus dari `border-t` plain).

## Dropped (Tidak Diubah)

- `CustomNumpad.tsx` — JANGAN disentuh. Caller side handle visual context.
- `TransactionForm.tsx`, `TransactionHistory.tsx`, `TransactionEditSheet.tsx` — JANGAN disentuh (sudah consistent di tempat lain).
- `DebtList.tsx` — JANGAN disentuh. Kalau mau polish, separate task.
- `globals.css` — JANGAN disentuh. CSS vars sudah cukup.
- `db.ts`, `debt-utils.ts` — JANGAN disentuh.
- TIDAK tambah icon baru (mis: trailing Check icon di submit numpad) karena CustomNumpad tidak disentuh. Acceptable trade-off.

## Verification

1. `npx tsc --noEmit` — expected 0 error.
2. `npm run lint` — expected 0 error baru.
3. `npm run build` — expected build success (DebtForm duplicate import sudah fixed di turn sebelumnya).

## Commit

JANGAN commit. User review dulu.

## Failure Handling

- Error baru yang tidak terkait → laporkan apa adanya.
- Pre-existing error → laporkan sebagai caveat.

## Report Format

1. File berubah (path + 1 kalimat).
2. Output tsc/lint/build (ringkas).
3. Caveat: tidak ada? sebutkan.
