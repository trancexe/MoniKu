# Data Model

Schema IndexedDB (Dexie) untuk MoniKu, dideklarasikan di `src/lib/db.ts`.

## Ringkasan

Database: **`FinTrackDB`**
Versi schema: **1**
Terdiri dari **4 tabel**:

| Tabel | Primary Key | Index | Tujuan |
|-------|-------------|-------|--------|
| `wallets` | `id` | `name`, `updated_at` | Akun/dompet (cash, bank, e-wallet) |
| `categories` | `id` | `type`, `name` | Klasifikasi transaksi |
| `transactions` | `id` | `wallet_id`, `category_id`, `type`, `date`, `sync_status` | Catatan transaksi individual |
| `debt_loans` | `id` | `type`, `person_name`, `status` | Hutang & piutang |

## Entity-Relationship Diagram

```
┌──────────────┐ 1   N ┌──────────────┐ N   1 ┌──────────────┐
│   wallets    │───────│ transactions │───────│  categories  │
│              │       │              │       │              │
│  id (PK)     │       │  id (PK)     │       │  id (PK)     │
│  name        │       │  wallet_id   │       │  type        │
│  icon        │       │  category_id │       │  name        │
│  current_    │       │  type        │       │  icon        │
│   balance    │       │  amount      │       └──────────────┘
│  updated_at  │       │  date        │
└──────────────┘       │  notes       │
                       │  sync_status │
                       └──────────────┘

┌──────────────┐
│  debt_loans  │   ← standalone, tidak ada FK
│              │
│  id (PK)     │
│  type        │   'debt' | 'loan'
│  person_name │
│  total_amount│
│  remaining_  │
│   amount     │
│  status      │   'active' | 'paid'
└──────────────┘
```

**Catatan:**
- Relasi `transactions.wallet_id` → `wallets.id` adalah **soft reference** — tidak ada FK enforcement di IndexedDB. Penghapusan wallet tanpa handle transaksi = orphan (lihat [Roadmap](roadmap.md))
- `categories` dan `wallets` tidak punya relasi ke `transactions` di sisi mereka — relasi satu arah
- `debt_loans` benar-benar terpisah. Saat repayment, transaksi dicatat dengan `category_id = "system-repayment"` (string literal) — bukan FK ke tabel `categories` (lihat catatan di [Debts](features/debts.md))

## Definisi Tipe

```typescript
// src/lib/db.ts:3-9
interface Wallet {
  id: string;                // UUID v4
  name: string;
  icon: string;              // nama icon lucide (e.g. "Wallet", "CreditCard")
  current_balance: number;   // dihitung by accumulation; bukan source of truth ideal
  updated_at: number;        // epoch ms (Date.now())
}

// src/lib/db.ts:11-16
interface Category {
  id: string;
  type: 'income' | 'expense';
  name: string;
  icon: string;
}

// src/lib/db.ts:18-27
interface Transaction {
  id: string;
  wallet_id: string;
  category_id: string;
  type: 'income' | 'expense';
  amount: number;            // integer (parseInt)
  date: number;              // epoch ms
  notes: string;             // bebas, default ""
  sync_status: 'synced' | 'pending';  // saat ini selalu 'pending' saat create
}

// src/lib/db.ts:29-36
interface DebtLoan {
  id: string;
  type: 'debt' | 'loan';     // 'debt' = saya ngutang, 'loan' = saya minjamin
  person_name: string;
  total_amount: number;
  remaining_amount: number;
  status: 'active' | 'paid';
}
```

## Schema Declaration

```typescript
// src/lib/db.ts:46-51
db.version(1).stores({
  wallets: 'id, name, updated_at',
  categories: 'id, type, name',
  transactions: 'id, wallet_id, category_id, type, date, sync_status',
  debt_loans: 'id, type, person_name, status',
});
```

Format Dexie: `<primaryKey>, <index1>, <index2>, ...`. Index dipakai untuk query cepat. Contoh:

