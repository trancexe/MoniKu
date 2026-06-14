# Dashboard

Landing page MoniKu di route `/`. Komponen: `src/components/dashboard/DashboardOverview.tsx`, dibungkus `<Suspense>` di `src/app/page.tsx` (diperlukan untuk `useSearchParams` di static export).

## Anatomi Halaman

```
┌──────────────────────────────────────┐
│ MoniKu                       [icon]  │  ← Header
│ Keuangan Anda                        │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Total Saldo / [Nama Wallet] [👁] │ │  ← Total Balance Card
│ │ Rp 12.500.000                     │ │     (eye toggle → hide mode)
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────┐ ┌──────────────┐    │  ← Wallet Card Selector
│ │ [icon] BCA   │ │ [icon] Tunai │    │     (horizontal scroll,
│ │ Rp 5.000.000 │ │ Rp 500.000   │    │      tap = filter)
│ └──────────────┘ └──────────────┘    │
│                                      │
│ ┌─────────────┐ ┌─────────────┐      │  ← Quick Actions
│ │ Hutang/     │ │ Catat       │      │     (next/link)
│ │ Piutang     │ │ Transaksi   │      │
│ └─────────────┘ └─────────────┘      │
│                                      │
│ Transaksi Terakhir    Lihat Semua    │
│ ┌──────────────────────────────┐    │
│ │ [icon] Makan          -Rp..  │    │  ← 5 latest transactions
│ │         12 Jun 2026, 13:00   │    │     (filtered by selected wallet)
│ └──────────────────────────────┘    │
│ ...                                  │
└──────────────────────────────────────┘
```

## State

| Concern | Mekanisme | Lokasi |
|---------|-----------|--------|
| Hide balance toggle | `useSyncExternalStore` + `localStorage["moniku-hideBalance"]` | inline di `DashboardOverview.tsx` |
| Selected wallet filter | URL `?wallet=<id>` via `useSearchParams` | `src/lib/hooks/useWalletFilter.ts` |
| Transaction list | `useLiveQuery` (Dexie) — wallet-aware query | `DashboardOverview.tsx` |
| Edit sheet open/close | `useState` lokal | `DashboardOverview.tsx` |

URL `?wallet=<id>` adalah **single source of truth** untuk wallet filter. Setting di home ter-propagasi ke `/transactions/history` via link `Lihat Semua` yang membawa param, dan sebaliknya (browser back/forward tetap akurat). Lihat [Conventions](../conventions.md#url-state-pattern) untuk detail pola.

## Section Detail

### Total Balance Card (`DashboardOverview.tsx:148-175`)

Dua mode:
- **Default** (no wallet selected): label "Total Saldo", nilai = `sum(wallets.current_balance)`
- **Filtered** (`?wallet=<id>` active): label = nama wallet, nilai = `wallet.current_balance`

Tombol 👁 di pojok kanan-atas toggle hide mode (persistif via `localStorage`):
- Visible: `formatCurrency(balance)` (e.g. `Rp 12.500.000`)
- Hidden: `t("dashboard.balanceHidden")` (placeholder `Rp •••••••`)

Hide mode juga propagate ke transaction row amount (muncul `•••` instead of nominal) dan ke wallet card balances. Privacy intent ter-cover di seluruh home page. Lihat [Conventions](../conventions.md#hide-mode-pattern) untuk pola `useSyncExternalStore` + `localStorage`.

### Wallet Card Selector (`DashboardOverview.tsx:177-209`)

Horizontal scroll dari `WalletCard` (satu card per wallet). Tap = filter ke wallet itu. Tap card yang aktif = deselect (kembali ke "all wallets", Total Balance Card nunjuk aggregate).

Tidak ada "Semua" card eksplisit — Total Balance Card sudah jadi representasi implicit dari state tanpa filter. Menghilangkan "Semua" card = fewer visual noise + tap target lebih besar per wallet.

Setiap `WalletCard` menampilkan:
- Icon wallet (atas-kiri)
- Nama wallet (atas)
- Nominal saldo wallet (bawah, `text-sm font-semibold tabular-nums`)
- Active state: dark background (sama dengan Total Balance Card) untuk konsistensi visual
- Inactive: white dengan border

Hide mode membuat amount card jadi `Rp •••••••` (placeholder sama dengan Total Balance Card).

Implementasi: `src/components/ui/WalletCard.tsx`. Saudara visual dari `WalletChip` (variant compact dipakai di `/transactions/history`).

### Quick Actions (`DashboardOverview.tsx:212-226`)

Dua card navigasi pakai Next.js `<Link>`:
- **Hutang / Piutang** → `/debts`, icon `Users`
- **Catat Transaksi** → `/transactions`, icon `PlusCircle`

Aktif (`active:scale-[0.98]`) + hover state untuk tactile feedback.

### Recent Transactions (`DashboardOverview.tsx:228-301`)

**5 transaksi terakhir**, diurutkan descending by `date`. Limit 5 (bukan 10) — sisanya di `/transactions/history` (link "Lihat Semua" membawa `?wallet=<id>` kalau ada filter aktif).

Query Dexie **wallet-aware** — saat wallet dipilih, query melakukan `where('wallet_id').equals(id)` + sort by date + slice 5. Tanpa ini, limit 5 global akan memotong wallet dengan sedikit transaksi (lihat catatan di [Roadmap](../roadmap.md)).

```typescript
// DashboardOverview.tsx:75-90 (sketch)
const transactions = useLiveQuery(async () => {
  if (selectedWalletId) {
    const all = await db.transactions
      .where("wallet_id").equals(selectedWalletId).toArray();
    return all.sort((a, b) => b.date - a.date).slice(0, HOME_TX_LIMIT);
  }
  return db.transactions.orderBy("date").reverse().limit(HOME_TX_LIMIT).toArray();
}, [selectedWalletId]);
```

Tiap item: icon kategori, nama kategori, tanggal + jam + catatan, nominal dengan tanda +/−. Tiap row adalah `<button type="button">` (focusable, keyboard accessible) → buka `TransactionEditSheet`.

### Empty State (Recent Transactions)

Ditampilkan saat `transactions.length === 0`:
- Icon Receipt dalam lingkaran
- "Belum ada transaksi"
- "Mulai catat pengeluaran atau pemasukan Anda"
- Button CTA "Catat Transaksi" → `/transactions`

## Loading States

Skeleton `animate-pulse` saat `wallets`, `transactions`, atau `categories` belum ready. Placeholder cards untuk Total Balance, Quick Actions, dan 4 row transaksi.

## Aksesibilitas

- Total Balance Card: kontras tinggi (putih di zinc-950)
- Hide toggle: `aria-label` dinamis (ID/EN), `aria-pressed` untuk state
- Wallet Card Selector: `role="tablist"` + `aria-label` + `aria-selected` per card
- Quick Actions: `<Link>` Next.js (client-side nav, focusable, screen-reader friendly)
- Transaction row: `<button type="button">` (focusable, keyboard handler via `onClick`)
- Wallet card balance: `tabular-nums` untuk konsistensi alignment digit

## Lihat juga
- [Transactions](transactions.md) — history dengan wallet filter
- [Data Model](../data-model.md) — entities
- [Architecture](../architecture.md) — live query pattern, `useSyncExternalStore`
- [Conventions](../conventions.md) — URL-state & hide-mode patterns
- [Roadmap](../roadmap.md) — known issues
