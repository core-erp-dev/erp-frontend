# KPI Frontend Audit Report

> **Date:** 2026-06-23 | **Scope:** `src/modules/hr/kpi/` + `src/app/(main)/hr/kpi/`  
> **Method:** Manual inspection of all 28 module files + 6 page files  
> **Excluded:** Backend KPI (already audited in Audit 2 & 3)

---

## Executive Summary

**Severity:** 4 CRITICAL · 8 HIGH · 6 MEDIUM · 4 LOW

KPI frontend belum melalui remediasi sama sekali — masih menggunakan pattern sebelum standar ERP frontend diterapkan. Pattern yang sudah di-fix di module Employee/Position (Surface+secondary, permission guards, router.back(), HeroUI 100%) belum diaplikasikan ke KPI.

**CRITICAL issues harus di-fix sebelum production:** permission guards (tidak ada di semua halaman KPI), sidebar KPI dikomentari, corporate page pakai hardcoded roles.

---

## 1. HeroUI Compliance

### CRITICAL — KPI Sidebar All Commented Out
- **File:** `src/modules/hr/sidebar.ts` (lines 50, 57, 64, 70, 77)
- **Impact:** User tidak bisa navigasi ke halaman KPI melalui sidebar
- **Fix:** Uncomment sidebar items, tambahkan `permissions: [...]` filter

### HIGH — `<div>` border instead of `<Surface>` (Multiple)
- **Files:**
  - `tasks/[id]/page.tsx:270-272` — report cards: `<div className="rounded-lg border border-border bg-card...">`
  - `tasks/[id]/page.tsx:389-391` — subordinate cards: `<div className="rounded-lg border border-border bg-card...">`
  - `approvals/page.tsx:95-97` — approval queue items
  - `approvals/reports/page.tsx:243-245` — report approval items
  - `corporate/page.tsx:127-128` — info banner
- **Impact:** Tidak konsisten dengan Employee/Position pattern (`<Surface className="rounded-3xl p-6">`)
- **Fix:** Ganti semua border/card div dengan `<Surface>`, apply `bg-surface-secondary` untuk list items

### HIGH — Card instead of Surface (Task Detail)
- **File:** `tasks/[id]/page.tsx:154`
- **Impact:** HeroUI `Card` imported but `Surface` is the standard. Card provides different padding/shadow behavior.
- **Fix:** `<Card>` → `<Surface className="rounded-3xl p-6">`

### HIGH — Native `<input type="file">` 
- **File:** `daily-report-modal.tsx:294-299`
- **Impact:** Native HTML element, violates 100% HeroUI rule
- **Fix:** Gunakan HeroUI `FileUpload` atau bungkus dengan `Button` + hidden input

### HIGH — Native `<a>` tags
- **Files:**
  - `tasks/[id]/page.tsx:305-313` — evidence link
  - `daily-report-modal.tsx:320-327` — evidence link
- **Impact:** Native HTML, inconsistent navigation
- **Fix:** Gunakan `<Link href={url} target="_blank">` dari Next.js, atau `<Button onPress={() => window.open(url)}>`

### MEDIUM — No `variant="secondary"` on Inputs
- **Files:** `task-form-modal.tsx`, `daily-report-modal.tsx`, `approval-modal.tsx`
- **Finding:** All `<Input>` components tidak punya `variant="secondary"`. Form modal tidak menggunakan `Surface` wrapper.
- **Impact:** Visual tidak konsisten dengan Employee/Position forms yang sudah pakai Surface+secondary pattern

### MEDIUM — `span` badges instead of HeroUI `<Badge>`
- **Files:** `task-data-table.tsx:73-78`, `tasks/[id]/page.tsx:160-165`, `approvals/page.tsx:102-106`, `approvals/reports/page.tsx:256-260`
- **Finding:** Status badges menggunakan inline `<span>` dengan Tailwind, bukan HeroUI `<Badge>`
- **Fix:** `<Badge variant={...}>{label}</Badge>`

