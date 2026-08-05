# Frontend English Language Migration Plan

**Date:** 2026-07-24
**Status:** Executing
**Author:** Hermes Agent (source-inspected)

---

## 1. Search Scope

The entire `erp-frontend/src/` directory was scanned for Indonesian text across:

- `src/app` — pages, layouts, error boundaries
- `src/modules/hr/` — sidebar, KPI, organization, settings
- `src/components/` — layout, shared components
- `src/constants/` — permissions, gender labels
- `src/hooks/` — use-permission
- `src/lib/` — axios, auth, utilities

Search method: 50+ Indonesian keywords with `search_files` across 52 unique files.

---

## 2. Indonesian-Text Inventory

### 2.1 Navigation & Sidebar

| Current (ID) | Location |
|---|---|
| `Karyawan` | `src/modules/hr/sidebar.ts` (title, group `ORGANISASI`) |
| `Struktur Jabatan` | `src/modules/hr/sidebar.ts` (title) |
| `Hak Akses & Role` | `src/modules/hr/sidebar.ts` (title, group `PENGATURAN`) |
| `Pengaturan` | `src/modules/hr/sidebar.ts` (title, group `PENGATURAN`) |
| `Ganti Modul` | `src/components/layout/sidebar.tsx` (button) |
| `KPI Korporat` | `src/modules/hr/kpi/sidebar.ts` (title) |
| `Aktivitas` | `src/modules/hr/kpi/sidebar.ts` (title) |
| `Laporan` | `src/modules/hr/kpi/sidebar.ts` (title) |
| `Persetujuan` | `src/modules/hr/kpi/sidebar.ts` (title) |
| Group labels: `ORGANISASI`, `PENGATURAN` | `src/modules/hr/sidebar.ts` |
| `PENGATURAN` (bottom group) | `src/components/layout/sidebar.tsx` |

### 2.2 Page Titles & Descriptions

| Current (ID) | Location |
|---|---|
| `Semua Karyawan` | `employees/page.tsx` |
| `Struktur Jabatan` | `positions/page.tsx` |
| `Semua Role` | `settings/roles/page.tsx` |
| `Pengaturan` | `settings/page.tsx` |
| `Konfigurasi sistem dan manajemen akses.` | `settings/page.tsx` |
| `Hak Akses & Role` | `settings/page.tsx` (card title) |
| `Kelola role dan permission` | `settings/page.tsx` (card subtitle) |
| `Sumber Daya Manusia` | `app/page.tsx` (module card) |
| `Kelola karyawan, hierarki organisasi, dan operasional HR.` | `app/page.tsx` |
| `Pilih modul untuk memulai` | `app/page.tsx` |
| `KPI Korporat` (label) | `kpi/constants.ts` |
| `Aktivitas KPI` (label) | `kpi/constants.ts` |
| `Laporan Pelaksanaan` (label) | `kpi/constants.ts` |
| `Persetujuan Aktivitas` (label) | `kpi/constants.ts` |
| KPI descriptions (all 5) | `kpi/constants.ts` |
| Placeholder texts in KPI page shells (5 files) | `kpi/{page}.tsx` |

### 2.3 Actions (Buttons/Links)

| Current (ID) | Location |
|---|---|
| `Tambah Karyawan` | `employees/page.tsx` |
| `Tambah Jabatan` | `positions/page.tsx` |
| `Tambah Role` | `settings/roles/page.tsx` |
| `Tambah` | Various forms |
| `Simpan` | `employee-form.tsx`, `role-form.tsx`, `position-form.tsx`, `assign-user-modal.tsx` |
| `Batal` | `delete-confirm-dialog.tsx`, forms, assign-user-modal |
| `Hapus` | `delete-confirm-dialog.tsx`, table action columns |
| `Pulihkan` | `data-table.tsx`, `role-table.tsx`, `position-table.tsx` |
| `Kembali` | Multiple detail/edit pages, `not-found.tsx` (`Kembali ke Beranda`) |
| `Tugaskan` | `positions/[id]/page.tsx` |
| `Coba Lagi` | `error.tsx` (2 files) |
| `Masuk` | `login/page.tsx` |
| `Ganti Modul` | `sidebar.tsx` |
| `Ganti Modul` (button) | `sidebar.tsx` |

### 2.4 Forms & Validation

