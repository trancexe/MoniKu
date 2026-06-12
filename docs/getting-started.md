# Getting Started

Panduan untuk menjalankan MoniKu secara lokal dan menyiapkan fitur Google Drive sync.

## Prasyarat

| Tool | Versi Minimum | Catatan |
|------|---------------|---------|
| Node.js | 20.x | LTS recommended (22.x). Next.js 16 mungkin butuh 20.18+ |
| npm | 10.x | Atau pnpm/yarn/bun — semua supported |
| Browser | Modern evergreen | Chrome 120+, Firefox 120+, Safari 17+. Diperlukan IndexedDB + SubtleCrypto + WebAuthn (opsional) |

Pastikan juga:
- `git` terinstal (untuk clone & version control)
- Akses internet (untuk install dependency & opsional Google APIs)

## Setup Lokal

```bash
# 1. Clone
git clone <repo-url> MoniKu
cd MoniKu

# 2. Install dependencies
npm install

# 3. (Opsional) Salin env example
cp .env.example .env.local
# lalu edit NEXT_PUBLIC_GOOGLE_CLIENT_ID

# 4. Jalankan dev server
npm run dev
# → http://localhost:3000
```

Pada first run:
- AppInit akan seed database dengan 6 kategori default (Gaji, Bonus, Makan, Transport, Belanja, Tagihan) dan 1 dompet (Dompet Tunai, saldo 0)
- Data tersimpan di IndexedDB per browser. Clear browser data = reset total

## Scripts

| Perintah | Deskripsi |
|----------|-----------|
| `npm run dev` | Dev server dengan HMR. PWA dinonaktifkan (lihat `next.config.ts`) |
| `npm run build` | Build produksi → static export di folder `out/` |
| `npm run start` | Serve `out/` lokal (setelah `build`) |
| `npm run lint` | ESLint check |

## Environment Variables

| Variable | Wajib? | Default | Lokasi Pakai |
|----------|--------|---------|--------------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Tidak (app tetap jalan tanpa sync) | `"dummy-client-id"` di `src/app/layout.tsx:35` | GoogleOAuthProvider di layout |

**Catatan keamanan:** default fallback `"dummy-client-id"` menyebabkan OAuth silent fail. Untuk produksi, **wajib** set env var dan hilangkan fallback. Lihat [Google Drive Sync](google-drive-sync.md).

## Setup Google OAuth (untuk fitur Cloud Backup)

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru (atau pilih existing)
3. **APIs & Services** → **Library** → cari "Google Drive API" → **Enable**
4. **APIs & Services** → **OAuth consent screen**:
   - User type: **External** (atau Internal untuk workspace)
   - App name: "MoniKu" (atau apapun)
   - Scopes: tambah `https://www.googleapis.com/auth/drive.appdata`
   - Test users: tambahkan email kamu saat masa testing
5. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - Name: "MoniKu Web"
   - **Authorized JavaScript origins**: tambahkan domain kamu (mis. `http://localhost:3000` untuk dev, `https://moniku.example.com` untuk prod)
6. Copy **Client ID** → set sebagai `NEXT_PUBLIC_GOOGLE_CLIENT_ID` di `.env.local`
7. Restart `npm run dev`

## First Run di Browser

1. Buka `http://localhost:3000`
2. Splash loading singkat (seed database)
3. Muncul Dashboard dengan total saldo 0 dan empty state "Belum ada transaksi"
4. Buka `/transactions` untuk catat transaksi pertama
5. (Opsional) Buka `/settings` → "Login dengan Google" untuk setup backup

## Install sebagai PWA

### Android (Chrome / Edge)
1. Buka app di Chrome
2. Tap menu (⋮) → **Install app** / **Add to Home screen**
3. Konfirmasi → icon muncul di launcher

### iOS (Safari)
1. Buka app di Safari
2. Tap tombol **Share** (kotak dengan panah ke atas)
3. Scroll → **Add to Home Screen**
4. Konfirmasi

### Desktop (Chrome / Edge)
1. Klik ikon **Install** (⊕) di address bar
2. Konfirmasi

⚠️ **Status PWA saat ini:** service worker di-unregister di `AppInit.tsx` untuk workaround infinite reload loop. Akibatnya, install PWA jalan tapi offline mode belum fungsional. Fix ada di [Roadmap](roadmap.md). Untuk kontribusi, lihat [PWA](pwa.md).

## Inspeksi Data (DevTools)

Data tersimpan di IndexedDB. Untuk inspeksi:

1. Buka DevTools → **Application** tab
2. Sidebar → **Storage** → **IndexedDB** → `FinTrackDB`
3. Buka tabel `wallets`, `categories`, `transactions`, `debt_loans`

Schema lengkap: [Data Model](data-model.md).

## Reset Data

Kalau mau bersih-bersih:

- **Browser level**: DevTools → Application → Storage → **Clear site data**
- **App level**: belum ada UI reset/export. Bisa manual hapus via DevTools atau tulis SQL-like di console:
  ```js
  indexedDB.deleteDatabase("FinTrackDB")
  // lalu refresh
  ```

## Lihat juga

- [Architecture](architecture.md) — kenapa desain seperti ini
- [Data Model](data-model.md) — schema detail
- [Google Drive Sync](google-drive-sync.md) — detail OAuth flow
- [PWA](pwa.md) — service worker, manifest, install
