# PMS Frontend

Next.js frontend untuk Performance Management System (PMS). Aplikasi menggunakan App Router, TypeScript, Axios untuk akses API, Zustand untuk state autentikasi, serta permission-aware navigation.

## Requirements

- Node.js dan npm
- Repository tidak mem-pin versi Node melalui `.nvmrc` atau `engines`; gunakan versi Node yang kompatibel dengan dependency pada `package-lock.json`.
- Backend PMS berjalan dan dapat diakses dari browser.

## Installation

```bash
npm ci
```

`package-lock.json` adalah sumber versi dependency yang digunakan pada instalasi bersih.

## Environment configuration

Salin `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Variable yang wajib tersedia:

| Variable | Keterangan |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL Backend, misalnya `http://localhost:8080`. Request frontend menambahkan path seperti `/api/v1/...`. |

Nilai environment dibaca saat aplikasi dibuild dan dijalankan. Jangan memasukkan credential atau secret backend ke variable `NEXT_PUBLIC_*` karena nilainya terekspos ke browser.

## Run locally

Development server:

```bash
npm run dev
```

Next.js menggunakan port default `3000` jika tidak diberi override. Production flow:

```bash
npm run build
npm run start
```

Pastikan `NEXT_PUBLIC_API_BASE_URL` menunjuk ke Backend sebelum menjalankan build.

## Verification

```bash
npm run lint
node node_modules/typescript/bin/tsc --noEmit
npm test -- --runInBand
npm run build
```

Script yang tersedia di `package.json` adalah `dev`, `build`, `start`, `lint`, `test`, dan `test:watch`. Konfigurasi Jest berada di `jest.config.ts`; test menggunakan `jsdom` dan alias `@/*` mengarah ke `src/*`.

## Backend dependency and authentication

Semua akses API menggunakan client di [`src/lib/axios.ts`](src/lib/axios.ts) dengan base URL dari `NEXT_PUBLIC_API_BASE_URL`. Client menambahkan access token sebagai bearer token dan memiliki flow refresh session untuk response `401`.

Refresh token saat ini disimpan di `localStorage` melalui [`src/lib/auth.ts`](src/lib/auth.ts). Perubahan session antar-tab disinkronkan melalui storage event. Endpoint login, refresh, dan resource API harus tersedia pada Backend yang dikonfigurasi.

## Main application areas

- Dashboard dan KPI: corporate KPI, unit performance, activity, approval, report, dan report review.
- Organization: employees, positions, dan organization units.
- Settings: profile, roles, dan permission management.
- Authentication: login dan protected application shell.

Navigation didefinisikan terpusat pada [`src/config/navigation.ts`](src/config/navigation.ts) dan disaring berdasarkan permission/capability user. Route page berada di `src/app/`; reusable API dan UI logic berada di `src/modules/`, `src/components/`, `src/hooks/`, dan `src/lib/`.

## Development conventions

- Gunakan Next.js App Router dan internal `Link`/router untuk perpindahan halaman internal.
- Gunakan API service/module yang sudah ada dan client Axios bersama; jangan membuat base URL atau interceptor baru per halaman.
- Pertahankan typecheck TypeScript strict dan validasi form yang sudah menggunakan React Hook Form/Zod.
- Jangan commit `.env`, `.env.local`, `node_modules`, `.next`, `.swc`, atau file cache/build lokal.

## Remaining project work

Backlog implementasi yang belum selesai dan catatan handover tersedia di [`PMS_TODO.md`](./PMS_TODO.md). File tersebut adalah daftar pekerjaan lanjutan, bukan daftar perubahan yang sudah selesai.
