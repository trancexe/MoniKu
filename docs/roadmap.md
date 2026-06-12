# Roadmap

Status proyek, known issues, dan fitur yang direncanakan. Terorganisir per kategori.

## 🚨 Blocker: Build Gagal

**Status:** Build TypeScript (`npm run build`) **gagal** di:

```
src/components/debts/DebtList.tsx:80
Type 'Dispatch<SetStateAction<string>>' is not assignable to type
'(value: string | null, eventDetails: SelectRootChangeEventDetails) => void'.
```

**Penyebab:** `Select.onValueChange` (dari `@base-ui/react`) bisa return `string | null`, tapi state `selectedWallet` di-type `string` (non-null).

**Fix:** Ubah state ke `string | null` ATAU buat wrapper:
```typescript
const handleWalletChange = (val: string | null) => {
  if (val) setSelectedWallet(val);
};
<Select value={selectedWallet} onValueChange={handleWalletChange}>
```

**Impact:** tanpa fix ini, tidak ada deployment.

---

## 🐛 Known Issues (Prioritas Tinggi)

### Build & Lint
- [ ] Fix build error di `DebtList.tsx:80` (lihat di atas)
- [ ] Fix 11 ESLint errors:
  - 3× `react-hooks/set-state-in-effect` di `BottomNav.tsx:14`, `ThemeSettings.tsx:14`, `TransactionEditSheet.tsx:45-54`
  - 5× `@typescript-eslint/no-explicit-any` di master-data components
  - 3× `@typescript-eslint/no-explicit-any` di `TransactionForm.tsx:125,145`
- [ ] Cleanup 5 unused vars warnings (`SyncSettings`, `ThemeSettings`)

### Security
- [ ] **Restore tanpa validasi schema** (gdrive.ts:69-79) — risiko data loss. Fix dengan zod validation + backup-then-restore
- [ ] **OAuth client ID fallback** ke `"dummy-client-id"` (layout.tsx:35) — silent fail. Hapus fallback, throw di production
- [ ] **Access token di component state** (SyncSettings.tsx:11) — tambah logout button + Google revoke endpoint
- [ ] **Implicit OAuth flow** — Google mulai deprecate. Evaluasi migrasi ke PKCE atau backend proxy
- [ ] **Input validation lemah** — `parseInt`/`Number` tanpa `isNaN` check + tanpa max cap
- [ ] **Wallet balance bisa negatif** tanpa warning
- [ ] **Tambah CSP & security headers** di deployment config (Vercel/Netlify)
- [ ] **Replace `console.error` di production** dengan logger terpusat

### Accessibility
- [ ] Ganti `<html lang="en">` ke `lang="id"` (layout.tsx:39)
- [ ] Hapus `maximumScale: 1` (layout.tsx:21) — WCAG 1.4.4 violation
- [ ] Ganti `<article onClick>` ke `<button>` di transaction list (TransactionHistory.tsx, DashboardOverview.tsx)
- [ ] Ganti `<a href>` ke `<Link>` di Dashboard quick actions
- [ ] Tambah `aria-label` di BottomNav icon-only links
- [ ] Tambah `aria-label` di CustomNumpad buttons
- [ ] Tambah skip-to-content link
- [ ] Tambah `aria-busy` di loading states

### PWA
- [ ] **Fix PWA offline mode** — `AppInit.tsx:11-17` unregister semua SW sebagai workaround. Investigasi root cause loop, fix SW caching strategy
- [ ] Tambah Apple touch icon (180×180) untuk iOS
- [ ] Tambah maskable icon untuk Android adaptive
- [ ] Tambah PWA install prompt UI (saat ini pakai browser default)

### Code Smell
- [ ] Magic number `pb-[380px]` di TransactionForm.tsx:101 — pakai dynamic measure
- [ ] `<input type="number">` di DebtForm.tsx:69 — ganti ke `inputMode="numeric"`
- [ ] Tambah undo untuk destructive actions (delete transaction, restore)
- [ ] System category literal `"system-repayment"` di DebtList.tsx:33 — refactor ke proper entity
- [ ] Tambah edit/delete UI untuk Category & Wallet (saat ini read-only)

