# Google Drive Sync

MoniKu bisa backup & restore data ke Google Drive user (folder `appDataFolder` yang terisolasi). Fitur ini **opsional** dan **tidak pernah otomatis** — user harus login Google dulu.

## Komponen

| File | Peran |
|------|-------|
| `src/lib/gdrive.ts` | API calls ke Google Drive (upload, download) |
| `src/components/settings/SyncSettings.tsx` | UI login + backup/restore |

## OAuth Flow

### Implicit Grant (bukan PKCE)

MoniKu pakai `@react-oauth/google` v0.13.5 yang membungkus Google Identity Services (GIS). Flow yang dipakai adalah **implicit grant** — return `access_token` langsung di response:

```typescript
// SyncSettings.tsx:15-19
const login = useGoogleLogin({
  onSuccess: (codeResponse) => setToken(codeResponse.access_token),
  onError: (error) => console.log('Login Failed:', error),
  scope: "https://www.googleapis.com/auth/drive.appdata",
});
```

### Kenapa Implicit, Bukan Authorization Code + PKCE?

Static export = tidak ada server. Authorization code flow butuh server-side `code` → `token` exchange dengan `client_secret`. Tidak bisa karena:
- `client_secret` tidak boleh di-bundle (jadi publik)
- Tidak ada server untuk handle callback

Pilihan: implicit flow, atau pakai backend tipis khusus untuk OAuth proxy. Saat ini pakai implicit.

### ⚠️ Google Mulai Deprecate Implicit Flow

Google mengumumkan deprecation untuk beberapa flow OAuth. Untuk Google Drive API, implicit masih jalan tapi **tidak direkomendasikan** untuk app baru. Alternatif:
- **PKCE untuk public clients** — Google Identity Services juga support, tapi library `@react-oauth/google` mungkin belum wrap penuh
- **Server-side proxy** — backend tipis (Cloud Function / Vercel Function) khusus untuk token exchange. Tambah cost & complexity
- **Accept limitation** — implicit untuk personal-use app dengan trade-off jelas

Lihat [Roadmap](roadmap.md) untuk keputusan.

### Scope: `drive.appdata`

Hanya akses ke `appDataFolder` (folder tersembunyi, terisolasi dari main Drive user). MoniKu **tidak bisa**:
- Lihat file user lain di Drive
- Lihat file user di main Drive folder
- Modify file apapun di luar `appDataFolder`

