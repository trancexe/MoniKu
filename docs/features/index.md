# Features Overview

MoniKu punya 6 halaman utama. Masing-masing punya halaman wiki detail di folder ini.

## Peta Fitur

| Halaman | Route | Komponen Inti | Status |
|---------|-------|---------------|--------|
| Dashboard | `/` | `DashboardOverview` | ✅ Stabil |
| Catat Transaksi | `/transactions` | `TransactionForm`, `CustomNumpad` | ✅ Stabil |
| Riwayat Transaksi | `/transactions/history` | `TransactionHistory` | ✅ Stabil |
| Edit Transaksi | (modal di History) | `TransactionEditSheet`, `TransactionDeleteDialog` | ✅ Stabil |
| Hutang/Piutang | `/debts` | `DebtForm`, `DebtList` | ⚠️ Repay selalu lunas (no cicilan) |
| Analitik | `/analytics` | (placeholder) | 🚧 Segera Hadir |
| Pengaturan | `/settings` | `ThemeSettings`, `SyncSettings`, `WalletList`, `CategoryList` | ✅ Stabil |

## Ringkasan

### Dashboard
Landing page. Menampilkan **Total Balance Card** (aggregate, atau saldo wallet tunggal saat filter aktif), **Wallet Card Selector** (horizontal scroll, tap = filter), **Hide Balance toggle** (👁 di pojok kanan-atas Total Balance Card — propagasi ke transaction row amount + wallet card balances), 2 quick action card, dan 5 transaksi terakhir (filtered by selected wallet kalau ada). URL `?wallet=<id>` adalah source of truth untuk filter, sehingga shareable & back/forward akurat.

📄 [Detail →](dashboard.md)

### Transaksi (Create)
Form input dengan custom numpad. Pilih kategori dan dompet via grid picker. Validasi pakai **zod schema** dengan pesan error i18n: amount > 0, max 1 Triliun, wallet & category wajib dipilih. Submit melakukan atomic `db.transaction` yang insert transaksi + update saldo wallet.

📄 [Detail →](transactions.md)

### Riwayat Transaksi
List transaksi dikelompokkan per hari dengan header "Hari Ini" / "Kemarin" / "Senin, 12 Juni 2026". Dua filter yang bisa di-stack: **Type filter** (Semua / Pemasukan / Pengeluaran) via `useState` lokal + **Wallet filter** (URL `?wallet=<id>` via `useWalletFilter()` hook). Daily totals di header. Click row → buka edit sheet.

📄 [Detail →](transactions.md)

### Edit Transaksi
Bottom sheet (96vh) dengan form yang sudah pre-fill. Sama dengan create, plus tombol hapus di bawah. Edit logic: reverse efek di wallet lama, apply efek baru di wallet baru (jika wallet_id berubah).

📄 [Detail →](transactions.md)

### Hapus Transaksi
Dialog konfirmasi dengan summary transaksi (kategori, tanggal, nominal, catatan). Confirm → reverse balance + delete.

📄 [Detail →](transactions.md)

### Hutang/Piutang
Form catatan hutang (saya ngutang ke X) atau piutang (X ngutang ke saya). List dengan tombol "Bayar Lunas" per item. Repay flow: catat transaksi 'system-repayment' + update `debt_loans.status = 'paid'`.

📄 [Detail →](debts.md)

### Analitik
Placeholder dengan icon PieChart dan text "Segera Hadir". Rencana: grafik per kategori, laporan bulanan, tren saldo.

📄 [Detail →](analytics.md)

### Pengaturan
Empat section:
- **Tampilan** — switch dark mode & follow system (next-themes)
- **Cloud Backup (Google Drive)** — login + backup/restore
- **Dompet** — list + form tambah
- **Kategori** — list + form tambah (dengan icon picker)

📄 [Detail →](settings.md), [Master Data →](categories-wallets.md)

## Cross-Feature Concerns

- **Bottom navigation** ada di setiap halaman (kecuali `/transactions` yang punya numpad di tempat)
- **Toaster** (sonner) global, muncul top-center
- **AppInit** jalan sekali saat mount: seed database (jika kosong) + unregister SW (workaround)
- **Live queries** (`useLiveQuery`) bikin semua list otomatis update saat data berubah
- **URL state** (`?wallet=<id>`) driving wallet filter di home + history, via `useWalletFilter()` hook
- **Suspense boundaries** di `page.tsx` yang konsumsi `useSearchParams` (diperlukan untuk static export)
- **i18n** via `useT()` dari `LocaleProvider`, messages di `src/lib/i18n/locales/{id,en}.json`

## Lihat juga
- [Data Model](../data-model.md) — entity & relasi
- [Architecture](../architecture.md) — provider tree, data flow, URL-state & hide-mode patterns
- [Conventions](../conventions.md) — zod validation, code style
- [Roadmap](../roadmap.md) — fitur yang akan datang & recently-shipped
