# Pengaturan

Halaman `/settings` dengan 4 section: Tampilan, Cloud Backup, Dompet, Kategori.

## Komponen

| File | Peran |
|------|-------|
| `src/app/settings/page.tsx` | Page composition |
| `src/components/settings/ThemeSettings.tsx` | Section Tampilan (light/dark/system) |
| `src/components/settings/SyncSettings.tsx` | Section Cloud Backup (Google Drive) |
| `src/components/master-data/WalletList.tsx` | Section Dompet |
| `src/components/master-data/CategoryList.tsx` | Section Kategori |

## Layout

```
┌─────────────────────────────────┐
│ Pengaturan                      │  ← H1
│ Kelola aplikasi dan master data │  ← subtitle
├─────────────────────────────────┤
│ Tampilan                        │  ← ThemeSettings
│ [Dark mode switch]              │
│ [Follow system switch]          │
├─────────────────────────────────┤
│ Cloud Backup (Google Drive)     │  ← SyncSettings
│ [Login button]                  │
├─────────────────────────────────┤
│ Dompet               [+ Tambah] │  ← WalletList
│ [Card 1]                        │
│ [Card 2]                        │
├─────────────────────────────────┤
│ Kategori             [+ Tambah] │  ← CategoryList
│ Pengeluaran: ...                │
│ Pemasukan: ...                  │
└─────────────────────────────────┘
```

Section dipisah dengan `<div className="border-t pt-8">` (horizontal rule + padding).

## Tampilan (Theme)

`ThemeSettings.tsx` — pakai `useTheme` dari `next-themes`:

### State Mounting
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);
if (!mounted) return null;
```

⚠️ **ESLint warning:** `react-hooks/set-state-in-effect` di sini. Pattern ini umum untuk hindari hydration mismatch (next-themes render di client). Alternatif: pakai `useSyncExternalStore` atau CSS-only hide. Lihat [Roadmap](../roadmap.md).

### Dua Switch Independen
- **Mode Gelap (Dark Mode)**: `checked = theme === "dark"`, onChange set `"dark"` / `"light"`
- **Ikuti Sistem**: `checked = theme === "system"`, onChange set `"system"` / `"light"`

⚠️ **Catatan UX:** dua switch ini bisa bentrok — kalau user set dark + follow system = true, logikanya jadi "system wins"? Belum jelas prioritasnya. Lihat [Roadmap](../roadmap.md).

## Cloud Backup (Google Drive)

`SyncSettings.tsx` — detail lengkap di [Google Drive Sync](../google-drive-sync.md).

### UI Flow
- **Belum login**: tampil button "Login dengan Google" (full-width)
- **Sudah login**: tampil status "✓ Terhubung dengan Google Drive" + 2 button Backup/Restore (side-by-side)
- **Restore**: butuh konfirmasi dialog ("Data lokal akan ditimpa")

### Implementasi
Pakai `useGoogleLogin` hook dari `@react-oauth/google` dengan scope `https://www.googleapis.com/auth/drive.appdata`. Token disimpan di `useState` component (tidak ada logout flow). Detail & risk: [Google Drive Sync](../google-drive-sync.md).

## Dompet & Kategori

Lihat [Categories & Wallets](categories-wallets.md) untuk detail. Di `/settings`, section ini di-render langsung sebagai component (bukan nested route).

## Pola Form (Dialog)

Baik `WalletForm` maupun `CategoryForm` pakai pola yang sama:

```typescript
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger render={<Button>+ Tambah</Button>} />
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Tambah ...</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      {/* fields */}
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
        <Button type="submit">Simpan</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

`Dialog` di-wrap dari `@base-ui/react/dialog` (bukan Radix). Ada close button X di pojok kanan-atas dengan `<span className="sr-only">Close</span>` (a11y OK).

## Lihat juga

- [Theme (detail tokens)](../theming.md) — color system
- [Google Drive Sync](../google-drive-sync.md) — OAuth, backup format
- [Categories & Wallets](categories-wallets.md) — master data
- [Roadmap](../roadmap.md) — known issues