| Current (ID) | Location |
|---|---|
| `Email atau NIP` | `login/page.tsx` |
| `Kata Sandi` | `login/page.tsx` |
| `Masukkan email atau NIP` | `login/page.tsx` |
| `Email/NIP tidak boleh kosong` | `login/page.tsx` |
| `Kata sandi tidak boleh kosong` | `login/page.tsx` |
| `Email/NIP atau kata sandi salah` | `login/page.tsx` |
| `Server error, coba lagi nanti` | `login/page.tsx` |
| `Koneksi gagal, periksa jaringan Anda` | `login/page.tsx` |
| `Login gagal, coba lagi` | `login/page.tsx` |
| `NIP`, `Nama Lengkap` etc (form labels) | `employee-form.tsx` |
| `Kode`, `Nama`, `Induk` etc (form labels) | `position-form.tsx` |
| `Nama Role`, `Kode Role`, `Deskripsi` | `role-form.tsx` |
| `Pilih Tanggal` | `date-field-picker.tsx` |

### 2.5 Statuses

| Current (ID) | Location |
|---|---|
| `Aktif` | Various badges in tables |
| `Tidak Aktif` | Various |
| `Terhapus` | Filter toggles (`employees/page.tsx`, `positions/page.tsx`, `roles/page.tsx`) |
| `Dihapus` | Table column value for deleted rows (`data-table.tsx`) |
| `Utama` / `Rangkap` | Multi-position badges (`employees/[id]/page.tsx`, `assign-user-modal.tsx`) |

### 2.6 Dialogs

| Current (ID) | Location |
|---|---|
| `Konfirmasi Hapus` | `delete-confirm-dialog.tsx` |
| `Apakah Anda yakin ingin menghapus {entityLabel} {name}?` | `delete-confirm-dialog.tsx` |
| `Menghapus...` | `delete-confirm-dialog.tsx` |
| `Karyawan tidak akan bisa mengakses sistem setelah dihapus.` | `employees/page.tsx` |
| `Jabatan yang masih memiliki bawahan atau karyawan aktif tidak dapat dihapus.` | `positions/page.tsx` |
| `Role tidak akan bisa digunakan setelah dihapus.` | `settings/roles/page.tsx` |

### 2.7 Tables & Filters

| Current (ID) | Location |
|---|---|
| `Filter` | Employee/position list pages |
| `Urut` | Employee/position list pages |
| `Cari` / `Cari karyawan` / `Cari jabatan` / `Cari role` | Search placeholders |
| `Cari NIP, Nama, Email` | `employees/page.tsx` |
| `Cari kode atau nama jabatan` | `positions/page.tsx` |
| `Cari Kode/Nama Role` | `roles/page.tsx` |
| `Terhapus` (toggle) | 3 list pages |
| `Perluas Semua` / `Ciutkan Semua` | `positions/page.tsx` |
| `Tabel` / `Tree` (view tabs) | `positions/page.tsx` |
| `Tampilan` (tabs aria-label) | `positions/page.tsx` |
| `Tampilkan terhapus` | aria-labels on toggle buttons |
| `Tampilkan Karyawan Terhapus` | comment in employees page |
| `Jabatan` (filter section header) | `employees/page.tsx` |
| Sort labels: `Nama (A-Z)`, `Nama (Z-A)`, `Terbaru`, `Terlama`, `Kode (A-Z)`, `Kode (Z-A)`, `Level (Terendah)`, `Level (Tertinggi)` | List pages |
| `Muat ulang` / `Muat ulang data karyawan` / `Muat ulang data role` | aria-labels |
| `Reset filter` | aria-label |

### 2.8 Notifications & Errors (Toasts)

Found primarily in hooks (use-employee-data.ts, use-employee-detail.ts, use-employee-form-data.ts, use-position-data.ts, use-position-detail.ts, use-position-form-data.ts, use-role-data.ts, use-role-detail.ts, use-role-form-data.ts, position-table.tsx):

- `Gagal memuat data karyawan`
- `Gagal menghapus karyawan`
- `Karyawan berhasil dihapus`
- `Karyawan berhasil dipulihkan`
- `Gagal memulihkan karyawan`
- `Gagal memuat data jabatan`
- `Gagal menghapus jabatan`
- `Jabatan "{name}" berhasil dihapus`
- `Jabatan "{name}" berhasil dipulihkan`
- `Gagal memulihkan jabatan`
- `Gagal memuat data role`
- `Gagal menghapus role`
- `Role "{name}" berhasil dihapus`
- `Role "{name}" berhasil dipulihkan`
- `Gagal memulihkan role`
- `Gagal menambahkan jabatan`
- `Gagal memperbarui jabatan`
- `Jabatan berhasil ditambahkan`
- `Jabatan berhasil diperbarui`
- `Karyawan berhasil ditambahkan`
- `Karyawan berhasil diperbarui`
- `Gagal menambahkan karyawan`
- `Gagal memperbarui karyawan`
- `Role berhasil dibuat`
- `Role berhasil diperbarui`
- `Gagal membuat role`
- `Gagal memperbarui role`
- `Gagal menugaskan karyawan`
- `Karyawan berhasil ditugaskan`
- Various success/failure messages in hooks