User bisa revoke akses kapan saja dari [Google Account Permissions](https://myaccount.google.com/permissions).

## Token Storage

Token disimpan di `useState` component:

```typescript
const [token, setToken] = useState<string | null>(null);
```

Karakteristik:
- ✅ **Tidak di localStorage** — tidak persist across page refresh
- ✅ **Tidak di cookie** — tidak terkirim ke server
- ⚠️ **Hilang saat refresh** — user harus login ulang
- ⚠️ **Bisa diintrospect** dari React DevTools
- ❌ **Tidak ada logout flow** — tidak ada cara clear token selain refresh

Lihat [Roadmap](roadmap.md) untuk improvement.

## Backup Flow

Trigger dari button "Backup" di `/settings`.

```typescript
// SyncSettings.tsx:21-32
const handleBackup = async () => {
  if (!token) return toast.error("Silahkan login Google Drive terlebih dahulu");
  setIsLoading(true);
  try {
    await uploadBackup(token);
    toast.success("Backup selesai");
  } catch (error) {
    toast.error("Gagal backup data");
  } finally {
    setIsLoading(false);
  }
};
```

### `uploadBackup` (gdrive.ts:7-44)

1. Export semua tabel dari Dexie:
   ```typescript
   const data = {
     wallets: await db.wallets.toArray(),
     categories: await db.categories.toArray(),
     transactions: await db.transactions.toArray(),
     debt_loans: await db.debt_loans.toArray(),
     exportDate: Date.now(),
   };
   ```

2. Serialize ke JSON, buat Blob

3. Upload multipart ke Google Drive API:
   ```
   POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
   Headers: Authorization: Bearer <access_token>
   Body (multipart):
     - metadata: { name: "fintrack_backup.json", parents: ["appDataFolder"] }
     - file: <json blob>
   ```

4. Tidak cek response detail. Return whatever Google returns.

### File Naming
Hardcoded: `fintrack_backup.json` (lihat `gdrive.ts:4`). Setiap backup **overwrite** file lama. Tidak ada versioning.

## Restore Flow

Trigger dari button "Restore" → confirm dialog → eksekusi.

```typescript
// SyncSettings.tsx:34-46
const executeRestore = async () => {
  setIsRestoreDialogOpen(false);
  setIsLoading(true);
  try {
    await downloadBackup(token!);
    toast.success("Restore selesai, memuat ulang...");
    setTimeout(() => window.location.reload(), 1500);
  } catch (error) {
    toast.error("Gagal restore data (mungkin file tidak ditemukan");
  } finally {
    setIsLoading(false);
  }
};
```

### `downloadBackup` (gdrive.ts:46-86)

1. **Cari file** di `appDataFolder`:
   ```
   GET https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='fintrack_backup.json'
   ```

2. Ambil `fileId`, download:
   ```
   GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media
   ```

3. **Restore ke Dexie** (di dalam `db.transaction('rw', ...)`):
   ```typescript
   await db.wallets.clear();
   await db.categories.clear();
   await db.transactions.clear();
   await db.debt_loans.clear();

   if (backupData.wallets) await db.wallets.bulkAdd(backupData.wallets);
   if (backupData.categories) await db.categories.bulkAdd(backupData.categories);
   if (backupData.transactions) await db.transactions.bulkAdd(backupData.transactions);
   if (backupData.debt_loans) await db.debt_loans.bulkAdd(backupData.debt_loans);
   ```

4. Page reload untuk re-init live queries dengan data baru.

## ⚠️ Known Risk: Restore Tanpa Validasi

`downloadBackup` **TIDAK memvalidasi** struktur data sebelum di-restore:

```typescript
if (backupData.wallets) await db.wallets.bulkAdd(backupData.wallets);
```

`bulkAdd` akan throw jika ada field dengan tipe salah (mis. `current_balance: "string"`). Tapi:
- **Clear() jalan duluan** — kalau `bulkAdd` throw, data lokal sudah hilang, restore gagal sebagian, no rollback
- **Backup bisa dimanipulasi** — siapa pun dengan akses ke Google account user bisa edit JSON di Drive (via web UI atau API lain dengan scope lebih luas). Kalau di-upload dengan field tambahan, Dexie mungkin abaikan (Dexie ignore unknown fields) atau throw

**Risk:**
- Backup korup (sync interrupted, JSON truncated) → data hilang
- Backup lama yang tidak kompatibel dengan schema baru → data hilang / broken
- User edit manual di Drive → data di-restore = apa adanya

**Fix yang direncanakan** (lihat [Roadmap](roadmap.md)):
1. Validasi schema dengan zod sebelum clear
2. Backup data lokal dulu ke temporary store
3. Tampilkan diff preview
4. Atomic semantics: kalau restore gagal, lokal tetap utuh

## Security Notes

| Aspek | Status |
|-------|--------|
| Token in HTTPS only | ✅ (kalau deploy dengan HTTPS) |
| Scope minimal | ✅ `drive.appdata` saja |
| Token di memory, bukan localStorage | ✅ |
| Client ID publik | ✅ by design (OAuth public client) |
| Backup file terisolasi dari main Drive | ✅ (`appDataFolder`) |
| Data terenkripsi di Google | ✅ (Google encryption at rest) |
| Token revocation API | ❌ tidak dipanggil (lihat [Roadmap](roadmap.md)) |
| Schema validation saat restore | ❌ (lihat di atas) |

## Lihat juga

- [Getting Started](getting-started.md) — setup Google Cloud OAuth
- [Data Model](data-model.md) — apa yang di-backup
- [Roadmap](roadmap.md) — fix restore validation, PKCE migration, logout
