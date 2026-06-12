# Kategori & Dompet (Master Data)

Master data diakses dari halaman `/settings` → section "Dompet" dan "Kategori". User bisa menambah (create) dan melihat (read), tapi **saat ini belum bisa edit/hapus** dari UI.

## Komponen

| File | Peran |
|------|-------|
| `src/components/master-data/CategoryList.tsx` | List kategori (Pemasukan + Pengeluaran) |
| `src/components/master-data/CategoryForm.tsx` | Form tambah kategori (dengan icon picker) |
| `src/components/master-data/WalletList.tsx` | List dompet |
| `src/components/master-data/WalletForm.tsx` | Form tambah dompet (dengan icon picker) |

## Kategori

### Tampilan
Dipisah 2 section: "Pengeluaran" dan "Pemasukan". Masing-masing grid 2-3 kolom kartu, tiap kartu berisi icon + nama.

### Form Tambah
1. Pilih **Tipe** (Pengeluaran / Pemasukan) — `Select` dari base-ui
2. Isi **Nama Kategori** (wajib, mis. "Makan", "Gaji")
3. Pilih **Ikon** dari grid picker (filtered by type)

#### Icon Picker
Grid 5 kolom, `max-h-[200px] overflow-y-auto`. Pilihan icon berbeda per tipe:

**Expense icons** (35 pilihan): Coffee, ShoppingCart, Utensils, Car, Home, HeartPulse, Plane, Gift, Smartphone, Monitor, Bus, Train, Fuel, Zap, Droplet, Wifi, Tv, Music, Film, Book, GraduationCap, Baby, Dog, Cat, Pill, Stethoscope, Dumbbell, Scissors, Shirt, Smile, Gamepad2, Ticket, Wrench, Hammer

**Income icons** (17 pilihan): Briefcase, TrendingUp, Award, Gift, Banknote, Building, Wallet, LineChart, PieChart, Landmark, Coins, DollarSign, HandCoins, PiggyBank, BadgeDollar, Gem, Bitcoin

#### Simpan
```typescript
// CategoryForm.tsx:37-42
await db.categories.add({
  id: crypto.randomUUID(),
  name,
  type,
  icon,
});
```

Saat `type` diubah, `icon` di-reset ke default tipe baru (`"Coffee"` untuk expense, `"Briefcase"` untuk income).

### Seed Default
`src/lib/seed.ts` menambahkan 6 kategori + 1 dompet default saat `AppInit` jalan kalau tabel kosong:
- Gaji (income, Briefcase)
- Bonus (income, Gift)
- Makan (expense, Utensils)
- Transport (expense, Car)
- Belanja (expense, ShoppingCart)
- Tagihan (expense, FileText)
- Dompet Tunai (Wallet, saldo 0)

## Dompet

### Tampilan
List vertikal kartu, tiap kartu berisi icon (warna primary) + nama + saldo (format `tabular-nums`).

### Empty State
"Belum ada dompet." (text-only, tanpa card visual)

### Form Tambah
1. Isi **Nama Dompet** (mis. "BCA", "GoPay")
2. Isi **Saldo Awal** (integer)
3. Pilih **Ikon** dari 19 pilihan: Wallet, CreditCard, Banknote, PiggyBank, Coins, Landmark, Bitcoin, Smartphone, Briefcase, Gem, Building, Receipt, Ticket, DollarSign, Euro, PoundSterling, JapaneseYen, WalletCards, Nfc

#### Simpan
```typescript
// WalletForm.tsx:29-35
await db.wallets.add({
  id: crypto.randomUUID(),
  name,
  icon,
  current_balance: Number(balance),
  updated_at: Date.now(),
});
```

⚠️ `Number(balance)` tanpa validasi. Bisa simpan saldo negatif atau NaN. Lihat [Roadmap](../roadmap.md).

## Limitasi Saat Ini

| Aksi | Status |
|------|--------|
| Create kategori | ✅ |
| Create dompet | ✅ |
| Read (list) | ✅ |
| Update | ❌ Tidak ada UI |
| Delete | ❌ Tidak ada UI |
| Reorder / drag | ❌ |

⚠️ **Konsekuensi:** kalau user salah tambah, tidak bisa koreksi via UI. Harus manual hapus via DevTools → IndexedDB, atau restore dari backup (kalau ada). Lihat [Roadmap](../roadmap.md) untuk rencana edit/delete UI.

## Konstanta Icon

Daftar icon di-hardcode sebagai `const` di file masing-masing. Pattern import:

```typescript
import * as Icons from "lucide-react";

// Lookup dengan fallback
const Icon = (Icons[c.icon as keyof typeof Icons] || Icons.HelpCircle) as any;
```

⚠️ Casting `as any` menyebabkan 5 ESLint errors. Fix yang direncanakan: typed lookup dengan exhaustive switch atau generic constraint. Lihat [Roadmap](../roadmap.md).

## Lihat juga

- [Data Model](../data-model.md) — `Category`, `Wallet` entities
- [Settings](settings.md) — section master data di halaman Pengaturan
- [Transactions](transactions.md) — penggunaan kategori & dompet
- [Roadmap](../roadmap.md) — planned edit/delete