### 2.9 Error Pages

| Current (ID) | Location |
|---|---|
| `Terjadi Kesalahan` | `error.tsx` (2 files) |
| `Terjadi kesalahan yang tidak terduga.` | `error.tsx` (2 files) |
| `Coba Lagi` | `error.tsx` (2 files) |
| `Halaman Tidak Ditemukan` | `not-found.tsx` |
| `Halaman yang Anda cari tidak tersedia.` | `not-found.tsx` |
| `Kembali ke Beranda` | `not-found.tsx` |
| `Akses Ditolak` | Various permission-gated pages |

### 2.10 Header & Profile

| Current (ID) | Location |
|---|---|
| `Cari` (search placeholder) | `header.tsx` |
| `Hapus pencarian` (aria-label) | `header.tsx` |
| `Notifikasi` (aria-label) | `header.tsx` |
| `Menu profil` (aria-label) | `header.tsx` |
| `Profil` (dropdown item) | `header.tsx` |
| `Pengaturan Akun` (dropdown item) | `header.tsx` |
| `Keluar` (dropdown item) | `header.tsx` |
| `Pengguna` (fallback display name) | `header.tsx` |

### 2.11 Home/Module Selector

| Current (ID) | Location |
|---|---|
| `Sumber Daya Manusia` | `app/page.tsx` |
| `Kelola karyawan, hierarki organisasi, dan operasional HR.` | `app/page.tsx` |
| `Pilih modul untuk memulai` | `app/page.tsx` |

### 2.12 KPI Constants

| Current (ID) | Location |
|---|---|
| `KPI Korporat` | `kpi/constants.ts` (label) |
| `Aktivitas KPI` | `kpi/constants.ts` (label) |
| `Laporan Pelaksanaan` | `kpi/constants.ts` (label) |
| `Persetujuan Aktivitas` | `kpi/constants.ts` (label) |
| All 5 Indonesian descriptions | `kpi/constants.ts` |

### 2.13 KPI Page Shells (Placeholders)

| Current (ID) | Location |
|---|---|
| `Overview akan tersedia setelah data KPI Korporat, Aktivitas, dan Laporan terintegrasi.` | `kpi/page.tsx` |
| `Manajemen KPI Korporat akan diimplementasikan pada fase P1.` | `kpi/corporate/page.tsx` |
| `Manajemen Aktivitas KPI akan diimplementasikan pada fase P2.` | `kpi/activities/page.tsx` |
| `Manajemen Laporan Pelaksanaan akan diimplementasikan pada fase P3.` | `kpi/reports/page.tsx` |
| `Persetujuan Aktivitas akan diimplementasikan pada fase P2.` | `kpi/approvals/page.tsx` |

### 2.14 Detail Pages

Heavy Indonesian content in:
- `employees/[id]/page.tsx` — field labels, section headings, detail items
- `positions/[id]/page.tsx` — field labels, section headings, "Bawahan Langsung", "Daftar Karyawan", "Tugaskan"
- `settings/roles/[id]/page.tsx` — field labels, section headings
- `employees/[id]/edit/page.tsx`, `positions/[id]/edit/page.tsx`, `settings/roles/[id]/edit/page.tsx` — form titles
- `employees/create/page.tsx`, `positions/create/page.tsx`, `settings/roles/create/page.tsx` — form titles

### 2.15 Tests

Indonesian text assertions in:
- `kpi/__tests__/page-shells.test.tsx` — matches ID descriptions, `"tersedia setelah"`, `"Dashboard KPI"`
- `kpi/__tests__/sidebar.test.ts` — matches `'KPI Korporat'`, `'Aktivitas'`, `'Laporan'`, `'Persetujuan'`

---

## 3. Categories of Text Found

| Category | Files | Tokens |
|---|---|---|
| Navigation/sidebar | 3 files | ~15 strings |
| Page titles/descriptions | 8 files | ~20 strings |
| Actions (buttons) | 12+ files | ~30 strings |
| Forms/validation | 6 files | ~40 strings |
| Statuses | 5+ files | ~10 strings |
| Dialogs | 4 files | ~8 strings |
| Tables/filters | 4 files | ~25 strings |
| Notifications/errors (toasts) | 10 files | ~35 strings |
| Error pages | 3 files | ~8 strings |
| Header/profile | 1 file | ~9 strings |
| KPI constants/shells | 6 files | ~15 strings |
| Tests | 2 files | ~10 assertions |
| Detail/form pages | 12+ files | ~40 strings |
| Home/module selector | 1 file | ~3 strings |

