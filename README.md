# MoniKu

> Aplikasi pencatat keuangan pribadi **local-first** dengan backup opsional ke Google Drive.

MoniKu menyimpan data transaksi, dompet, kategori, dan catatan hutang/piutang langsung di browser (IndexedDB). Tidak ada server, tidak ada akun, tidak ada tracking. Backup ke Google Drive murni inisiatif user, lewat OAuth, dan hanya menyentuh folder `appDataFolder` yang terisolasi.

Dibangun sebagai PWA (Progressive Web App) dengan static export, MoniKu bisa dipasang di home-screen ponsel dan berjalan offline.

## Fitur Utama
## Fitur Utama
- **Dashboard** — total saldo gabungan (atau saldo per-wallet) + 5 transaksi terakhir + quick action. Bisa sembunyikan saldo (privacy mode) dan filter per wallet via card selector.
- **Catat Transaksi** — form dengan custom numpad, picker kategori & dompet
- **Riwayat Transaksi** — dikelompokkan per hari (Hari Ini / Kemarin / tanggal lengkap), filter Pemasukan|Pengeluaran|Per Dompet
- **Edit & Hapus Transaksi** — sheet edit, dialog konfirmasi hapus
- **Master Data** — CRUD dompet dan kategori dengan icon picker
- **Hutang/Piutang** — catatan & tombol bayar lunas
- **Pengaturan** — tema (light / dark / system), backup/restore Google Drive
- **PWA** — install ke home-screen, berjalan offline (catatan: integrasi SW sedang dalam perbaikan, lihat [PWA](docs/pwa.md))

## Tech Stack

- **Next.js 16.2.9** (App Router, `output: "export"`)
- **React 19.2.4** + **TypeScript 5** (strict)
- **Tailwind CSS v4**
- **shadcn/ui** (variant `base-nova`) di atas `@base-ui/react`
- **Dexie 4** untuk IndexedDB + `dexie-react-hooks` untuk live queries
- **`@ducanh2912/next-pwa`** (Workbox) untuk service worker
- **`@react-oauth/google`** untuk Google Identity Services
- **next-themes** untuk light/dark/system
- **dayjs** (locale `id`) untuk format tanggal Indonesia
- **sonner** untuk toast, **lucide-react** untuk ikon

## Quick Start

### Prasyarat
- Node.js 20+ (disarankan 22 LTS)
- Browser modern dengan IndexedDB support (Chrome/Edge/Firefox/Safari versi terkini)

### Install & Jalankan
```bash
npm install
npm run dev
# buka http://localhost:3000
```

Di mode development, PWA dinonaktifkan otomatis. Buka DevTools → Application untuk inspeksi IndexedDB (database: `FinTrackDB`).

### Build untuk Produksi
```bash
npm run build
# output: ./out/ (static, siap upload ke hosting statis)
npm run start  # opsional: serve output lokal untuk sanity check
```

### Environment Variables

Salin `.env.example` (jika sudah ada) atau buat `.env.local`:

| Variable | Wajib | Keterangan |
|----------|-------|------------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Hanya untuk sync GDrive | OAuth Web Client ID dari Google Cloud Console. Lihat [Google Drive Sync](docs/google-drive-sync.md). |

## Scripts

| Script | Fungsi |
|--------|--------|
| `npm run dev` | Dev server (webpack, PWA off) |
| `npm run build` | Build produksi → `out/` (static export) |
| `npm run start` | Jalankan `out/` secara lokal |
| `npm run lint` | ESLint |

## Struktur Folder (Ringkas)

```
src/
├── app/                 # Next.js App Router (pages)
├── components/
│   ├── ui/              # shadcn primitives (button, dialog, sheet, ...)
│   ├── providers/       # ThemeProvider, AppInit
│   ├── transactions/    # Form, History, Edit, Delete, Numpad
│   ├── master-data/     # Category & Wallet CRUD
│   ├── debts/           # Hutang/Piutang
│   ├── settings/        # Theme, Sync
│   ├── dashboard/       # DashboardOverview
│   └── layout/          # BottomNav
└── lib/
    ├── db.ts            # Dexie schema + types
    ├── gdrive.ts        # Google Drive upload/download
    ├── seed.ts          # Data awal (kategori & dompet default)
    ├── utils.ts         # cn() helper
    ├── hooks/           # Custom React hooks (useWalletFilter, …)
    └── i18n/            # LocaleProvider + locales/{id,en}.json
```

Lihat [Architecture](docs/architecture.md) untuk detail data flow & rationale.

## Dokumentasi Lengkap

Mulai dari [docs/INDEX.md](docs/INDEX.md). Highlights:

- [Getting Started](docs/getting-started.md) — setup OAuth, first run, PWA install
- [Architecture](docs/architecture.md) — high-level design
- [Data Model](docs/data-model.md) — Dexie schema
- [Features](docs/features/index.md) — breakdown per fitur
- [Theming](docs/theming.md) — color tokens, dark mode
- [PWA](docs/pwa.md) — service worker, status perbaikan
- [Google Drive Sync](docs/google-drive-sync.md) — OAuth, backup format, security notes
- [Deployment](docs/deployment.md) — static hosting, headers
- [Conventions](docs/conventions.md) — code style, naming
- [Roadmap](docs/roadmap.md) — known issues & planned features

## Status Build

✅ **Build TypeScript & ESLint bersih** untuk semua file yang disentuh saat iterasi terakhir. Project static export 9 halaman ter-render, total `out/` ≈ 4.3 MB. Detail status lint/build per-commit ada di git log. Lihat [Roadmap](docs/roadmap.md) untuk known issues yang masih outstanding (PWA SW cleanup, OAuth security hardening, dsb).

## Lisensi

Private / Unlicensed.