---

## 🎯 Planned Features

### High Priority (Minggu depan)

- [ ] **Analytics page MVP** — pie chart per kategori, daily expense bar chart, monthly summary cards. Lihat [Analytics](features/analytics.md)
- [ ] **Edit/Delete Category & Wallet** UI — saat ini read-only
- [ ] **Cicilan hutang parsial** — input nominal parsial, `remaining_amount -= amount`
- [ ] **Export/Import JSON** (offline, tanpa Google Drive)
- [ ] **Data validation** dengan zod untuk semua form submit

### Medium Priority (Bulan depan)

- [ ] **Multi-currency** — tambah `currency: string` di Wallet & Transaction, formatter sesuai locale
- [ ] **Transfer antar dompet** — 1 aksi = 2 transaksi (expense dari A, income ke B) atomic
- [ ] **Filter advanced di History** — by date range, by category, by wallet, by amount
- [ ] **Search** di History, Categories, Wallets
- [ ] **Budget per kategori** — set target bulanan, lihat progress
- [ ] **Recurring transaction** — auto-create dari template (gaji bulanan, dll)
- [ ] **Theme customization** — pilih accent color (purple, blue, green, dst)

### Low Priority (Backlog)

- [ ] **Encrypted local data** — subtle.crypto dengan user-derived key (opsional, untuk paranoid mode)
- [ ] **Biometric unlock** — WebAuthn / Face ID / fingerprint gate
- [ ] **Real Google Drive sync** — bukan cuma backup, tapi live sync multi-device. Butuh backend tipis untuk conflict resolution
- [ ] **Internationalization** — struktur `messages/id.json`, `messages/en.json`, switch bahasa
- [ ] **Notifikasi** — Web Notifications API untuk bill reminders, budget alerts
- [ ] **PDF/CSV export** — laporan bulanan/tahunan
- [ ] **Forecasting** — linear regression dari tren expense, prediksi saldo akhir bulan
- [ ] **Tagging** — flexible label di transaksi, multi-tag per transaksi
- [ ] **Shared wallet** (untuk pasangan/keluarga) — sync via Drive, conflict resolution per-device

---

## 🏗️ Architectural Improvements

- [ ] **Backend tipis untuk OAuth proxy** — Vercel Function / Cloud Function, isolation layer antara client dan Google APIs
- [ ] **End-to-end type safety** — pakai tRPC atau pure RPC untuk komunikasi (kalau ada backend)
- [ ] **Schema versioning** — explicit migration system, versioned backup format
- [ ] **State management cleanup** — cabut `zustand` (terpasang tapi tidak dipakai), atau pakai kalau memang butuh
- [ ] **Cabut unused dependencies** — `fflate` (kalau tidak dipakai)
- [ ] **Testing infrastructure** — Vitest + Testing Library, Playwright E2E
- [ ] **CI/CD** — GitHub Actions: lint + typecheck + build + Lighthouse audit
- [ ] **Monitoring** — Sentry atau alternatif untuk error tracking di production
- [ ] **Analytics untuk owner** — privacy-respecting (Plausible / Umami self-hosted) untuk tahu usage pattern

---

## 📊 Performance Targets

Lighthouse score (target mobile):
- Performance: ≥ 90
- Accessibility: ≥ 95
- Best Practices: ≥ 95
- SEO: ≥ 90
- PWA: Installable + offline functional

Core Web Vitals:
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

---

## 🤝 Contributing

MoniKu saat ini adalah personal project. Kalau mau kontribusi:

1. Buka issue dulu untuk diskusi (kalau repo public) atau langsung PR untuk fix kecil
2. Ikuti [Conventions](conventions.md)
3. Update dokumentasi terkait kalau tambah/ubah fitur
4. Test manual di mobile + desktop, light + dark mode
5. Jalankan `npm run lint` sebelum commit

## Lihat juga

- [Conventions](conventions.md) — code style
- [Architecture](architecture.md) — kenapa begini
- [Data Model](data-model.md) — entities untuk di-extend
- Semua [Features](features/index.md) — context untuk improvement tertentu