---

## 4. Contextual Translation Decisions

### Canonical Terminology

| Indonesian | English | Context |
|---|---|---|
| Karyawan | Employee(s) | List: "Employees", form: "Employee" |
| Jabatan | Position(s) | List: "Positions", form: "Position" |
| Struktur Jabatan | Position Structure | Sidebar + breadcrumb |
| Organisasi | Organization | Sidebar group |
| Pengaturan | Settings | Sidebar group + page title |
| Hak Akses & Role | Access Control & Roles | Sidebar + page titles |
| KPI Korporat | Corporate KPI | Sidebar + page titles |
| Aktivitas / Aktivitas KPI | Activities / KPI Activities | Sidebar + page titles |
| Laporan / Laporan Pelaksanaan | Reports / Execution Reports | Sidebar + page titles |
| Persetujuan / Persetujuan Aktivitas | Approvals / Activity Approvals | Sidebar + page titles |
| Tambah | Add (noun: "Add X") | Button labels |
| Ubah | Edit | Button + link labels |
| Hapus | Delete | Button labels |
| Pulihkan | Restore | Button labels |
| Simpan | Save | Form submit buttons |
| Batal | Cancel | Form/dialog secondary action |
| Tutup | Close | Modal close |
| Kembali | Back | Navigation |
| Cari | Search | Search placeholder |
| Aktif | Active | Status badge |
| Tidak Aktif | Inactive | Status badge |
| Terhapus / Dihapus | Deleted | Filter toggle + status badge |
| Utama | Primary | Position type badge |
| Rangkap | Secondary | Position type badge |
| Tugaskan | Assign | Action button |
| Bawahan | Subordinates | Section heading |
| Keluar | Sign Out | Dropdown menu item |
| Masuk | Sign In | Login page button |
| Memuat... | Loading... | Login button state |
| Konfirmasi Hapus | Confirm Delete | Dialog title |
| Berhasil | Successfully | Toast prefix |
| Gagal | Failed to | Toast prefix |
| Belum ada data | No data available | Empty state |

### Special Context Decisions

- "Semua Karyawan" → "Employees" (not "All Employees" — the "All" is redundant in list contexts)
- "Semua Role" → "Roles" (consistent with Employees)
- "Ganti Modul" → "Switch Module"
- "Pilih modul untuk memulai" → "Select a module to get started"
- "Sumber Daya Manusia" → "Human Resources"
- "Kelola karyawan, hierarki organisasi, dan operasional HR." → "Manage employees, organization hierarchy, and HR operations."
- Toast messages follow pattern: "Entity action successfully" / "Failed to action entity"
- "Akses Ditolak" → "Access Denied"
- "Coba Lagi" → "Try Again"
- "Halaman Tidak Ditemukan" → "Page Not Found"
- "Kembali ke Beranda" → "Back to Home"

### Capitalization Rules

- Page titles: Title Case ("Employees", "Position Structure", "Corporate KPI")
- Buttons: Sentence case or action labels ("Add Employee", "Save", "Cancel")
- Descriptions/messages: Sentence case
- Statuses: Title Case ("Active", "Inactive", "Deleted")
- Navigation items: Title Case (matching page titles)

---

## 5. Files to Modify

### Production Source (~45 files)

**Sidebar & Navigation:**
1. `src/modules/hr/sidebar.ts` — titles, groups
2. `src/modules/hr/kpi/sidebar.ts` — titles
3. `src/modules/hr/kpi/constants.ts` — labels, descriptions
4. `src/components/layout/sidebar.tsx` — button label, group name

**KPI Page Shells:**
5. `src/app/(main)/hr/kpi/page.tsx`
6. `src/app/(main)/hr/kpi/corporate/page.tsx`
7. `src/app/(main)/hr/kpi/activities/page.tsx`
8. `src/app/(main)/hr/kpi/reports/page.tsx`
9. `src/app/(main)/hr/kpi/approvals/page.tsx`

**Employee Pages:**
10. `src/app/(main)/hr/organization/employees/page.tsx`
11. `src/app/(main)/hr/organization/employees/[id]/page.tsx`
12. `src/app/(main)/hr/organization/employees/[id]/edit/page.tsx`
13. `src/app/(main)/hr/organization/employees/create/page.tsx`

