# PWA (Progressive Web App)

MoniKu adalah PWA — bisa di-install ke home-screen, berjalan standalone, dan (idealnya) offline.

## Setup

### next-pwa Configuration

Di `next.config.ts`:

```typescript
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",          // output sw.js ke folder public
  disable: process.env.NODE_ENV === "development",  // PWA off di dev
});

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
};

export default withPWA(nextConfig);
```

### Build Output

`npm run build` menghasilkan:
- `public/sw.js` — service worker (Workbox runtime)
- `public/workbox-*.js` — Workbox library (cached, hashed)
- `out/` — static site (tetap, service worker di-host dari `public/`)

Service worker mendaftarkan pre-cache untuk semua static asset (chunks JS, CSS, fonts) sehingga app shell bisa jalan offline.

### Manifest

`public/manifest.json`:

```json
{
  "name": "MoniKu",
  "short_name": "MoniKu",
  "description": "Local-first personal finance application",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Di-refer dari `src/app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: "MoniKu",
  description: "Local-first personal finance application",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // ...
};
```

### Icons
Hanya 2 size (192, 512). Untuk PWA install yang proper, idealnya ada:
- 192x192, 512x512 (wajib)
- 180x180 (Apple touch icon — iOS tidak pakai manifest)
- maskable 512x512 (Android adaptive icon)

Lihat [Roadmap](roadmap.md) untuk improvement.

## ⚠️ Status: Service Worker Dinonaktifkan

`src/components/providers/AppInit.tsx:11-17`:

```typescript
// Kill any rogue service workers that might be causing infinite reload loops
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    for (const reg of regs) {
      reg.unregister();
    }
  });
}
```

Ini **workaround**, bukan fix. Setiap kali app dibuka:
1. Service worker di-register (dari `public/sw.js`)
2. `AppInit` unregister semuanya
3. Tidak ada caching → app tidak jalan offline
4. Install PWA tetap bisa, tapi runtime-nya online-only

### Kenapa Dilakukan?

Catatan commit terkait (lihat `git log`):

```
09159c1 feat: implement theme support with new providers and UI components,
              and disable service worker to resolve loop issues
```

Ada bug "infinite reload loop" yang dicurigai berasal dari service worker. Alih-alih fix root cause, SW di-disable. Konsekuensi: PWA jadi setengah jadi.

### Hipotesis Root Cause

Kemungkinan besar:
1. **Aggressive caching of HTML** — SW cache `out/index.html`. Saat deploy versi baru, user masih dapat HTML lama → load chunk yang sudah di-hapus dari pre-cache → error → SW re-fetch → loop
2. **skipWaiting + clientsClaim** — Workbox default pakai aggressive update. Bisa trigger reload loop kalau versi baru SW langsung ambil alih
3. **Stale precache manifest** — `sw.js` punya list pre-cache URL dengan revision hash. Kalau ada mismatch antara build baru dan sw lama

### Fix Plan (lihat [Roadmap](roadmap.md))

1. **Versioned SW dengan cleanup logic**:
   - Tambah `CACHE_NAME` versi di SW
   - Di `activate` event: hapus cache lama
2. **Network-first untuk navigasi, cache-first untuk asset**:
   - HTML, JSON → coba network dulu, fallback cache
   - JS, CSS, font → cache-first (immutable)
3. **Disable skipWaiting** atau pakai user-prompt untuk update
4. **Test** dengan Lighthouse + DevTools Application panel

Setelah fix, `AppInit` boleh di-strip dari SW unregister code.

## Install Experience

PWA install button muncul otomatis di address bar Chrome/Edge saat manifest + SW valid.

**Catatan iOS Safari:** tidak support service worker dengan baik, manifest parsing terbatas. Install tetap bisa via "Add to Home Screen" manual.

**Catatan HTTPS:** PWA + Service Worker butuh HTTPS (atau `localhost` untuk dev). Deploy ke static host biasa sudah otomatis HTTPS.

## Lihat juga

- [Deployment](deployment.md) — HTTPS requirement untuk PWA
- [Architecture](architecture.md) — kenapa static export
- [Roadmap](roadmap.md) — fix PWA offline mode
- [Google Drive Sync](google-drive-sync.md) — backup alternatif kalau offline
