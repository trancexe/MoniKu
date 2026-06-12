# Google Drive Sync

MoniKu bisa backup & restore data ke Google Drive user (folder `appDataFolder` yang terisolasi). Fitur ini **opsional** dan **tidak pernah otomatis** — user harus verify sesi Google setiap kali backup/restore.

> **Architecture update (commit `caa646c`, 2026-06-12):** Migrasi dari implicit grant dengan token persisted ke **token-per-operation** pattern. Token tidak pernah masuk localStorage/sessionStorage/state manapun — hanya ada di local variable selama HTTP request (1-5 detik), lalu GC'd. Lihat [brief §2](../../audit-system/moniku-oauth-redesign-brief.md) untuk full design rationale.

## Komponen

| File | Peran |
|------|-------|
| `src/lib/gdrive.ts` | API calls ke Google Drive (upload, download) + `getFreshAccessToken()` helper |
| `src/lib/platform.ts` | `isIOSPWA()` + `are3rdPartyCookiesBlocked()` detection |
| `src/lib/sync-store.ts` | Persisted state: `lastSyncAt`, `userEmail` (no token) |
| `src/components/settings/SyncSettings.tsx` | UI backup/restore (no login button, no "Terhubung" status) |

## OAuth Flow

### Token per Operation (OAuth 2.0 Token Model)

MoniKu pakai **Google Identity Services (GIS) `initTokenClient`** langsung via `window.google.accounts.oauth2` — bukan library wrapper `@react-oauth/google`. Flow:

1. User click "Backup ke Drive"
2. App panggil `getFreshAccessToken(clientId)` → trigger Google popup
3. User pilih akun, klik "Izinkan" di consent screen
4. GIS kirim `access_token` via `postMessage` ke caller
5. App pakai token untuk upload (token di local variable `token`)
6. Function return → token eligible for GC

**Total token-in-memory window:** ~1-5 detik (durasi HTTP request saja).

```typescript
// gdrive.ts — getFreshAccessToken
const client = window.google.accounts.oauth2.initTokenClient({
  client_id: clientId,
  scope: "https://www.googleapis.com/auth/drive.appdata",
  callback: (response) => resolve(response.access_token),
  error_callback: (err) => reject(/* preserve err.type */),
});
client.requestAccessToken();
```

```typescript
// SyncSettings.tsx — handleDriveBackup (simplified)
const handleDriveBackup = async () => {
  if (operationInProgress.current) return;  // race guard
  operationInProgress.current = true;
  try {
    const token = await getFreshAccessToken(clientId);  // fresh, never persisted
    await uploadBackup(token);                            // token in scope only
    setLastSyncAt(Date.now());
  } catch (error) {
    handleGisError(error, "backup");
  } finally {
    operationInProgress.current = false;
  }
};
```

### Kenapa Token-per-Op, Bukan Persisted Token?

| Opsi | Trade-off |
|------|-----------|
| **A. Backend proxy** | Hilangkan status gratis ($0 → $5-7/bln), tambah maintenance server, defeat local-first |
| **B. Persisted token (lama)** | Token XSS-readable selamanya, masih implicit flow deprecated Google |
| **C. Hapus OAuth** | Kehilangan durabilitas data — IndexedDB bisa di-eviction iOS Safari tanpa warning |
| **D. Token per-op** ✅ | Hilangkan XSS exfil surface, tetap durabel, tetap gratis, tetap static. Trade-off: popup setiap backup (acceptable, malah selaras privacy-first) |

Lihat [brief §1.2](../../audit-system/moniku-oauth-redesign-brief.md) untuk analisis lengkap 4 opsi.

### Kenapa Direct GIS untuk OAuth, Bukan `@react-oauth/google` `useGoogleLogin`?

Mixed approach: pakai `<GoogleOAuthProvider>` dari `@react-oauth/google` untuk **GIS script loading**, tapi pakai GIS API langsung (`window.google.accounts.oauth2.initTokenClient`) untuk **OAuth flow** itu sendiri.

- `useGoogleLogin` hook (yang dibuang) pakai implicit grant dengan token di component state — pattern lama yang justru mau kita hindari
- GIS API langsung lebih tipis, lebih sedikit magic, dan support token model out of the box
- Trade-off: kita tulis Promise wrapper sendiri (~30 LOC), tapi full control atas error handling dan lifecycle

**Note:** `@react-oauth/google` **tetap dipakai** sebagai `<GoogleOAuthProvider>` di `src/app/layout.tsx:26` untuk load GIS script di-init otomatis saat page load. Hanya hook `useGoogleLogin` yang dihapus. Lihat [Roadmap](roadmap.md) untuk status deps.