### MEDIUM — Custom inline styles for tree indentation
- **File:** `task-form-modal.tsx:200`
- **Finding:** `<span style={{ paddingLeft: '${pos.level * 16}px' }}>` — inline CSS style
- **Fix:** Gunakan Tailwind `pl-${level * 4}` atau approach indent global

---

## 2. Permission & Access Control

### CRITICAL — No Permission Guards (All Pages)
- **Files:** `tasks/page.tsx`, `tasks/[id]/page.tsx`, `approvals/page.tsx`, `approvals/reports/page.tsx`, `performance/page.tsx`
- **Finding:** Tidak ada `usePermission()`, tidak ada permission guard di halaman manapun. User tanpa permission bisa akses via direct URL.
- **Required:**
  - `tasks/page.tsx`: gate dengan `PERM.TASK_READ`
  - `tasks/[id]/page.tsx`: gate dengan `PERM.TASK_READ`
  - `approvals/page.tsx`: gate dengan `PERM.TASK_APPROVE`
  - `approvals/reports/page.tsx`: gate dengan `PERM.REPORT_APPROVE`
  - `performance/page.tsx`: gate dengan `PERM.PERFORMANCE_READ`
  - `corporate/page.tsx`: gate dengan `PERM.KPI_READ` (ganti hasRole)

### CRITICAL — Corporate Page: Hardcoded Role Check
- **File:** `corporate/page.tsx:22-25, 32-33`
- **Finding:** Fungsi `hasRole()` dengan string literal `'SUPER_ADMIN'`, `'HR_ADMIN'`, `'USER_APPROVER'`. Tidak menggunakan `usePermission()` + `PERM.*`.
- **Impact:** Role-based (bukan permission-based), tidak sinkron dengan backend PBAC, hardcoded strings.
- **Fix:** Ganti dengan `usePermission()`:
  ```tsx
  const { hasPerm } = usePermission();
  const canView = hasPerm(PERM.KPI_READ);
  const canEdit = hasPerm(PERM.KPI_UPDATE);
  ```

### HIGH — Task List: No Permission Guard on Action Buttons
- **File:** `tasks/page.tsx:218-221`
- **Finding:** Tombol "Tambah Tugas" tidak di-guard permission
- **Fix:** `{hasPerm(PERM.TASK_CREATE) && <Button>Tambah Tugas</Button>}`

### HIGH — No Permission Filters on Sidebar KPI Items
- **File:** `sidebar.ts:50-77`
- **Finding:** Sidebar items dikomentari dan tidak ada `permissions` filter
- **Fix:** Uncomment + tambahkan `permissions: ['task:read']` etc.

---

## 3. Table Dropdown Placement

### HIGH — Wrong Placement Inside ScrollContainer
- **File:** `task-data-table.tsx:182`
- **Finding:** `Dropdown.Popover placement="bottom right"` — tapi dropdown ada di dalam `Table.ScrollContainer`. Standard ERP: harus `placement="top"`.
- **Impact:** Dropdown pada row bawah akan terpotong oleh scroll container boundary. `shouldFlip` tidak bisa mengatasi ini.
- **Fix:** `<Dropdown.Popover placement="top">`

---

## 4. Navigation

### MEDIUM — `router.push()` instead of `router.back()`
- **File:** `tasks/[id]/page.tsx:137`
- **Finding:** Back button menggunakan `router.push('/hr/kpi/tasks')` bukan `router.back()`
- **Impact:** Tidak context-aware. Jika user datang dari approval queue → seharusnya kembali ke approval, bukan tasks list.
- **Fix:** `<Button onPress={() => router.back()}>`

### LOW — No Breadcrumbs
- **Files:** `tasks/[id]/page.tsx`, `approvals/page.tsx`, `corporate/page.tsx`, `performance/page.tsx`
- **Finding:** Halaman detail tidak punya breadcrumb navigation
- **Fix:** Tambahkan `<Breadcrumbs>` dengan path yang sesuai

---

## 5. Language Consistency

