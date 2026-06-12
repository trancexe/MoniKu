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
Landing page. Menampilkan total saldo (jumlah semua `wallets.current_balance`), 10 transaksi terakhir, dan 2 quick action card. Loading skeleton saat data belum ready.

📄 [Detail →](dashboard.md)

### Transaksi (Create)
Form input dengan custom numpad. Pilih kategori dan dompet via grid picker. Validasi: amount > 0, wallet & category wajib dipilih. Submit melakukan atomic `db.transaction` yang insert transaksi + update saldo wallet.

📄 [Detail →](transactions.md)

### Riwayat Transaksi
List transaksi dikelompokkan per hari dengan header "Hari Ini" / "Kemarin" / "Senin, 12 Juni 2026". Filter tab (Semua / Pemasukan / Pengeluaran). Daily totals di header. Click row → buka edit sheet.

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

## Lihat juga

- [Data Model](../data-model.md) — entity & relasi
- [Architecture](../architecture.md) — provider tree, data flow
- [Roadmap](../roadmap.md) — fitur yang akan datang
