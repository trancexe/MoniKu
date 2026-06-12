# Analitik

Halaman `/analytics`. **Saat ini placeholder** — menampilkan empty state "Segera Hadir".

## Status

🚧 **Segera Hadir.** File `src/app/analytics/page.tsx` saat ini hanya render:

```tsx
<div className="flex flex-col p-4">
  <header>
    <h1>Analitik</h1>
    <p>Ringkasan pengeluaran dan pemasukan</p>
  </header>
  <div className="flex-1 flex items-center justify-center">
    <div className="rounded-3xl bg-zinc-50 p-10 text-center">
      <PieChart className="h-7 w-7" />
      <h2>Segera Hadir</h2>
      <p>Fitur grafik dan laporan analitik sedang dalam tahap pengembangan.</p>
    </div>
  </div>
</div>
```

## Data yang Tersedia untuk Diolah

Walau UI belum ada, data sudah cukup untuk analitik dasar. Semua bisa di-query dari `useLiveQuery`:

| Query | Sumber Data |
|-------|-------------|
| Total saldo semua wallet | sum `wallets.current_balance` |
| Total income bulan ini | sum `transactions.amount where type='income' AND date >= monthStart` |
| Total expense bulan ini | sum `transactions.amount where type='expense' AND date >= monthStart` |
| Net (income − expense) bulan ini | hitung di JS |
| Top 5 kategori expense bulan ini | group by `category_id`, sum, sort, limit 5 |
| Tren harian expense 30 hari terakhir | group by day, sum |
| Perbandingan bulan ini vs bulan lalu | hitung dua window, bandingkan delta |

## Rencana Fitur (lihat [Roadmap](../roadmap.md))

### MVP (fase 1)
- **Kartu ringkasan bulan ini**: Income, Expense, Net, Savings rate
- **Pie chart** pengeluaran per kategori (filter bulan)
- **Bar chart** harian expense 30 hari terakhir
- **List top 5** transaksi terbesar

### Phase 2
- **Filter rentang waktu** (minggu / bulan / quarter / tahun / custom)
- **Tren saldo kumulatif** (line chart wallet balance over time)
- **Breakdown per dompet** (multi-bar per kategori)
- **Bandingkan antar bulan** (delta percentage)

### Phase 3
- **Forecast** (linear regression dari tren expense)
- **Budget per kategori** (set target, lihat progress bar)
- **Anomaly detection** (transaksi yang jauh lebih besar dari rata-rata)
- **Export PDF/CSV** untuk laporan bulanan

## Library Chart yang Mungkin Dipakai

| Library | Bundle | Pro | Kontra |
|---------|--------|-----|--------|
| Recharts | ~95KB gz | Declarative, banyak type chart | Bundle besar, kadang re-render lambat |
| Chart.js + react-chartjs-2 | ~70KB gz | Powerful, canvas-based | Kurang idiomatic React |
| Visx (Airbnb) | modular | Modular, fleksibel | Setup lebih banyak |
| Tremor | ~120KB | Dashboard-focused, beautiful default | Bundle besar, less customizable |
| Native SVG (custom) | 0KB | Zero dependency, full control | Harus tulis sendiri |

Trade-off bundle size vs feature. Untuk MoniKu yang mobile-first dan PWA, **Recharts** atau **custom SVG** paling masuk akal. Lihat [Roadmap](../roadmap.md) untuk keputusan final.

## Lihat juga

- [Data Model](../data-model.md) — entities yang akan divisualisasikan
- [Transactions](transactions.md) — sumber data utama
- [Roadmap](../roadmap.md) — phased rollout