### MEDIUM — English User-Facing Strings
- **Files:**
  - `approvals/reports/page.tsx:184` — `"Refresh"` (should be "Muat Ulang" or use icon-only)
  - `performance/page.tsx:91` — `"Total Target"`, `"Total Realisasi"` (should be "Total Target", "Total Realisasi" — acceptable as financial terms, but inconsistent)
  - `task-data-table.tsx:149` — `"sub-tugas"` (should be "Sub-Tugas" or consistent capitalization)
  - `task-data-table.tsx:239` — `"Menampilkan ... hasil"` — missing space before "hasil"
- **Impact:** Mix of English/Indonesian; standard ERP uses Indonesian for all user-facing strings
- **Fix:** Translate to Indonesian; use icon-only for refresh button

---

## 6. Loading / Empty / Error States

### MEDIUM — Task Form Modal: No Loading State for Prerequisites
- **File:** `task-form-modal.tsx:89-94`
- **Finding:** `organizationApi.fetchPositionTree()` + `corporateKpiApi.getAll()` dipanggil saat modal open — tapi tidak ada loading indicator saat fetching. Dropdown muncul kosong tanpa penjelasan.
- **Impact:** User melihat Select kosong tanpa tahu data sedang dimuat
- **Fix:** Tampilkan `<Spinner>` saat fetching positions/KPIs

### MEDIUM — Task Detail: Missing Error State
- **File:** `tasks/[id]/page.tsx:58-60`
- **Finding:** Catch block hanya komentar `// Error handled in API` — tidak ada error state ditampilkan
- **Fix:** Set error state, tampilkan `<Alert status="danger">`

### LOW — Approval Reports: No Loading State on Buttons
- **File:** `approvals/reports/page.tsx:288-290`
- **Finding:** Button "Setuju" menggunakan `isPending` tapi tidak konsisten — `isPending` digunakan bersama `isDisabled`
- **Fix:** Standardize: gunakan `isPending={...}` saja, remove `isDisabled` duplikat

---

## 7. Architecture & Code Quality

### HIGH — Duplicate API Services
- **Files:** `services/task-api.ts` AND `services/kpi-task-api.ts`; `services/report-api.ts` AND `services/kpi-report-api.ts`
- **Finding:** Dua set API service file yang tampaknya duplikat
- **Impact:** Potential dead code, confusing import paths
- **Fix:** Pilih satu set (rekomendasi: `kpi-task-api.ts` + `kpi-report-api.ts`), hapus duplikat

### HIGH — Duplicate Hooks
- **Files:** `hooks/use-task-data.ts` AND `hooks/use-kpi-task-data.ts`; `hooks/use-task-form.ts` AND `hooks/use-kpi-task-form.ts`; `hooks/use-report-data.ts` AND `hooks/use-kpi-report-data.ts`
- **Finding:** Dua set hook file yang fungsinya mirip — pattern: `*-data.ts` + `use-kpi-*-data.ts`
- **Impact:** Kebingungan import, potential stale hooks
- **Fix:** Pilih satu set naming convention (`use-kpi-task-data`), hapus duplikat

### MEDIUM — Direct API Calls in Page (Not via Hook)
- **File:** `tasks/[id]/page.tsx:53-92`
- **Finding:** Direct `kpiTaskApi.getTaskById()`, `kpiReportApi.getReports()` dipanggil di page component, bukan via hook. Tidak ada `useTaskDetail(id)` hook.
- **Impact:** Business logic di UI layer. Pattern di Employee/Position sudah menggunakan `useEmployeeDetail` / `usePositionDetail`.
- **Fix:** Extract ke `use-task-detail.ts` hook

### MEDIUM — report-api.ts: `kpiReportApi.approveReport()` untuk Reject
- **File:** `approvals/reports/page.tsx:103-106`
- **Finding:** Memanggil `kpiReportApi.approveReport(report.id, { action: "REJECT", ...})` — nama method tidak mencerminkan operasi
- **Impact:** Confusing API — `approveReport` dipakai untuk reject
- **Fix:** Backend rename endpoint, atau frontend rename wrapper method

