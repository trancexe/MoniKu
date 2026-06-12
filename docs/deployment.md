# Deployment

MoniKu di-build sebagai static site (`output: "export"`) dan bisa di-deploy ke hampir semua static hosting. Output di folder `out/`.

## Build

```bash
npm run build
# → Next.js compiles + exports static HTML/JS/CSS ke ./out/
```

Output structure:
```
out/
├── index.html
├── transactions/
│   ├── index.html
│   └── history/index.html
├── analytics/index.html
├── debts/index.html
├── settings/index.html
├── _next/static/chunks/*.js   # hashed JS
├── _next/static/media/*.woff2 # fonts
├── sw.js                       # service worker (juga di public/)
├── workbox-*.js                # Workbox runtime
├── manifest.json
├── icon-192x192.png
├── icon-512x512.png
└── *.svg                       # favicon, next, vercel
```

⚠️ **Catatan:** saat ini build TypeScript **gagal** di `src/components/debts/DebtList.tsx:80`. Fix dulu sebelum deploy. Lihat [Roadmap](roadmap.md).

## Hosting Options

### Vercel (recommended)
- ✅ Zero config untuk Next.js
- ✅ HTTPS otomatis
- ✅ Preview deployment per branch
- ✅ Custom domain gratis
- ⚠️ Vendor lock-in (low — bisa migrate kapan saja karena static)

Deploy:
```bash
npm i -g vercel
vercel
# atau push ke GitHub + import di Vercel dashboard
```

### Netlify
- ✅ Drag-and-drop folder `out/` ke dashboard
- ✅ Continuous deployment dari Git
- ✅ HTTPS otomatis
- ✅ Form handling, functions (kalau perlu)

Deploy `netlify.toml` di root:
```toml
[build]
  command = "npm run build"
  publish = "out"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Cloudflare Pages
- ✅ Free tier generous
- ✅ Global CDN (tercepat)
- ✅ HTTPS otomatis
- ✅ Custom domain + workers
- ⚠️ Setup butuh wrangler atau Git integration

### GitHub Pages
- ✅ Gratis untuk public repo
- ✅ Actions untuk build otomatis
- ⚠️ Tidak support custom SPA routing tanpa setup
- ⚠️ HTTPS available tapi custom domain perlu CNAME

⚠️ **Catatan penting untuk GitHub Pages:** path akan jadi `https://user.github.io/moniku/`, bukan root. Butuh `basePath` di next.config. Atau pakai custom domain dengan apex.

### Self-hosted (Nginx / Caddy / Apache)
Pakai salah satu web server. Contoh Nginx:
```nginx
server {
  listen 443 ssl http2;
  server_name moniku.example.com;
  
  root /var/www/moniku/out;
  index index.html;
  
  # SPA fallback (seharusnya tidak perlu karena static export pakai path-based)
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  # Cache static assets
  location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  
  # Security headers
  add_header X-Frame-Options "DENY";
  add_header X-Content-Type-Options "nosniff";
  add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

## Environment Variables

⚠️ **Static export = semua `NEXT_PUBLIC_*` env vars di-bundle ke client.** Tidak ada env var yang benar-benar "rahasia".

| Variable | Saat dipakai | Aman di-bundle? |
|----------|--------------|-----------------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Runtime (OAuth) | ✅ OAuth public client by design |
| Lainnya (jika ada) | - | Hanya yang memang publik |

**Jangan pernah** pakai env var untuk API key/secret di static site.

## Required Headers

Disarankan di-set di level hosting/web server:

```nginx
# Security
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://www.googleapis.com https://accounts.google.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()

# PWA / Caching
Service-Worker-Allowed: /
Cache-Control: public, max-age=0, must-revalidate  # untuk HTML
Cache-Control: public, max-age=31536000, immutable  # untuk /_next/static/*
```

### CSP Breakdown untuk MoniKu

| Directive | Value | Alasan |
|-----------|-------|--------|
| `default-src` | `'self'` | Default deny |
| `script-src` | `'self' 'unsafe-inline'` | Next.js inline script untuk hydration |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind v4 + shadcn CSS-in-JS |
| `img-src` | `'self' data:` | Icon + inline asset |
| `connect-src` | `'self' https://www.googleapis.com https://accounts.google.com` | Drive API + OAuth |
| `font-src` | `'self' data:` | Plus Jakarta Sans + Lucide font (jika dipakai) |
| `frame-ancestors` | `'none'` | Anti-clickjacking |
| `base-uri` | `'self'` | Anti-base-tag injection |

⚠️ **CSP belum diimplementasi** di repo (lihat [Roadmap](roadmap.md)). Setup di hosting untuk sekarang.

## Custom Domain

Setiap host punya flow sendiri. Ringkas:

1. Beli domain (Cloudflare Registrar, Namecheap, dll)
2. Set DNS:
   - Apex (`moniku.com`): A record ke IP host, atau ALIAS/ANAME
   - Subdomain (`app.moniku.com`): CNAME ke target host
3. Enable HTTPS di dashboard host (biasanya otomatis dengan Let's Encrypt)
4. Set HSTS header (opsional tapi disarankan):
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   ```

## Pre-Deploy Checklist

- [ ] Build sukses (`npm run build` tanpa error)
- [ ] Tidak ada ESLint error (`npm run lint`)
- [ ] `.env.local` dengan `NEXT_PUBLIC_GOOGLE_CLIENT_ID` yang valid
- [ ] Authorized JavaScript origins di Google Cloud Console sudah termasuk domain produksi
- [ ] Headers (CSP, X-Frame-Options, dll) sudah diset di hosting config
- [ ] HTTPS aktif (wajib untuk PWA + service worker)
- [ ] Test PWA install di mobile (Chrome Android & Safari iOS)
- [ ] Test OAuth flow end-to-end
- [ ] Lighthouse audit (PWA, Performance, Accessibility, Best Practices, SEO)

## Post-Deploy Verification

```bash
# Cek security headers
curl -I https://moniku.example.com

# Cek manifest
curl https://moniku.example.com/manifest.json

# Cek service worker terdaftar (di DevTools → Application → Service Workers)
# Cek Lighthouse score (DevTools → Lighthouse)
```

## Lihat juga

- [Architecture](architecture.md) — static export trade-offs
- [PWA](pwa.md) — service worker, install
- [Google Drive Sync](google-drive-sync.md) — OAuth setup
- [Roadmap](roadmap.md) — security headers, fix build
