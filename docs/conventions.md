# Code Conventions

Standar dan pola yang dipakai di codebase MoniKu. Untuk user baru: baca ini sebelum kontribusi.

## Bahasa

| Lokasi | Bahasa |
|--------|--------|
| Kode (variabel, function, class) | Inggris |
| Komentar kode | Inggris |
| Commit messages | Inggris (kalau ada preference lain, sesuaikan) |
| UI strings (button, label, toast) | **Indonesia** |
| Markdown documentation | Indonesia untuk prosa, Inggris untuk istilah teknis |
| Branch/PR names | Inggris (`feat/...`, `fix/...`, `chore/...`) |

## File Naming

| Jenis | Format | Contoh |
|-------|--------|--------|
| Komponen | `PascalCase.tsx` | `TransactionForm.tsx`, `CustomNumpad.tsx` |
| Hook | `camelCase.ts` (prefiks `use`) | `useDebounce.ts` |
| Utility/library | `camelCase.ts` | `utils.ts`, `db.ts`, `gdrive.ts` |
| Type definition | inline atau di `types.ts` per-fitur | (belum dipisah, lihat [Roadmap](roadmap.md)) |
| Page (App Router) | `page.tsx` | `src/app/transactions/page.tsx` |
| Layout | `layout.tsx` | `src/app/layout.tsx` |
| Markdown docs | `kebab-case.md` | `data-model.md`, `google-drive-sync.md` |

## Folder Organization

By feature, bukan by type:

```
src/components/
├── ui/                # shadcn primitives — shared
├── providers/         # cross-cutting (theme, init)
├── transactions/      # SEMUA milik fitur Transaksi
├── master-data/       # SEMUA milik fitur Master Data
└── ...
```

Tambah fitur baru? Buat folder `src/components/<feature>/` + file `page.tsx` di `src/app/<route>/`.

## Komponen

### Server vs Client

Default: **Server Component**. Tambahkan `"use client"` di paling atas kalau butuh:
- `useState`, `useEffect`, `useReducer`
- `useLiveQuery` (Dexie hooks)
- Event handlers (`onClick`, `onChange`)
- Browser-only API (`window`, `localStorage`)

Contoh:
```typescript
// Server component (default)
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
export default function Home() {
  return <DashboardOverview />;
}

// Client component
"use client";
import { useState } from "react";
export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Struktur File

```typescript
// 1. "use client" directive (kalau perlu)
// 2. Imports
import { useState } from "react";
import { db } from "@/lib/db";

// 3. Types & interfaces (kalau ada, inline)
// (lebih baik di file types.ts terpisah untuk reuse)

// 4. Sub-components (private, prefix tidak perlu)
// function SubComponent() { ... }

// 5. Skeleton components (untuk loading state)
// function Skeleton() { ... }

// 6. Main exported component
export function MainComponent() {
  // 6a. State (useState)
  // 6b. Derived state (useMemo) — JANGAN pakai untuk derive murah
  // 6c. Effects (useEffect) — HINDARI kalau bisa
  // 6d. Live queries (useLiveQuery)
  // 6e. Event handlers
  // 6f. Loading branch (if !data return <Skeleton />)
  // 6g. Main render
}

// 7. Helper functions (di akhir atau di extract ke utils)
```

## State Management

**Prefer Dexie sebagai single source of truth.** Pakai `useLiveQuery` untuk data yang auto-update:

```typescript
const wallets = useLiveQuery(() => db.wallets.toArray());
if (!wallets) return <Skeleton />;
```

**Local state** untuk UI-only (form input, modal open, tab aktif).

**Jangan** pakai `useState` untuk data yang bisa di-query dari DB.

**Dependencies yang terpasang tapi belum dipakai:**
- `zustand` — di-declare di package.json tapi tidak ada usage. Akan dicabut kalau tidak dipakai. Lihat [Roadmap](roadmap.md).
- `fflate` — sama, untuk kompresi. Mungkin berguna untuk backup format di masa depan.

## TypeScript

### Strict Mode
`tsconfig.json` set `strict: true`. Jangan disable per-file.

### Hindari `any`
5 violations ada di:
- `CategoryForm.tsx:62,80` — icon lookup casting
- `CategoryList.tsx:36` — icon lookup casting
- `WalletForm.tsx:63` — icon lookup casting
- `WalletList.tsx:36` — icon lookup casting
- `TransactionForm.tsx:125,145` — icon lookup casting

Pattern yang sama:
```typescript
const Icon = (Icons[c.icon as keyof typeof Icons] || Icons.HelpCircle) as any;
```

Fix yang direncanakan: typed helper function atau exhaustive switch. Lihat [Roadmap](roadmap.md).

### Naming
- `interface` untuk data shape; `type` untuk union/utility
- PascalCase untuk type, camelCase untuk instance
- Generic: `T`, `K`, `V` (single letter) atau `TItem`, `TKey` (descriptive)

## Styling

### Tailwind v4
Utility-first, no CSS modules atau styled-components.

**Selalu pakai semantic token**, bukan raw color:
```tsx
// ✅ Good
<div className="bg-card text-card-foreground border-border">

// ❌ Avoid (tidak dark-mode aware)
<div className="bg-white text-zinc-900 border-zinc-200">
```

**Gunakan `cn()` untuk conditional classes:**
```typescript
import { cn } from "@/lib/utils";

<button className={cn(
  "rounded-full py-2.5 text-xs font-medium transition-all",
  isActive
    ? "bg-white shadow text-red-600 dark:bg-zinc-800 dark:text-red-400"
    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
)}>
```

### Custom Variants dengan CVA
Untuk komponen dengan banyak variant, pakai `class-variance-authority` (cva):

```typescript
const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "...",
      outline: "...",
      destructive: "...",
    },
    size: {
      default: "...",
      sm: "...",
      lg: "...",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});
```

Lihat `src/components/ui/button.tsx` untuk contoh penuh.

## shadcn/ui Patterns

- Pakai CLI: `npx shadcn add <component>` (kalau ada update)
- Hasil generate **commit-able** — bukan dependency
- Style `base-nova` di `components.json` (lihat [Architecture](architecture.md))
- Primitives dari `@base-ui/react`, **bukan** `@radix-ui/*`

## Import Order

Konvensi ESLint `eslint-config-next` (lihat `eslint.config.mjs`):

1. External packages
2. Internal absolute (`@/...`)
3. Relative (`./...`)
4. Type imports (kalau bisa, pakai `import type`)

```typescript
// ✅ Good
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomNumpad } from "./CustomNumpad";
import type { Transaction } from "@/lib/db";
```

## Error Handling

Pola umum untuk DB operation:

```typescript
try {
  await db.transactions.add({ ... });
  toast.success("Tersimpan");
} catch (error) {
  console.error(error);  // ⚠️ log ke console
  toast.error("Gagal menyimpan");  // user-friendly message
}
```

⚠️ `console.error` bisa bocor info di production. Untuk perbaikan, pakai logger terpusat. Lihat [Roadmap](roadmap.md).

## Testing

**Belum ada test.** Idealnya:
- Unit test untuk business logic (atomic balance update, edit reverse-apply)
- Integration test untuk form flow
- E2E test untuk critical path (create transaction, backup, restore)

Tooling yang mungkin: Vitest + Testing Library, atau Playwright untuk E2E. Lihat [Roadmap](roadmap.md).

## Lihat juga

- [Architecture](architecture.md) — design decisions
- [Data Model](data-model.md) — types
- [Roadmap](roadmap.md) — known issues & planned improvements
