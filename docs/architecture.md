# Architecture

Gambaran high-level arsitektur MoniKu, data flow, dan keputusan desain utama.

## Prinsip Desain

1. **Local-first** — data utama selalu di device user. Server hanya untuk backup (opsional)
2. **Privacy by default** — tidak ada telemetry, analytics, atau tracking
3. **Offline-capable** — harus jalan tanpa internet (kecuali sync)
4. **Mobile-first** — UI dirancang untuk layar sempit, desktop di-stretch dengan max-width
5. **No vendor lock-in** — export/import standar JSON; OAuth hanya untuk satu fitur opsional

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │                  Next.js (Static)                  │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │      │
│  │  │   App Router │  │  Components  │  │   PWA    │  │      │
│  │  │  (RSC + CC)  │  │  (React 19)  │  │  Shell   │  │      │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────┘  │      │
│  │         │                 │                         │      │
│  │         └────────┬────────┘                         │      │
│  │                  ▼                                  │      │
│  │         ┌─────────────────┐                         │      │
│  │         │  Dexie + Hooks  │                         │      │
│  │         └────────┬────────┘                         │      │
│  │                  ▼                                  │      │
│  │         ┌─────────────────┐                         │      │
│  │         │   IndexedDB     │  (FinTrackDB)           │      │
│  │         └─────────────────┘                         │      │
│  └────────────────────────────────────────────────────┘      │
│                          │                                   │
│                          ▼ (opsional)                        │
│                  ┌───────────────┐                           │
│                  │  Google APIs  │  (Drive appDataFolder)    │
│                  └───────────────┘                           │
└──────────────────────────────────────────────────────────────┘
```

## Komponen Inti

### App Router (Next.js 16)

MoniKu pakai App Router dengan static export. Tiap route adalah file `page.tsx` di `src/app/`:

```
src/app/
├── layout.tsx                 # Root: provider tree, mobile frame
├── page.tsx                   # /
├── transactions/
│   ├── page.tsx               # /transactions
│   └── history/page.tsx       # /transactions/history
├── analytics/page.tsx         # /analytics
├── debts/page.tsx             # /debts
└── settings/page.tsx          # /settings
```

Routes ditambahkan dengan konvensional — folder = path segment, `page.tsx` = route handler. Tidak ada dynamic routes, tidak ada API routes (semua client-side).

### Komponen

Diorganisir by feature, bukan by type. `src/components/<feature>/` berisi semua yang relevan dengan satu fitur:

```
src/components/
├── ui/                # shadcn primitives (semua fitur pakai)
├── providers/         # Cross-cutting (Theme, AppInit)
├── layout/            # BottomNav
├── transactions/      # Form, History, Edit, Delete, Numpad
├── master-data/       # Category, Wallet
├── debts/             # DebtList, DebtForm
├── settings/          # ThemeSettings, SyncSettings
└── dashboard/         # DashboardOverview
```

### Library

```
src/lib/
├── db.ts              # Dexie instance + schema + types
├── gdrive.ts          # Google Drive upload/download
├── seed.ts            # Initial data
└── utils.ts           # cn() helper (clsx + tailwind-merge)
```

## Provider Tree

Root layout (`src/app/layout.tsx`) menyusun provider hierarkis:

```
<html lang="en" suppressHydrationWarning>
  └─ <body>
     └─ <ThemeProvider>           # next-themes
        └─ <GoogleOAuthProvider>  # @react-oauth/google
           └─ <AppInit>           # seed + SW cleanup
              └─ <MobileFrame>    # div dengan max-w-md
                 ├─ <main>{children}</main>
                 └─ <BottomNav />
        └─ <Toaster />            # sonner (di luar frame)
