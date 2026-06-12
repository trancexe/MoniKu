# Dashboard

Landing page MoniKu di route `/`. Komponen: `src/components/dashboard/DashboardOverview.tsx`.

## Anatomi Halaman

```
┌─────────────────────────────────┐
│ MoniKu                [icon]    │  ← Header
│ Keuangan Anda                   │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │  Total Saldo                │ │  ← Balance card
│ │  Rp 12.500.000              │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────┐ ┌─────────────┐ │  ← Quick actions
│ │ Hutang/     │ │ Catat       │ │
│ │ Piutang     │ │ Transaksi   │ │
│ └─────────────┘ └─────────────┘ │
│                                 │
│ Transaksi Terakhir    Lihat Semua│
│ ┌─────────────────────────────┐ │
│ │ [icon] Makan           -Rp.. │ │  ← Recent transactions
│ │         12 Jun 2026, 13:00  │ │     (limit 10)
│ └─────────────────────────────┘ │
│ ...                             │
└─────────────────────────────────┘
```

## Data yang Ditampilkan

### Total Saldo
Sum dari `wallets.current_balance` semua wallet:

```typescript
// DashboardOverview.tsx:29
const totalBalance = wallets?.reduce((acc, wallet) => acc + wallet.current_balance, 0) || 0;
```

Ditampilkan dalam card gelap (`bg-zinc-950`) dengan `tabular-nums` agar alignment digit konsisten. Format: `Rp {totalBalance.toLocaleString("id-ID")}`.

⚠️ **Limitasi:** total ini adalah hasil kumulatif dari mutasi saldo via transaksi. Tidak ada rekonsiliasi/audit. Kalau ada bug yang skip update wallet, total akan salah tapi tidak ada cara deteksi otomatis. Lihat [Roadmap](../roadmap.md).

### Quick Actions
Dua card navigasi, pakai `<a href>` (⚠️ bukan `next/link` — menyebabkan full page reload, lihat [Roadmap](../roadmap.md)):

- **Hutang / Piutang** → `/debts`, icon `Users`
- **Catat Transaksi** → `/transactions`, icon `PlusCircle`

### Recent Transactions
10 transaksi terakhir, diurutkan descending by `date`:

```typescript
// DashboardOverview.tsx:23-25
const transactions = useLiveQuery(() =>
  db.transactions.orderBy('date').reverse().limit(10).toArray()
);
```

Tiap item: icon kategori (warna sesuai income/expense), nama kategori, tanggal + jam + catatan, nominal dengan tanda +/−.

Click row → buka `TransactionEditSheet` (sama dengan di History).

## Loading States

Skeleton (animate-pulse) ditunjukkan saat:
- `wallets` belum ready
- `transactions` belum ready
- `categories` belum ready (untuk lookup icon)

```typescript
if (isLoading) {
  return (
    <div className="flex flex-col space-y-6">
      <Skeleton className="h-32 rounded-2xl" />  // balance card
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
      {/* recent transaction skeletons */}
    </div>
  );
}
```

## Empty State (Recent Transactions)

Ditampilkan saat `transactions.length === 0` (ada wallet tapi belum ada transaksi):

- Icon Receipt dalam lingkaran
- "Belum ada transaksi"
- "Mulai catat pengeluaran atau pemasukan Anda"
- Button CTA "Catat Transaksi" (link ke `/transactions`)

## Aksesibilitas

- Total balance card: kontras tinggi (putih di zink-950)
- Icon kategori: `aria-hidden` implicit (dekoratif); info conveyed via text
- ⚠️ Quick action cards: `<a href>` adalah navigasi, harusnya `<Link>` Next.js untuk client-side nav
- ⚠️ Transaction row: `<article onClick>` — bukan button, tidak focusable, tidak ada keyboard handler (lihat [Roadmap](../roadmap.md))

## Lihat juga

- [Transactions](transactions.md) — detail form & history
- [Data Model](../data-model.md) — entities
- [Roadmap](../roadmap.md) — known issues