---

## 8. Accessibility

### MEDIUM — Missing `aria-label` on Icon Buttons
- **File:** `approvals/reports/page.tsx:324-331`
- **Finding:** Detail button tidak punya `aria-label`
- **Fix:** `<Button aria-label="Lihat detail laporan">`

---

## 9. Potential Browser Warnings

### LOW — `filters` in useCallback deps causing stale closures
- **File:** `tasks/page.tsx:97-101`
- **Finding:** `handleSearch` includes `filters` in deps, but spreads `{ ...filters, search: ... }` — bisa menyebabkan stale state updates
- **Fix:** Gunakan `setFilters(prev => ({ ...prev, search: value || undefined }))`

---

## 10. Missing Features vs Employee/Position Pattern

| Feature | Employee/Position | KPI |
|---------|-------------------|-----|
| Permission guard on page | ✅ | ❌ None |
| `usePermission()` + `PERM.*` | ✅ | ❌ (hardcoded roles) |
| Sidebar uncommented | ✅ | ❌ All commented |
| `Surface` for sections | ✅ | ❌ Raw divs |
| `variant="secondary"` on Inputs | ✅ | ❌ |
| `router.back()` navigation | ✅ | ❌ `router.push()` |
| Breadcrumbs on detail | ✅ | ❌ |
| Detail hook pattern | ✅ | ❌ Direct API calls |
| 100% HeroUI | ✅ | ❌ native `<a>`, `<input type="file">` |
| `toast.danger()` | ✅ | ✅ (correct) |
| `DeleteConfirmDialog` shared | ⚠️ | Custom `delete-task-dialog.tsx` |

---

## Production Blocking Issues (Must Fix)

1. 🔴 **Permission guards missing** — semua halaman KPI bisa diakses via direct URL tanpa permission
2. 🔴 **Corporate page hardcoded roles** — string `'SUPER_ADMIN'` / `'HR_ADMIN'` langsung di code
3. 🔴 **KPI sidebar semua dikomentari** — user tidak bisa navigasi
4. 🔴 **Duplicate API service + hook files** — `kpi-task-api.ts` vs `task-api.ts`, dst.

---

## Action Plan

### Step 1 — Security & Permission (CRITICAL)
- [ ] Tambahkan `usePermission()` gate di semua 6 halaman KPI
- [ ] Ganti `hasRole()` di corporate page dengan `usePermission()` + `PERM.*`
- [ ] Uncomment sidebar KPI items + tambahkan `permissions` filter
- [ ] Gate tombol "Tambah Tugas" dengan `PERM.TASK_CREATE`

### Step 2 — HeroUI Compliance (HIGH)
- [ ] Ganti semua native `<a>` dengan `<Link>` / `<Button>`
- [ ] Ganti native `<input type="file">` dengan HeroUI pattern
- [ ] Ganti `span` badges dengan `<Badge>`
- [ ] Fix dropdown placement di task-data-table (`top`)
- [ ] Ganti `<Card>` dengan `<Surface>` di task detail

### Step 3 — UI Consistency (MEDIUM)
- [ ] Ganti `<div className="border border-border bg-card">` dengan `<Surface>`
- [ ] Tambahkan `variant="secondary"` pada semua Input di modal
- [ ] Tambahkan breadcrumbs di detail pages
- [ ] `router.push()` → `router.back()`
- [ ] English strings → Indonesian

### Step 4 — Architecture Cleanup (MEDIUM)
- [ ] Hapus duplicate hooks (`use-task-data` vs `use-kpi-task-data`)
- [ ] Hapus duplicate API files (`task-api` vs `kpi-task-api`)
- [ ] Extract `useTaskDetail` hook dari task detail page

### Step 5 — Polish (LOW)
- [ ] Tambahkan loading state di task form modal prerequisites
- [ ] Tambahkan error state di task detail fetch
- [ ] Fix `aria-label` di report approval buttons