```

Catatan:
- `lang="en"` saat ini salah — UI 100% Indonesia. Akan difix ke `lang="id"` (lihat [Roadmap](roadmap.md))
- `suppressHydrationWarning` karena next-themes memodifikasi `<html>` saat SSR
- Toaster di luar mobile frame supaya toast tidak tertutup container
- ThemeProvider di paling luar agar OAuth & AppInit bisa baca tema

## Data Flow

### Live Queries
Komponen tidak pegang state lokal untuk data dari DB. Pakai `useLiveQuery` dari `dexie-react-hooks`:

```typescript
// transactions/page.tsx
const wallets = useLiveQuery(() => db.wallets.toArray());
// → re-render otomatis saat tabel wallets berubah
```

Tidak ada Redux, Zustand (meskipun dependency terpasang), atau context untuk data domain. Dexie adalah single source of truth.

### Form State
Form pakai React `useState`. Submit handler melakukan `db.transaction('rw', ...)` yang membungkus beberapa operasi DB jadi atomic:

```typescript
// Catat transaksi + update saldo atomically
await db.transaction('rw', db.transactions, db.wallets, async () => {
  await db.transactions.add({ ... });
  await db.wallets.update(walletId, { current_balance: newBalance });
});
```

Lihat [Transactions](features/transactions.md) untuk detail pattern edit/delete.

## Static Export Trade-offs

`next.config.ts` set `output: "export"`. Implikasi:

| ✅ Dapat | ❌ Tidak Dapat |
|----------|---------------|
| Deploy ke static host mana pun (Vercel, Netlify, Cloudflare Pages, GH Pages) | API Routes (Route Handlers) |
| Build sekali, jalan di mana saja | Server Actions |
| CDN-friendly, cache-friendly | ISR / on-demand revalidation |
| Tidak perlu Node.js di server | Image optimization runtime (perlu pre-build atau external service) |

Konsekuensi kunci untuk MoniKu:
- OAuth pakai **implicit flow** (token di URL fragment), bukan authorization code + PKCE. Google mulai deprecate. Lihat [Google Drive Sync](google-drive-sync.md) untuk mitigasi.
- Tidak ada server-side validation. Semua input divalidasi client.
- Tidak ada server-side secret. OAuth Client ID publik (sengaja).

## Kenapa Tidak Pakai Server Backend?

Pertimbangan:

1. **Biaya** — serverless/managed DB = biaya bulanan. Static + IndexedDB = gratis
2. **Privasi** — data keuangan sensitif, tidak nyaman disimpan di server orang lain
3. **Kompleksitas** — auth, DB, migrations, deployment overhead
4. **Offline** — tanpa backend, app bisa jalan offline by default
5. **Single user** — MoniKu dirancang untuk personal use, bukan multi-user SaaS

Trade-off yang diterima:
- Tidak ada cross-device sync tanpa setup user (Cloud Backup manual)
- Tidak ada real-time collaboration (tidak dibutuhkan)
- Tidak ada analytics untuk owner (justru fitur, bukan bug)

## Kenapa Dexie (bukan localStorage)?

| | localStorage | IndexedDB (Dexie) |
|---|---|---|
| Capacity | ~5-10 MB | Ratusan MB - GB |
| API | String key-value | Indexed, transactions, cursors |
| Performance | Synchronous, blocking | Async |
| Query | Parse JSON manual | Index, range, where clause |

Untuk data keuangan dengan banyak transaksi, IndexedDB adalah pilihan yang tepat. Dexie menambah:
- Promise-based API (vs IDBRequest event)
- TypeScript-friendly schema declaration
- React hooks integration
- Migration support

## Kenapa shadcn/ui di atas @base-ui/react (bukan Radix)?

`@base-ui/react` adalah primitif headless baru dari tim MUI. Dipilih karena:
- **Bundle size** lebih kecil dari Radix untuk komponen yang dipakai
- **API lebih konsisten** dengan style modern React 19
- **shadcn config** support — `components.json` set `style: "base-nova"`
- Lisensi MIT, tidak ada lock-in

Pakai shadcn CLI (`npx shadcn add <component>`) untuk generate komponen baru.

## Folder Layout (Rasionale)

By-feature (bukan by-type). Alasan:
- Developer yang kerja di satu fitur tidak perlu lompat-lompat folder
- Mudah di-extract jadi package terpisah kalau mau
- Sesuai konvensi modern (Next.js docs, Vercel templates)
- Trade-off: ada beberapa cross-feature components di `ui/` dan `lib/` yang jadi shared

## Lihat juga

- [Data Model](data-model.md) — schema & relationships
- [PWA](pwa.md) — service worker, manifest
- [Google Drive Sync](google-drive-sync.md) — OAuth, backup
- [Conventions](conventions.md) — code style, naming