### Scope: `drive.appdata`

Hanya akses ke `appDataFolder` (folder tersembunyi, terisolasi dari main Drive user). MoniKu **tidak bisa**:
- Lihat file user lain di Drive
- Lihat file user di main Drive folder
- Modify file apapun di luar `appDataFolder`

User bisa revoke akses kapan saja dari [Google Account Permissions](https://myaccount.google.com/permissions).

**Note tentang `appDataFolder`:** folder ini **tersembunyi dari UI Google Drive standar** — user tidak bisa lihat atau hapus file backup via web UI. Ini kenapa file naming strategy `fintrack_backup.json` (overwrite) dipakai, bukan versioned timestamp. Lihat [brief §11.3](../../audit-system/moniku-oauth-redesign-brief.md).

## Token Lifecycle

**Tidak ada token yang di-persist.** Lifecycle:

```
User click "Backup" → popup Google (1-3 detik user input)
                    → GIS callback: token di-resolve ke Promise
                    → await uploadBackup(token) (~1-2 detik)
                    → finally: variable out of scope, eligible for GC

Total: 1-5 detik. Zero persistence.
```

**Yang di-persist di `useSyncStore` (localStorage via Zustand `persist`):**
- `lastSyncAt: number | null` — timestamp backup terakhir (display only, no security risk)
- `userEmail: string | null` — email akun Google (PII tapi bukan secret/financial, fetch transient = pemborosan bandwidth)

**Yang TIDAK lagi di-persist:**
- ~~`googleToken`~~ (NEW-C1 RESOLVED in commit `caa646c`)
- ~~Token di component state (`useState`)~~

## Backup Flow

Trigger dari button "Backup ke Drive" di `/settings`.

```typescript
// SyncSettings.tsx — current implementation
const handleDriveBackup = async () => {
  if (operationInProgress.current) return;  // double-click guard
  operationInProgress.current = true;
  setIsLoading(true);
  
  try {
    const token = await getFreshAccessToken(clientId);
    await uploadBackup(token);
    setLastSyncAt(Date.now());
    
    // Non-blocking: fetch email untuk display di UI
    getUserEmail(token).then(email => {
      if (email) setUserEmail(email);
    }).catch(() => {});
    
    toast.success("Backup ke Google Drive selesai");
  } catch (error) {
    handleGisError(error, "backup");
  } finally {
    operationInProgress.current = false;
    setIsLoading(false);
  }
};
```

### `uploadBackup` (gdrive.ts)

1. Export semua tabel dari Dexie (via `exportAllData()`):
   ```typescript
   const data = {
     wallets: [...],
     categories: [...],
     transactions: [...],
     debt_loans: [...],
     exportDate: Date.now(),
     version: 1,
   };
   ```

2. Serialize ke JSON, buat Blob

3. Search existing file by name:
   ```
   GET https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='fintrack_backup.json'
   ```

4. Update existing atau create new (multipart upload):
   ```
   POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
   PATCH https://www.googleapis.com/upload/drive/v3/files/{fileId}?uploadType=media  // update
   Body (multipart): metadata { name, parents: ["appDataFolder"] } + file blob
   ```

5. Return Drive API response

### File Naming

Hardcoded: `fintrack_backup.json` (lihat `gdrive.ts:4`). Setiap backup **overwrite** file lama. Tidak ada versioning.

**Rationale:** `appDataFolder` hidden di UI Drive, jadi file versioned akan numpuk tanpa cara user hapus manual — quota Google Drive user (15GB free) bengkak silent. Overwrite menghindari whole class of problem. Lihat [brief §11.3](../../audit-system/moniku-oauth-redesign-brief.md).

## Restore Flow

Trigger dari button "Restore" → confirm dialog → eksekusi.

```typescript
// SyncSettings.tsx — current implementation
const executeDriveRestore = async () => {
  if (operationInProgress.current) return;
  operationInProgress.current = true;
  setIsRestoreDialogOpen(false);
  setIsLoading(true);
  
  try {
    const token = await getFreshAccessToken(clientId);
    await downloadBackup(token);
    setLastSyncAt(Date.now());
    toast.success("Restore dari Drive selesai, memuat ulang...");
    setTimeout(() => window.location.reload(), 1500);
  } catch (error) {
    handleGisError(error, "restore");
  } finally {
    operationInProgress.current = false;
    setIsLoading(false);
  }
};
```

### `downloadBackup` (gdrive.ts)

1. **Cari file** di `appDataFolder` (sama seperti upload)
2. **Download**: `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media`
3. **Restore ke Dexie** (di dalam `db.transaction('rw', ...)`)
4. Page reload untuk re-init live queries dengan data baru

## Error Handling

Semua error di-handle via `handleGisError()` helper:

| GIS Error Type | Trigger | UX Response |
|----------------|---------|-------------|
| `popup_closed` | User tekan X di popup | Toast info "Login dibatalkan" |
| `access_denied` | User tekan "Tolak" di consent | Toast error "Izin Google Drive ditolak" |
| `popup_failed_to_open` | Popup blocker aktif | Toast error "Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi." |
| Cookie error | 3rd-party cookie blocked | Toast error "Cookie pihak ketiga diblokir. Aktifkan di pengaturan browser." |
| `not loaded` | GIS script gagal load | Toast error "Google Identity Services gagal dimuat. Refresh halaman dan coba lagi." |
| Network error | Drive API unreachable | Toast error "Gagal backup/restore" + console log |

Lihat [brief §4](../../audit-system/moniku-oauth-redesign-brief.md) untuk full matrix.

## iOS PWA Limitation (Known Edge Case)

`getFreshAccessToken` pakai `window.open` + `postMessage` untuk mengembalikan token ke caller. Di iOS standalone PWA, Safari **sering gagal** mengirim postMessage kembali ke PWA context setelah OAuth popup dibuka. Multiple open WebKit issues sejak 2020 tentang PWA + popup/postMessage interop.

**Mitigation di `SyncSettings.tsx`:**
- `isIOSPWA()` detection di mount via `useEffect`
- Amber notice muncul di Cloud Backup section
- Tombol "Backup ke Drive" + "Restore" **disabled total** (bukan hidden) saat iOS PWA detected
- User lihat fiturnya ada, paham kenapa gak bisa dipake, dan cari workaround (buka di Safari biasa)

**Workaround untuk user:** buka MoniKu di Safari biasa (bukan dari Home Screen PWA). Fitur jalan normal di in-browser mode.

Lihat [brief §5](../../audit-system/moniku-oauth-redesign-brief.md) untuk testing guidance.

## ⚠️ Known Risk: Restore Tanpa Validasi

`downloadBackup` **TIDAK memvalidasi** struktur data sebelum di-restore. Risiko:
- Backup korup (sync interrupted, JSON truncated) → data hilang
- Backup lama yang tidak kompatibel dengan schema baru → data hilang / broken
- User edit manual di Drive → data di-restore = apa adanya

**Fix yang direncanakan** (lihat [Roadmap](roadmap.md)):
1. Validasi schema dengan zod sebelum clear
2. Backup data lokal dulu ke temporary store
3. Tampilkan diff preview
4. Atomic semantics: kalau restore gagal, lokal tetap utuh

## Security Notes

| Aspek | Status | Catatan |
|-------|--------|---------|
| Token in HTTPS only | ✅ | (kalau deploy dengan HTTPS) |
| Scope minimal | ✅ | `drive.appdata` saja |
| Token di memory, bukan localStorage | ✅ | **NEW**: tidak ada `googleToken` di store |
| Token persistence | ✅ **RESOLVED** | commit `caa646c` — NEW-C1 closed |
| Client ID publik | ✅ | by design (OAuth public client) |
| Backup file terisolasi dari main Drive | ✅ | (`appDataFolder`) |
| Data terenkripsi di Google | ✅ | (Google encryption at rest) |
| Token revocation API | ⚠️ | tidak perlu — tidak ada token persistent untuk di-revoke |
| Schema validation saat restore | ❌ | lihat di atas |
| Race condition guard (double-click) | ✅ | **NEW**: `useRef(operationInProgress)` |
| iOS PWA graceful fallback | ✅ | **NEW**: notice + disable tombol |
| 3rd party cookie detection | ✅ | **NEW**: warning di UI |
| CSP tanpa `unsafe-eval` | ✅ | **NEW**: tightened di commit `caa646c` |

## Lihat juga

- [Getting Started](getting-started.md) — setup Google Cloud OAuth
- [Data Model](data-model.md) — apa yang di-backup
- [Roadmap](roadmap.md) — fix restore validation, real-device test, cleanup unused deps
- [Testing](testing.md) — manual test matrix (DRAFT, real-device test belum jalan)
- [Brief §14](../../audit-system/moniku-oauth-redesign-brief.md) — implementation delta report
