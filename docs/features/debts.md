# Hutang / Piutang

Halaman `/debts` untuk mencatat hutang (saya berutang ke orang lain) atau piutang (orang lain berutang ke saya).

## Komponen

| File | Peran |
|------|-------|
| `src/components/debts/DebtForm.tsx` | Form tambah catatan hutang/piutang |
| `src/components/debts/DebtList.tsx` | List + tombol "Bayar Lunas" |

## Tipe & Terminologi

- **Hutang (`type: 'debt'`)** — "Saya Ngutang" — user berutang ke `person_name`
- **Piutang (`type: 'loan'`)** — "Saya Minjamin" — `person_name` berutang ke user

Field lain:
- `person_name` — nama orang/pihak
- `total_amount` — nominal awal
- `remaining_amount` — sisa (saat ini selalu sama dengan `total_amount` karena tidak ada cicilan)
- `status` — `'active'` (belum lunas) atau `'paid'` (lunas)

## Alur Tambah

1. Buka `/debts`
2. Pilih tipe: **Saya Ngutang** (default) atau **Saya Minjamin**
3. Isi **Nama Orang**
4. Isi **Nominal (Rp)** (integer, > 0)
5. Tap **Simpan Catatan**

### Validasi (di `DebtForm.tsx:16`)
```typescript
if (!personName || !amount || amount <= 0) return toast.error("Data tidak valid");
```

### Simpan (di `DebtForm.tsx:18-26`)
```typescript
await db.debt_loans.add({
  id: crypto.randomUUID(),
  type,
  person_name: personName,
  total_amount: amount,
  remaining_amount: amount,  // awal = total
  status: 'active',
});
```

## Alur Repay (Bayar Lunas)

⚠️ **Limitasi utama:** saat ini hanya mendukung pelunasan total, bukan cicilan parsial. Tombol "Bayar Lunas" akan zero-kan `remaining_amount` dan set `status = 'paid'`.

### Prasyarat
User harus pilih **Dompet** dari dropdown di atas list. Tujuannya: transaksi repayment akan di-apply ke dompet tersebut.

### Logic (di `DebtList.tsx:17-62`)

```typescript
const handleRepay = async (debtId, remainingAmount, type) => {
  if (!selectedWallet) return toast.error("Pilih dompet untuk transaksi ini terlebih dahulu");

  await db.transaction('rw', db.transactions, db.wallets, db.debt_loans, async () => {
    const wallet = await db.wallets.get(selectedWallet);
    if (!wallet) throw new Error("Wallet not found");
    const debt = await db.debt_loans.get(debtId);
    if (!debt) throw new Error("Debt not found");

    // 1. Catat transaksi
    await db.transactions.add({
      id: crypto.randomUUID(),
      wallet_id: selectedWallet,
      category_id: "system-repayment",  // ← LITERAL, bukan FK!
      type: type === 'debt' ? 'expense' : 'income',
      amount: remainingAmount,
      date: Date.now(),
      notes: `Pelunasan ${type === 'debt' ? 'Hutang ke' : 'Piutang dari'} ${debt.person_name}`,
      sync_status: 'pending',
    });

    // 2. Update wallet balance
    const newBalance = type === 'debt'
      ? wallet.current_balance - remainingAmount
      : wallet.current_balance + remainingAmount;
    await db.wallets.update(selectedWallet, {
      current_balance: newBalance,
      updated_at: Date.now(),
    });

    // 3. Tandai lunas
    await db.debt_loans.update(debtId, {
      remaining_amount: 0,
      status: 'paid',
    });
  });
};
```

### Technical Debt: `category_id: "system-repayment"`

Mengapa literal string? Karena:
- Tabel `categories` hanya berisi kategori user-defined (income/expense)
- `category_id` di `Transaction` interface di-type `string`, bukan FK
- Pakai literal ID khusus = "transaksi sistem" yang tidak punya kategori user

⚠️ **Konsekuensi:**
- Kalau user buka `/transactions/history` dan klik transaksi repayment, `category.name` jadi `undefined` (di-render sebagai `"Lainnya"`)
- Icon jadi `HelpCircle` (fallback)
- Filter "By Category" tidak bisa group repayment terpisah

**Fix yang direncanakan** (lihat [Roadmap](../roadmap.md)):
- Opsi A: Tambah kolom `is_system: boolean` di `Category`, seed 2 system categories saat init
- Opsi B: Tambah `kind: 'user' | 'repayment' | 'transfer'` di `Transaction` — lebih eksplisit

## Tampilan List

Setiap item menampilkan:
- Badge atas: "Hutang Saya" (merah) atau "Piutang Orang" (hijau)
- Nama orang (font-semibold, text-lg)
- Sisa nominal (jika active)
- Tombol: **Bayar Lunas (Rp {remaining})** atau badge **LUNAS** (hijau)

## Empty State

- Icon `Users` dalam lingkaran
- "Belum ada catatan"
- "Catat hutang atau piutang Anda di sini"

## Limitasi & Planned Improvements

| Limitasi | Rencana |
|----------|---------|
| Hanya lunas total | Tambah cicilan parsial: input nominal parsial → `remaining_amount -= amount` |
| `category_id = "system-repayment"` literal | Pakai system category atau field `kind` |
| Tidak ada tanggal jatuh tempo | Tambah `due_date: number` |
| Tidak ada reminder/notifikasi | Integrasi Web Notifications API |
| Tidak ada history repayment (multiple payments) | Buat tabel `debt_payments` terpisah |
| Tidak ada delete/edit debt | Tambah UI |

## Lihat juga

- [Data Model](../data-model.md) — `DebtLoan` entity
- [Transactions](transactions.md) — atomic balance update pattern (dipakai di sini juga)
- [Roadmap](../roadmap.md) — planned improvements
