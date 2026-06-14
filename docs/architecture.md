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
├── utils.ts           # cn() helper (clsx + tailwind-merge)
├── hooks/             # Custom React hooks
│   └── useWalletFilter.ts   # URL ?wallet=<id> source of truth
└── i18n/              # LocaleProvider + locales/{id,en}.json
    ├── LocaleProvider.tsx
    ├── config.ts
    └── locales/
        ├── id.json
        └── en.json
```

Library sengaja tipis — business logic tetap dekat dengan component. Hooks masuk `lib/hooks/`, i18n masuk `lib/i18n/` (sub-module karena multi-file). Lihat [Conventions](conventions.md) untuk kapan extract ke `lib/` vs inline.

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
- `lang="en"` di JSX static masih salah — UI 100% Indonesia. `LocaleProvider` runtime-set `document.documentElement.lang = locale` di `useEffect`, tapi initial SSR HTML masih render `en`. Lihat [Roadmap](roadmap.md) untuk fix
- `suppressHydrationWarning` karena next-themes memodifikasi `<html>` saat SSR
- Toaster di luar mobile frame supaya toast tidak tertutup container
- ThemeProvider di paling luar agar OAuth & AppInit bisa baca tema
- LocaleProvider di antara ThemeProvider dan GoogleOAuthProvider agar `useT()` tersedia di seluruh tree (termasuk OAuth flow)
- Page yang pakai `useSearchParams` (`/`, `/transactions/history`) dibungkus `<Suspense>` di `page.tsx`-nya masing-masing — required oleh static export agar build tidak error

## Data Flow

### Live Queries
Komponen tidak pegang state lokal untuk data dari DB. Pakai `useLiveQuery` dari `dexie-react-hooks`:

```typescript
const wallets = useLiveQuery(() => db.wallets.toArray());
// → re-render otomatis saat tabel wallets berubah
```

Tidak ada Redux, Zustand (meskipun dependency terpasang), atau context untuk data domain. Dexie adalah single source of truth.

### URL State (Filter Shareable)
Untuk filter yang ingin di-share atau di-bookmark (mis. wallet filter `?wallet=<id>`), pakai URL sebagai source of truth, bukan `useState` lokal. Pola:

```typescript
// src/lib/hooks/useWalletFilter.ts
export function useWalletFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedWalletId = searchParams.get("wallet");
  // ...resolve, setWalletFilter (router.replace)
  return { selectedWalletId, effectiveWalletId, setWalletFilter, ... };
}
```

Page yang konsumsi hook **harus** dibungkus `<Suspense>` di `page.tsx` (lihat "Provider Tree" catatan di atas). Lihat [Conventions](conventions.md#url-state-pattern) untuk detail lengkap + trade-off.

### Persistent UI State (Hide Mode, dll.)
Untuk UI state yang **per-user** (bukan per-route) dan harus persistif across reload, pakai `useSyncExternalStore` + `localStorage`. Contoh: hide balance toggle.

```typescript
// inline di DashboardOverview.tsx
const isBalanceHidden = useSyncExternalStore(
  subscribeToHideBalance,        // listen 'storage' event
  readHideBalanceSnapshot,      // localStorage.getItem("moniku-hideBalance") === "1"
  () => false                   // SSR snapshot
);
```

Pola ini SSR-safe (return `false` di server), cross-tab sync (via native `storage` event), dan same-tab sync (manual `dispatchEvent(new StorageEvent(...))` di setter). Lihat [Conventions](conventions.md#hide-mode-pattern) untuk detail.

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
