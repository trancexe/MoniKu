# Theming

Sistem tema MoniKu: light / dark / system, color tokens dengan oklch, integrasi next-themes + Tailwind v4.

## next-themes Setup

Dipasang di root layout (`src/app/layout.tsx:44-49`):

```tsx
<ThemeProvider
  attribute="class"          // tambah 'class="dark"' di <html> saat dark
  defaultTheme="system"      // default = ikut OS
  enableSystem               // support 'system' value
  disableTransitionOnChange  // cegah flash saat toggle
>
```

`ThemeProvider` di-wrap di `src/components/providers/ThemeProvider.tsx` (thin re-export dari `next-themes`).

### Pattern "Mounted" di Client Component

next-themes render di client, sehingga baca `useTheme()` di SSR akan return `undefined`. Untuk hindari hydration mismatch, gunakan pola "tunda render sampai mounted":

```typescript
// ThemeSettings.tsx
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);
if (!mounted) return null;
```

⚠️ **ESLint warning:** `react-hooks/set-state-in-effect`. Pola ini umum tapi bukan best practice React 19. Alternatif: `useSyncExternalStore`. Lihat [Roadmap](roadmap.md).

### suppressHydrationWarning

Di `<html>` di layout:
```tsx
<html lang="en" className={plusJakartaSans.variable} suppressHydrationWarning>
```

Mencegah warning saat next-themes modifikasi `class` di `<html>` antara SSR dan client hydration.

## Color Tokens

Dideklarasikan di `src/app/globals.css` pakai format **oklch** (better color space untuk perceptual uniformity):

### Light Theme
```css
:root {
  --background: oklch(1 0 0);                 /* pure white */
  --foreground: oklch(0.141 0.005 285);       /* near-black, slight cool tint */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285);
  --primary: oklch(0.45 0.21 280);            /* deep purple, vibrant */
  --primary-foreground: oklch(0.985 0 0);     /* near-white */
  --secondary: oklch(0.96 0.01 280);          /* very light cool */
  --muted: oklch(0.96 0.01 280);
  --muted-foreground: oklch(0.5 0.015 285);
  --accent: oklch(0.96 0.01 280);
  --destructive: oklch(0.577 0.245 27.325);   /* red */
  --border: oklch(0.91 0.01 285);
  --input: oklch(0.91 0.01 285);
  --ring: oklch(0.45 0.21 280);
  --radius: 0.75rem;                          /* base radius */
  /* ... chart colors, sidebar colors */
}
```

### Dark Theme
```css
.dark {
  --background: oklch(0.145 0.008 285);       /* near-black */
  --foreground: oklch(0.92 0.005 285);        /* near-white */
  --card: oklch(0.185 0.008 285);             /* slightly lighter than bg */
  --primary: oklch(0.65 0.16 280);            /* lighter purple */
  --primary-foreground: oklch(0.12 0.008 285);
  --secondary: oklch(0.22 0.008 285);
  --muted: oklch(0.22 0.008 285);
  --muted-foreground: oklch(0.6 0.008 285);
  --border: oklch(1 0 0 / 12%);               /* white with 12% alpha */
  --input: oklch(1 0 0 / 18%);
  --ring: oklch(0.55 0.12 280);
  /* ... */
}
```

### Kenapa oklch?
- **Perceptual uniformity** — perubahan lightness terasa linear
- **Wide gamut** — bisa represent color di luar sRGB (siap untuk display masa depan)
- **A11y** — lebih mudah hitung kontras yang akurat
- Dukungan browser modern sudah baik (Chrome 111+, Firefox 113+, Safari 15.4+)

## Integrasi Tailwind v4

`globals.css` mapping token → utility class via `@theme inline`:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... */
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}
```

Hasilnya: bisa pakai `bg-background`, `text-foreground`, `bg-primary`, `rounded-lg`, dll di seluruh kode, dan nilainya otomatis dark-mode aware karena variabel CSS di-override di `.dark`.

### Custom Dark Variant
```css
@custom-variant dark (&:is(.dark *));
```

Supaya `dark:` prefix di Tailwind tetap berfungsi meskipun tema via class (bukan via `prefers-color-scheme`).

## Custom Utilities

Di `globals.css` ada beberapa utility custom:

```css
@layer utilities {
  .tabular-nums { font-variant-numeric: tabular-nums; }  /* alignment angka */
  .text-balance { text-wrap: balance; }                  /* balanced line wrap */
  .ease-smooth { transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
  .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
  .duration-smooth { transition-duration: 400ms; }
}
```

### `tabular-nums`
Penting untuk nominal uang! `Rp 12.500.000` vs `Rp  1.500.000` — beda digit count, posisi titik bisa lompat. `tabular-nums` bikin semua digit lebar sama, alignment konsisten.

Dipakai di:
- Total saldo (Dashboard)
- Nominal transaksi (History, Edit)
- Saldo wallet (Dompet, Form)
- Sisa hutang (Debts)

## Font

Plus Jakarta Sans, dari `next/font/google`:

```typescript
// layout.tsx
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});
```

Inject via `className={plusJakartaSans.variable}` di `<html>`. Tailwind `font-sans` resolve ke var `--font-sans`.

## Type Safety untuk Theme

Saat ini theme di-type `string` (default next-themes). Untuk type safety lebih baik, bisa override module declaration:

```typescript
// types.d.ts
declare module "next-themes" {
  export type Theme = "light" | "dark" | "system";
  // ...
}
```

(Tidak diimplementasi saat ini. Lihat [Roadmap](roadmap.md).)

## Konvensi

- **Selalu pakai semantic token** (`bg-card`, `text-muted-foreground`), bukan raw color (`bg-zinc-100`)
- **Dark mode** otomatis lewat class di `<html>`, tidak perlu manual `dark:` di setiap tempat
- **Brand color** (purple) di `--primary` — ganti di satu tempat akan propagate ke semua penggunaan

## Lihat juga

- [Architecture](architecture.md) — provider tree
- [PWA](pwa.md) — `theme_color` di manifest
- [Conventions](conventions.md) — semantic token usage