**Employee Components & Hooks:**
14. `src/modules/hr/organization/employees/components/employee-form.tsx`
15. `src/modules/hr/organization/employees/components/data-table.tsx`
16. `src/modules/hr/organization/employees/components/assign-user-modal.tsx`
17. `src/modules/hr/organization/employees/hooks/use-employee-data.ts`
18. `src/modules/hr/organization/employees/hooks/use-employee-detail.ts`
19. `src/modules/hr/organization/employees/hooks/use-employee-form-data.ts`

**Position Pages:**
20. `src/app/(main)/hr/organization/positions/page.tsx`
21. `src/app/(main)/hr/organization/positions/[id]/page.tsx`
22. `src/app/(main)/hr/organization/positions/[id]/edit/page.tsx`
23. `src/app/(main)/hr/organization/positions/create/page.tsx`

**Position Components & Hooks:**
24. `src/modules/hr/organization/positions/components/position-form.tsx`
25. `src/modules/hr/organization/positions/components/position-table.tsx`
26. `src/modules/hr/organization/positions/hooks/use-position-data.ts`
27. `src/modules/hr/organization/positions/hooks/use-position-detail.ts`
28. `src/modules/hr/organization/positions/hooks/use-position-form-data.ts`

**Settings Pages:**
29. `src/app/(main)/hr/settings/page.tsx`
30. `src/app/(main)/hr/settings/roles/page.tsx`
31. `src/app/(main)/hr/settings/roles/[id]/page.tsx`
32. `src/app/(main)/hr/settings/roles/[id]/edit/page.tsx`
33. `src/app/(main)/hr/settings/roles/create/page.tsx`

**Settings Components & Hooks:**
34. `src/modules/hr/settings/components/role-form.tsx`
35. `src/modules/hr/settings/components/role-table.tsx`
36. `src/modules/hr/settings/components/role-permission-panel.tsx`
37. `src/modules/hr/settings/hooks/use-role-data.ts`
38. `src/modules/hr/settings/hooks/use-role-detail.ts`
39. `src/modules/hr/settings/hooks/use-role-form-data.ts`

**Shared Components:**
40. `src/components/shared/delete-confirm-dialog.tsx`
41. `src/components/shared/date-field-picker.tsx`

**Layout/Error/Home:**
42. `src/components/layout/header.tsx`
43. `src/app/(auth)/login/page.tsx`
44. `src/app/(main)/error.tsx`
45. `src/app/error.tsx`
46. `src/app/not-found.tsx`
47. `src/app/page.tsx`

**Tests:**
48. `src/modules/hr/kpi/__tests__/page-shells.test.tsx`
49. `src/modules/hr/kpi/__tests__/sidebar.test.ts`

**Documentation:**
50. `docs/plans/2026-07-23-kpi-frontend-p1-corporate.md` (P1 plan update)
51. `docs/testing/2026-07-24-frontend-english-language-migration-verification.md` (new)

---

## 6. Exclusions (Do NOT Modify)

### 6.1 Technical Contracts (unchanged)

- API endpoint paths (`/api/v1/...`)
- Route paths (`/hr/kpi/corporate`, `/hr/organization/employees`)
- Permission codes (`corporate_kpi:read`, `user:read`)
- Enum wire values (`ASPECT`, `INDICATOR`, `DRAFT`, `ACTIVE`)
- DTO field names (`activityId`, `assignedToUserPositionId`)
- TypeScript identifiers using backend terminology
- CSS class names
- File paths

### 6.2 Non-user-facing content (unchanged)

- Code comments (unless they describe UI text that changed)
- Variable names
- Function names
- Git history
- Backend payload examples in documentation
- Historical archived documents

### 6.3 Out of Scope

- Backend modifications
- i18n libraries, locale switching, translation catalogs
- Corporate KPI P1 implementation
- Activities, Reports, Approvals implementation
- UI redesign
- Business logic refactoring

---

## 7. Verification Strategy

1. **TypeScript:** `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && node_modules/.bin/tsc --noEmit"`
2. **Jest:** `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest --passWithNoTests"`
3. **Lint:** `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx next lint"`
4. **Production build:** `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx next build"`
5. **Manual:** spot-check key pages for remaining Indonesian
6. **Regression test:** forbidden-term check script (see verification document)

---

## 8. Hermes Skill and Obsidian Update Targets

### Hermes Skills

| Skill | File | Change |
|---|---|---|
| `erp-frontend-standards` | `~/.hermes/skills/software-development/erp-frontend-standards/SKILL.md` | Update language rule from "UI=ID" to "UI=EN" |

### Obsidian Vault

| Note | File | Change |
|---|---|---|
| `erp-patterns.md` | `/mnt/c/Users/itqon/Obsidian/Hermes/Domains/erp-patterns.md` | Update "Buttons: Simpan" to English, add language decision |
