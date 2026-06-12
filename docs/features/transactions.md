# Transaksi

Fitur inti MoniKu: mencatat, menampilkan, mengedit, dan menghapus transaksi.

## Komponen

| File | Peran |
|------|-------|
| `src/components/transactions/TransactionForm.tsx` | Form input (halaman `/transactions`) |
| `src/components/transactions/CustomNumpad.tsx` | Numpad custom untuk amount |
| `src/components/transactions/TransactionHistory.tsx` | List + filter (halaman `/transactions/history`) |
| `src/components/transactions/TransactionEditSheet.tsx` | Bottom sheet edit (modal) |
| `src/components/transactions/TransactionDeleteDialog.tsx` | Dialog konfirmasi hapus |

## Alur Create

1. User buka `/transactions`
2. Pilih tipe: **Pengeluaran** (default) atau **Pemasukan**
3. Pilih **Kategori** dari grid (filtered by type)
4. Pilih **Dompet** dari grid
5. Set **Waktu** via `datetime-local` input (default: now)
6. Tambah **Catatan** (opsional)
7. Tap tombol angka di numpad untuk isi nominal
8. Tap **Simpan Transaksi**

### Validasi (di `TransactionForm.tsx:27-31`)
```typescript
if (amount <= 0) return toast.error("Masukkan nominal yang valid");
if (!walletId) return toast.error("Pilih dompet");
if (!categoryId) return toast.error("Pilih kategori");
```

### Atomic Balance Update (di `TransactionForm.tsx:35-60`)
```typescript
await db.transaction('rw', db.transactions, db.wallets, async () => {
  const wallet = await db.wallets.get(walletId);
  if (!wallet) throw new Error("Wallet not found");

  await db.transactions.add({
    id: crypto.randomUUID(),
    wallet_id: walletId,
    category_id: categoryId,
    type,
    amount,
    date: new Date(transactionDate).getTime(),
    notes,
    sync_status: 'pending',
  });

  const newBalance = type === 'income'
    ? wallet.current_balance + amount
    : wallet.current_balance - amount;

  await db.wallets.update(walletId, {
    current_balance: newBalance,
    updated_at: Date.now(),
  });
});
```

**Kenapa `db.transaction`?** Jika insert transaksi berhasil tapi update wallet gagal (mis. tab ditutup), DB tetap konsisten — salah satu atau dua-duanya rollback. Tanpa transaction, bisa ada transaksi "hantu" yang tidak masuk saldo.

## Custom Numpad

`CustomNumpad.tsx` adalah numpad 3×4 + tombol submit full-width:

```
[ 1 ] [ 2 ] [ 3 ]
[ 4 ] [ 5 ] [ 6 ]
[ 7 ] [ 8 ] [ 9 ]
[000 ] [ 0 ] [ ⌫  ]
[      Simpan Transaksi       ]
```

### Behavior
- Default value: `"0"`. Tekan angka → replace `"0"` (kecuali tekan `"0"` lagi)
- Tombol `"000"` append tiga nol
- Tombol `⌫` hapus digit terakhir; jika tinggal 1 digit, jadi `"0"`
- **Limit 12 karakter** untuk cegah overflow UI
- Tombol submit di bawah, full-width, primary color

### Aksesibilitas
⚠️ **Issue:** tombol numpad tidak punya `aria-label` (lihat [Roadmap](../roadmap.md)). Untuk sementara pakai `title` attribute (TODO).

## Date Handling

User lihat `datetime-local` input → format `YYYY-MM-DDTHH:mm` (ISO local time).

Konversi ke timestamp untuk DB:
```typescript
// TransactionForm.tsx:18-20
const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
return local.toISOString().slice(0, 16);
```

Trik `getTimezoneOffset` menggeser ke UTC, lalu `toISOString().slice(0,16)` dapat string "local" tanpa suffix Z. ⚠️ Ini bisa off-by-hour saat DST; untuk Indonesia (tidak ada DST) aman.

## Alur History

`/transactions/history` menampilkan semua transaksi, dikelompokkan per hari:

1. Query: `db.transactions.orderBy('date').reverse().toArray()` — urut terbaru dulu
2. Group: `reduce` jadi `[{label, date, items}]`. Label = `"Hari Ini"` / `"Kemarin"` / `"dddd, D MMMM YYYY"` (format dayjs locale `id`)
3. Hitung daily totals (income & expense) per group, tampilkan di header group
4. Filter via tab: `"all" | "income" | "expense"` (`.filter` di array, bukan query ulang)

### Empty States
- **No transactions at all**: card dengan icon Receipt + "Belum ada transaksi" + "Mulai catat transaksi keuangan Anda"
- **No transactions matching filter**: card sama tapi text berbeda (`"Belum ada pemasukan"` / `"pengeluaran"`)
- **Has transactions**: grouped list

## Alur Edit

Edit pakai bottom sheet (`@base-ui/react/dialog` dengan `side="bottom"`, height 96vh). Pattern pre-fill via `useEffect`:

```typescript
// TransactionEditSheet.tsx:43-54
useEffect(() => {
  if (transaction && open) {
    setType(transaction.type);
    setAmountStr(String(transaction.amount));
    setCategoryId(transaction.category_id);
    setWalletId(transaction.wallet_id);
    setNotes(transaction.notes || "");
    const d = new Date(transaction.date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    setTransactionDate(local.toISOString().slice(0, 16));
  }
}, [transaction, open]);
```

⚠️ **ESLint warning** di sini (`react-hooks/set-state-in-effect`) — pola update state dari prop. Solusi ideal: turunkan state (lift state up) atau pakai `key` prop untuk remount. Lihat [Roadmap](../roadmap.md).

### Edit Balance Logic (di `TransactionEditSheet.tsx:65-114`)

Lebih kompleks dari create karena harus handle 3 kasus:

1. **Wallet sama** (tidak berubah):
   - Reverse old effect: `oldBalance ± oldAmount` (tanda dibalik)
   - Apply new effect: `currentBalance ± newAmount`

2. **Wallet beda**:
   - Reverse old effect di `transaction.wallet_id`
   - Apply new effect di `walletId` baru

Semua dalam satu `db.transaction('rw', ...)` agar konsisten.

## Alur Delete

Click tombol merah "Hapus Transaksi" di edit sheet → buka `TransactionDeleteDialog`.

Dialog menampilkan:
- Icon kategori (warna sesuai income/expense)
- Nama kategori + tanggal + catatan
- Nominal dengan tanda `+`/`-` dan prefix `Rp`

Confirm "Hapus" → atomic transaction:
1. Reverse effect di `wallet_id`: `oldBalance ∓ amount` (kebalikan dari insert)
2. `db.transactions.delete(transaction.id)`

Cancel / backdrop click → tutup tanpa aksi.

## Sync Status

Field `sync_status: 'synced' | 'pending'` saat ini **selalu diset `'pending'`** saat create/edit. Tidak ada logika sync yang berjalan — field ini placeholder untuk fitur Google Drive sync yang akan datang. Lihat [Google Drive Sync](../google-drive-sync.md) untuk plan integrasi.

## Limitasi Saat Ini

- Tidak ada cicilan / split transaction
- Tidak ada transfer antar dompet (harus 2 transaksi manual: expense + income)
- Tidak ada recurring transaction
- Tidak ada undo (sekali hapus, hilang)
- Wallet balance bisa negatif tanpa warning

## Lihat juga

- [Data Model](../data-model.md) — Transaction entity
- [Debts](debts.md) — pattern repayment yang reuse field `category_id = "system-repayment"`
- [Roadmap](../roadmap.md) — planned improvements