```typescript
// Cepat karena ada index 'type'
db.transactions.where('type').equals('expense').toArray()

// Cepat karena ada index 'date'
db.transactions.orderBy('date').reverse().limit(10).toArray()

// Lambat (scan semua) — tidak ada index
db.transactions.filter(t => t.notes.includes('makan')).toArray()
```

## Konvensi

### ID Generation
Semua entity pakai `crypto.randomUUID()`:

```typescript
id: crypto.randomUUID()  // e.g. "550e8400-e29b-41d4-a716-446655440000"
```

UUID v4 — collision-resistant, tidak butuh coordination. Browser support: semua modern (HTTPS atau localhost required untuk `crypto.subtle`).

### Timestamps
- Disimpan sebagai `number` (epoch milliseconds) untuk sortability & compactness
- Generated via `Date.now()`
- `dayjs` dipakai untuk formatting display (`'D MMM YYYY, HH:mm'` dll) dengan locale `id`

### Amount
- `number` (bukan `bigint`)
- Parsed via `parseInt(amountStr, 10)` — asumsi user input integer (numpad tidak bisa desimal)
- **Batas praktis:** `Number.MAX_SAFE_INTEGER` = 9.007 × 10¹⁵ (Rp 9 kuadrilian). Untuk keuangan personal, jauh dari batas
- **Limitasi saat ini:** tidak ada validasi server-side; user bisa input nilai sangat besar lewat paste/edit DOM. Lihat [Roadmap](roadmap.md)

## Migrasi

Saat ini di **v1**. Untuk menambah schema (mis. tambah kolom `currency` ke `wallets`):

```typescript
// v1 (existing)
db.version(1).stores({
  wallets: 'id, name, updated_at',
  // ...
});

// v2 (new) — tambahkan di BAWAH
db.version(2).stores({
  wallets: 'id, name, updated_at, currency',  // tambah index
});

// Optional: transformasi data existing
db.version(2).upgrade(async (tx) => {
  await tx.table('wallets').toCollection().modify(w => {
    if (!w.currency) w.currency = 'IDR';
  });
});
```

⚠️ Backup dulu sebelum migrasi. Restore dari backup di versi lama masih dimungkinkan selama schema-compatible.

## Index Rationale

| Tabel | Index | Query yang di-optimasi |
|-------|-------|------------------------|
| `wallets` | `name` | List/search by name |
| `wallets` | `updated_at` | Sort by recency |
| `categories` | `type` | Filter income/expense (TransactionForm pakai ini) |
| `categories` | `name` | Search |
| `transactions` | `wallet_id` | Transaksi per dompet (dashboard) |
| `transactions` | `category_id` | Join manual untuk display |
| `transactions` | `type` | Filter income/expense (TransactionHistory) |
| `transactions` | `date` | Sort by date (default: orderBy date reverse) |
| `transactions` | `sync_status` | Find unsynced (untuk future sync) |
| `debt_loans` | `type` | Filter hutang vs piutang |
| `debt_loans` | `person_name` | Search |
| `debt_loans` | `status` | Filter active/paid |

## Live Queries (dexie-react-hooks)

Pattern standar di seluruh app:

```typescript
import { useLiveQuery } from 'dexie-react-hooks';

function MyComponent() {
  const data = useLiveQuery(() => db.someTable.toArray());
  
  if (!data) return <Skeleton />;  // undefined = loading
  return <List items={data} />;
}
```

- `data === undefined` → initial loading
- `data === []` → empty
- `data === [...]` → loaded
- Komponen re-render otomatis saat tabel berubah (di mana pun di app)

## Lihat juga

- [Architecture](architecture.md) — data flow, kenapa Dexie
- [Transactions](features/transactions.md) — atomic balance update pattern
- [Roadmap](roadmap.md) — planned migrations (currency, soft-delete, dll)
