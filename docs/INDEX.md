# Wiki MoniKu

Wiki ini memecah detail teknis & fitur ke dalam file fokus. Mulai dari sini untuk navigasi.

## Untuk User / Kontributor Baru

| Dokumen | Untuk apa |
|---------|-----------|
| [Getting Started](getting-started.md) | Setup dev environment, konfigurasi OAuth, install PWA |
| [Architecture](architecture.md) | High-level design, data flow, kenapa pilih stack ini |
| [Data Model](data-model.md) | Schema Dexie, relasi entity, cara extend |
| [Conventions](conventions.md) | Naming, file organization, code style |

## Per Fitur
## Per Fitur
| Dokumen | Mencakup |
|---------|----------|
| [Features Overview](features/index.md) | Peta semua fitur & link ke detail |
| [Dashboard](features/dashboard.md) | `/` — total saldo, 5 transaksi terakhir, hide balance, wallet card selector, quick actions |
| [Transactions](features/transactions.md) | `/transactions`, `/transactions/history` — form, history, wallet filter, edit, delete, numpad |
| [Categories & Wallets](features/categories-wallets.md) | `/settings` → master data |
| [Debts](features/debts.md) | `/debts` — catatan hutang/piutang & repay |
| [Settings](features/settings.md) | `/settings` — theme, Google Drive sync |
| [Analytics](features/analytics.md) | `/analytics` — chart, laporan, recurring detection (Tier 1 implemented) |

## Topik Lintas
## Topik Lintas
| Dokumen | Mencakup |
|---------|----------|
| [Theming](theming.md) | next-themes, oklch tokens, light/dark |
| [PWA](pwa.md) | next-pwa, service worker, manifest, status |
| [Google Drive Sync](google-drive-sync.md) | OAuth implicit flow, backup format, security |
| [Deployment](deployment.md) | Static export, hosting, headers/CSP |
| [Roadmap](roadmap.md) | Known issues, planned & recently-shipped features |

## Konvensi Wiki

- **Markdown** — setiap file markdown, `kebab-case.md`
- **Cross-reference** — link internal pakai path relatif, section "Lihat juga" di akhir setiap file
- **Code reference** — `path/file.tsx:42` saat menunjukkan implementasi
- **Bahasa** — Indonesia untuk prosa, Inggris untuk istilah teknis/code identifier
- **Code block** — ` ```typescript `, ` ```bash `, ` ```json `, ` ```tsx `
- **Tabel** — untuk schema, command reference, konfigurasi

## Berkontribusi ke Wiki

1. Tambahkan atau ubah file di folder `docs/` (atau `docs/features/`)
2. Update `docs/INDEX.md` (file ini) jika menambah/mengubah file
3. Cross-reference: tambahkan section "Lihat juga" di file yang berelasi
4. Konsisten dengan konvensi di atas
5. Commit terpisah dari perubahan kode (opsional tapi direkomendasikan untuk git log bersih)
