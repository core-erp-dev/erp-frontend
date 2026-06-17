# FRONTEND AUDIT REPORT

**ERP Frontend — Next.js 16 + React 19 + HeroUI v3**
**Tanggal Audit:** 18 Juni 2026 (Revisi 2)
**Auditor:** Hermes Agent (Automated)
**Scope:** Non-KPI modules (Employee, Position, Role, Settings, Auth, Layout, Shared Components)

---

## Executive Summary

Audit menyeluruh dilakukan terhadap modul non-KPI frontend ERP. **Ditemukan 4 browser warning aktif, 3 CRITICAL security gap, 7 HIGH issues, dan beberapa temuan MEDIUM/LOW.**

Permasalahan terbesar:
1. **4 browser warning** muncul saat runtime — PressResponder, missing aria-label (×2), image aspect ratio
2. **Hierarchy page duplikat** — ada 2 halaman struktur jabatan (`/hr/hierarchy` dan `/hr/positions`)
3. **Tidak ada permission guard** pada halaman create/edit (bisa dibuka via URL langsung)
4. **Native HTML elements** yang seharusnya HeroUI

Di sisi positif: modul Employee dan Position sudah sangat matang — `hasPerm` coverage baik pada list/detail pages, loading/empty/error state lengkap, dan tidak ada console.log sama sekali.

---

## Permission Source of Truth

Berdasarkan migration database backend (`V2__seed_dev_data.sql` + `V6`):

### 5 Roles
| ID | Role Code | Description |
|----|-----------|-------------|
| 1 | SUPER_ADMIN | Full system access |
| 2 | DIRECTOR | Strategic oversight |
| 3 | HR_ADMIN | Employee/position CRUD + KPI manage |
| 4 | MANAGER | Department + subordinate reports |
| 5 | EMPLOYEE | Basic task + daily report |

### Non-KPI Permissions (yang relevan untuk frontend audit ini)
| ID | Code | Module |
|----|------|--------|
| 1 | employee:read | employee |
| 2 | employee:create | employee |
| 3 | employee:update | employee |
| 4 | employee:delete | employee |
| 5 | position:read | position |
| 6 | position:create | position |
| 7 | position:update | position |
| 8 | position:delete | position |
| 9 | user:read | user |
| 10 | user:create | user |
| 11 | user:update | user |
| 12 | user:delete | user |
| 13 | role:read | role |
| 14 | role:manage_permissions | role |
| 15 | position:assign_role | position |
| 31 | permission:read | permission |
| 32 | employee:read_deleted | employee |
| 33 | employee:restore | employee |
| 34 | position:restore | position |
| 35 | position:read_deleted | position |

---

## 🔴 Active Browser Warnings (Confirmed at Runtime)

User menjalankan frontend dan mendapatkan warning berikut di browser console:

### Warning 1: PressResponder without pressable child

```
A PressResponder was rendered without a pressable child.
Either call the usePress hook, or wrap your DOM node with <Pressable> component.
```

| Severity | File:Line | Root Cause |
|----------|-----------|------------|
| **CRITICAL** | `modules/hr/hierarchy/components/hierarchy-view.tsx:179-192` | Button dengan `slot="chevron"` di dalam tree Table.Cell. React Aria Table menggunakan slot khusus untuk expand/collapse indicator. Button inside Table tree row dengan `slot="chevron"` perlu komposisi yang tepat. |

**Detail:** `Table` dengan `selectionMode="single"` dan `treeColumn="name"` menggunakan render prop `hasChildItems` untuk menampilkan expand/collapse. Button chevron di-render di dalam Table.Cell tanpa React Aria pressable wrapper yang sesuai.

### Warning 2 & 3: Missing aria-label (2 instances)

```
If you do not provide a visible label, you must specify an aria-label
or aria-labelledby attribute for accessibility
```

| Severity | File:Line | Root Cause |
|----------|-----------|------------|
| **CRITICAL** | `modules/hr/hierarchy/components/position-table.tsx:123` | Native `<button onClick={...}>` tanpa `aria-label` — digunakan untuk tree expand/collapse di tree view. |
| **CRITICAL** | `app/(main)/hr/settings/page.tsx:19` | Native `<button onClick={...}>` tanpa `aria-label` — card untuk navigasi ke "Hak Akses & Role". |

### Warning 4: Image aspect ratio

```
Image with src "http://localhost:3000/logo/text-logo.svg" has either width or
height modified, but not the other. If you use CSS to change the size of your
image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain
the aspect ratio.
```

| Severity | File:Line | Root Cause |
|----------|-----------|------------|
| **HIGH** | `components/layout/sidebar.tsx:117-124` | `<Image width={64} height={20} style={{ height: "auto" }}>` — `height` dioverride via inline style tapi `width` tidak. Next.js warning karena layout shift risk. |

**Fix:**
```tsx
// ❌
<Image src="/logo/text-logo.svg" alt="STI one" width={64} height={20}
  style={{ height: "auto" }} />

// ✅
<Image src="/logo/text-logo.svg" alt="STI one" width={64} height={20}
  style={{ height: "auto", width: "auto" }} />
```

---

## 1. Dead Code & Unused Files

| Severity | File | Finding |
|----------|------|---------|
| **HIGH** | `app/(main)/hr/hierarchy/page.tsx` | **DUPLIKAT** — halaman struktur jabatan alternatif. Ada 2 halaman untuk fungsionalitas yang sama. User mengkonfirmasi: hapus `/hr/hierarchy`, pakai `/hr/positions` saja. |
| **HIGH** | `modules/hr/hierarchy/` (seluruh folder) | Nama folder tidak konsisten — seharusnya `modules/hr/positions/` agar match dengan nama route. Isinya dipakai oleh `positions/page.tsx`. |
| LOW | `src/components/ui/` (14 files) | Legacy shadcn/ui components — semuanya tidak digunakan. Project sudah full HeroUI v3. |
| LOW | `modules/hr/hierarchy/components/position-form-modal.tsx` | Modal form deprecated — diganti oleh full-page `position-form.tsx`. |
| INFO | `modules/hr/shared/utils/index.ts` | Barrel file, hanya 1 utility. |
| INFO | `modules/hr/shared/types/index.ts` | Barrel file kosong. |

### Console.log / console.warn / console.error
✅ **Tidak ditemukan.** Codebase bersih.

---

## 2. Language Consistency

### User-Facing Content
✅ **Baik.** Semua label, toast, validation, empty state, error state dalam Bahasa Indonesia.

### Code Base
✅ **Baik.** Semua variable, function, interface, type, hook dalam Bahasa Inggris.

**Satu temuan:**
| Severity | File:Line | Issue |
|----------|-----------|-------|
| LOW | `employee-api.ts:18` | Parameter `jabatanId` — kata Indonesia di code. Matching backend API name. |

---

## 3. Next.js Architecture Review

### Route Structure
```
src/app/
├── (auth)/login/              # Login page
├── (main)/
│   ├── layout.tsx              # AuthGuard + MainLayout
│   ├── error.tsx               # Error boundary
│   ├── hr/
│   │   ├── employees/
│   │   │   ├── page.tsx        # List (server-side pagination) ✅
│   │   │   ├── create/page.tsx # Create form ✅
│   │   │   ├── [id]/page.tsx   # Detail ✅
│   │   │   └── [id]/edit/page.tsx # Edit form ✅
│   │   ├── positions/
│   │   │   ├── page.tsx        # List + Tree view ✅ (PRIMARY)
│   │   │   ├── create/page.tsx # Create form ✅
│   │   │   ├── [id]/page.tsx   # Detail ✅
│   │   │   └── [id]/edit/page.tsx # Edit form ✅
│   │   ├── hierarchy/page.tsx  # ❌ DUPLICATE — hapus
│   │   └── settings/
│   │       ├── page.tsx        # Settings overview
│   │       └── roles/page.tsx  # Role-permission management
```

### Issues

| Severity | Finding | Recommendation |
|----------|---------|---------------|
| **CRITICAL** | `hierarchy/page.tsx` duplikasi fungsionalitas dengan `positions/page.tsx`. | **Hapus** `/hr/hierarchy` route dan file. Gunakan `positions/page.tsx` yang sudah memiliki view switcher (Table + Tree). |
| **HIGH** | Folder `modules/hr/hierarchy/` — nama tidak match route `positions`. | **Rename** ke `modules/hr/positions/`. Update semua import path. |
| LOW | `settings/roles/page.tsx` ada di `app/` tapi komponen dari `modules/hr/settings/`. | OK untuk sekarang — hanya 1 settings page. |

---

## 4. API Layer & Data Fetching Review

### Architecture
```
services/     → API calls (axios)
hooks/        → State management + data fetching + mutations
components/   → Pure UI, consume hooks
pages/        → Compose layout, connect hooks to UI
```

✅ **Strengths:**
- Clean separation — services tidak dipanggil langsung dari komponen
- Custom hooks mengelola loading, error, data, pagination
- Axios interceptor auto-refresh token
- Debounce 400ms pada search
- Server-side pagination untuk list pages

⚠️ **Issues:**

| Severity | File | Finding |
|----------|------|---------|
| MEDIUM | `employees/[id]/page.tsx:26-37` | Fetch data langsung di page (tidak pakai hook). Pattern sama di position detail. Bisa diextract ke hook. |
| MEDIUM | `employees/[id]/edit/page.tsx:19-31` | Fetch data langsung di page. Bisa diextract. |
| MEDIUM | `positions/[id]/edit/page.tsx:20-33` | Fetch data langsung + `findInTree` utility diduplikasi. |
| LOW | `employee-api.ts:85-90` | `getPositions()` di employee-api — lebih cocok di organization-api. |

### Toast Deduplication
✅ **Bersih.** Tidak ada duplikasi toast. Hook handle error via `extractErrorMessage`, page handle success navigation.

---

## 5. Reusable Component Audit

### Duplication

| Severity | Finding | Details |
|----------|---------|---------|
| **HIGH** | `DeleteConfirmDialog` × 2 | `employees/components/delete-confirm-dialog.tsx` dan `hierarchy/components/delete-confirm-dialog.tsx` — implementasi hampir identik. Hanya berbeda prop name (`userName` vs `positionName`). |
| MEDIUM | `findInTree()` × 2 | Diduplikasi di `positions/[id]/page.tsx` dan `positions/[id]/edit/page.tsx`. |
| MEDIUM | `DateFieldPicker` inline | Hanya di `employee-form.tsx`. Perlu diextract ke shared components untuk reuse. |

### Components That Should Be Shared (Currently Local)

| Component | Current Location | Should Be |
|-----------|-----------------|-----------|
| `DeleteConfirmDialog` | `employees/` + `hierarchy/` | `components/shared/delete-confirm-dialog.tsx` |
| `DateFieldPicker` | `employee-form.tsx` (inline) | `components/shared/date-field-picker.tsx` |
| `findInTree` | Position pages | `modules/hr/shared/utils/` |

---

## 6. Error Handling & UX Consistency

✅ **Tidak ada `alert()`, `confirm()`, `prompt()`.** Semua memakai `toast.danger()` atau HeroUI `Alert`.

### Inconsistency

| Severity | File:Line | Finding |
|----------|-----------|---------|
| MEDIUM | `positions/[id]/page.tsx:67`, `employees/[id]/edit/page.tsx:44`, `positions/[id]/edit/page.tsx:45` | Error state menggunakan native `<div>` — seharusnya HeroUI `<Alert status="danger">`. |
| MEDIUM | `hierarchy-view.tsx:591-634` | Delete confirmation di-inline sebagai Modal custom (bukan shared `DeleteConfirmDialog`). |
| LOW | `employee-form.tsx:119` | Empty catch `catch {}` — swallows error silently. |

---

## 7. Loading / Empty / Error State Review

| Page | Loading | Empty | Error |
|------|---------|-------|-------|
| Employee List | ✅ Spinner in table | ✅ Tray + "Tidak ada data" | ✅ Toast |
| Employee Detail | ✅ Spinner + text | ✅ Error state | ✅ Message |
| Employee Create | ✅ N/A | N/A | ✅ Toast on submit |
| Employee Edit | ✅ Spinner + text | ✅ Error state | ✅ Message |
| Position List | ✅ Spinner | ✅ Tray + "Tidak ada data" | ✅ Toast |
| Position Detail | ✅ Spinner + text | ✅ Error state | ✅ Message |
| Position Create | ✅ N/A | N/A | ✅ Toast |
| Position Edit | ✅ Spinner | ✅ Error state | ✅ Message |
| Settings / Roles | ✅ Spinner + text | ✅ Error state | ✅ Message |

✅ **Semua halaman non-KPI sudah memiliki keempat state.**

---

## 8. HeroUI Compliance Review

### HeroUI Violations (non-KPI)

| Severity | File:Line | Issue |
|----------|-----------|-------|
| **CRITICAL** | `position-table.tsx:123` | **Native `<button>`** untuk tree expand/collapse — harus HeroUI `<Button>`. Juga tidak ada `aria-label`. |
| **CRITICAL** | `settings/page.tsx:19` | **Native `<button>`** untuk card navigasi — harus HeroUI `<Button>` atau `<Card>`. Tidak ada `aria-label`. |
| **HIGH** | `hierarchy-view.tsx:179` | Button `slot="chevron"` di tree Table — menyebabkan PressResponder warning. |
| **HIGH** | `positions/[id]/page.tsx:160,189` | **`<span onClick>`** — clickable span untuk navigasi. Harus HeroUI `<Button>` atau Next.js `<Link>`. |
| **HIGH** | `not-found.tsx:15` | **`<Link>` wraps `<Button>`** — full page reload. Harus `<Button onPress={() => router.push('/')}>`. |
| MEDIUM | `role-permission-panel.tsx:136` | `<div onClick>` untuk role card — harus HeroUI `<Card>` atau `<Button>`. |
| MEDIUM | `positions/[id]/page.tsx:143,196` | Menggunakan `'—'` (em dash) untuk empty value — convention project: `'-'`. |
| MEDIUM | `settings/page.tsx:10`, `settings/roles/page.tsx:7` | **Double padding**: wrapper pakai `p-6` tapi layout sudah kasih `p-6`. |

### HeroUI Patterns — ✅ Correct

| Pattern | Status |
|---------|--------|
| `Dropdown + Button` (Pattern A) | ✅ Semua benar, tidak ada nested button |
| `Dropdown.Popover` wrapper untuk `Dropdown.Menu` | ✅ Semua benar |
| `placement="top"` untuk Dropdown di `Table.ScrollContainer` | ✅ position-table.tsx sudah benar |
| `Table.Footer` + `Pagination` | ✅ Semua list pages pakai pattern benar |
| `Surface variant="transparent"` untuk form sections | ✅ employee-form dan position-form benar |
| `selectedKey` (singular) untuk Select single | ✅ Semua benar |
| `toast.danger()` bukan `.error()` | ✅ Semua benar |
| `Alert` compound (Indicator + Content + Title) | ✅ Login page benar |
| `variant="danger"` pada `Dropdown.Item` | ✅ Valid di HeroUI v3 (user confirmed) |

---

## 9. Accessibility Review

### Missing aria-label (Confirmed Browser Warnings)

| Severity | File:Line | Element | Fix |
|----------|-----------|---------|-----|
| **CRITICAL** | `position-table.tsx:123` | `<button onClick>` tree expand | Ganti ke `<Button isIconOnly variant="ghost" size="sm" aria-label={...}>` |
| **CRITICAL** | `settings/page.tsx:19` | `<button onClick>` card | Ganti ke `<Button variant="..." aria-label="Hak Akses & Role">` |

### Non-semantic Clickable Elements

| Severity | File:Line | Element |
|----------|-----------|---------|
| **HIGH** | `positions/[id]/page.tsx:160` | `<span onClick>` child position link |
| **HIGH** | `positions/[id]/page.tsx:189` | `<span onClick>` assigned user link |
| MEDIUM | `role-permission-panel.tsx:136` | `<div onClick>` role selector card |

---

## 10. React & Browser Warning Review

### Confirmed Active Warnings (Reproduced by User)

| # | Warning | File:Line | Severity |
|---|---------|-----------|----------|
| 1 | PressResponder without pressable child | `hierarchy-view.tsx:179` | CRITICAL |
| 2 | Missing aria-label | `position-table.tsx:123` | CRITICAL |
| 3 | Missing aria-label | `settings/page.tsx:19` | CRITICAL |
| 4 | Image width/height aspect ratio | `sidebar.tsx:117-123` | HIGH |

### React Code Issues

| Severity | File:Line | Finding |
|----------|-----------|---------|
| MEDIUM | `use-role-data.ts:38` | `// eslint-disable-line react-hooks/exhaustive-deps` — stale closure risk. `useEffect` dengan `[]` tapi bergantung pada `selectedRole`. |
| MEDIUM | `employee-form.tsx:121` | Empty catch `catch {}` — swallows error silently. |
| LOW | `employee-form.tsx:138` | `useEffect` bergantung pada `form` object. |

---

## 11. Permission & Access Control Audit

### Status Matrix — Non-KPI Pages

| Page | Menu Guard | URL Direct Guard | Button Guard | Notes |
|------|-----------|-----------------|--------------|-------|
| Employee List | ❌ No perm filter | ✅ AuthGuard | ✅ create, read_deleted | Sidebar item selalu visible |
| Employee Detail | N/A | ✅ AuthGuard | ✅ update, delete | ✅ |
| Employee Create | ❌ No perm filter | ❌ No guard | N/A | Bisa akses via URL langsung |
| Employee Edit | ❌ No perm filter | ❌ No guard | N/A | Bisa akses via URL langsung |
| Position List | ❌ No perm filter | ✅ AuthGuard | ✅ create, read_deleted | Sidebar item selalu visible |
| Position Detail | N/A | ✅ AuthGuard | ✅ update, delete, create | ✅ |
| Position Create | ❌ No perm filter | ❌ No guard | N/A | Bisa akses via URL langsung |
| Position Edit | ❌ No perm filter | ❌ No guard | N/A | Bisa akses via URL langsung |
| Settings | ❌ No perm filter | ❌ No guard | ❌ None | Semua user bisa akses |
| Settings / Roles | ✅ `role:read` | ❌ No guard | N/A | Sidebar filter OK, page tidak |

### Detail Temuan

#### 🔴 CRITICAL: Create/Edit Pages — No Page-Level Permission Guard

| Page | Issue |
|------|-------|
| `employees/create/page.tsx` | Tidak ada `employee:create` check. User tanpa permission bisa akses via URL `/hr/employees/create`. Backend akan reject, tapi UI render form dulu sebelum API call — UX buruk + unnecessary network request. |
| `employees/[id]/edit/page.tsx` | Tidak ada `employee:update` check. User bisa akses via URL langsung. |
| `positions/create/page.tsx` | Tidak ada `position:create` check. |
| `positions/[id]/edit/page.tsx` | Tidak ada `position:update` check. |

#### 🟡 HIGH: Sidebar Items — No Permission Filter

| Menu Item | Sidebar `permissions` | Backend: Who Should See |
|-----------|----------------------|------------------------|
| Karyawan | **None** (visible all) | `employee:read` → SUPER_ADMIN, DIRECTOR, HR_ADMIN |
| Struktur Jabatan | **None** (visible all) | `position:read` → SUPER_ADMIN, DIRECTOR, HR_ADMIN, MANAGER |
| Pengaturan | **None** (visible all) | No specific permission |

#### 🟡 HIGH: Settings Pages — No Permission Protection

| Page | Guard |
|------|-------|
| `settings/page.tsx` | Tidak ada `useAuthStore` — semua user bisa akses. |
| `settings/roles/page.tsx` | Sidebar filter (`role:read`) berlaku, tapi tidak ada page-level guard. Direct URL tetap bisa. |

#### ✅ Employee & Position List — Button Guards (GOOD)

Permission coverage pada tombol aksi sudah **sangat baik**:

| Feature | Permission Checked |
|---------|-------------------|
| "Tambah Karyawan" button | `employee:create` ✅ |
| "Terhapus" toggle | `employee:read_deleted` ✅ |
| Detail link in table | `employee:read` ✅ |
| Edit button in table/detail | `employee:update` ✅ |
| Delete button in table/detail | `employee:delete` ✅ |
| Restore button | `employee:restore` ✅ |
| "Tambah Jabatan" button | `position:create` ✅ |
| "Terhapus" toggle | `position:read_deleted` ✅ |
| Detail link in table | `position:read` ✅ |
| Edit action | `position:update` ✅ |
| Delete action | `position:delete` ✅ |
| "Tambah Bawahan" action | `position:create` ✅ |
| Restore action | `position:restore` ✅ |

---

## 12. Security Review

| Severity | Finding | Detail |
|----------|---------|--------|
| **CRITICAL** | Create/Edit pages tanpa guard | 4 halaman bisa diakses via URL langsung oleh user tanpa permission. |
| **HIGH** | Settings pages tanpa guard | `settings/page.tsx` dan `settings/roles/page.tsx` tidak ada page-level permission check. |
| **HIGH** | Sidebar tanpa filter | Employee & Position menu visible ke user tanpa permission terkait. |
| MEDIUM | Token di localStorage | `lib/auth.ts` menyimpan refresh token di `localStorage`. Rentan XSS. Code comment menyebutkan rencana migrasi ke HttpOnly cookies. |
| LOW | Empty catch | `employee-form.tsx:119` — swallows error silently. |
| ✅ | AuthGuard | Redirect ke `/login` jika accessToken tidak ada. |
| ✅ | Axios interceptor | Auto-refresh token pada 401. |
| ✅ | No hardcoded roles | String literal permissions dari `user.permissions` array. |

---

## Production Blocking Issues

### P0 — Harus Diperbaiki Sebelum Production

1. **[CRITICAL] 4 Active Browser Warnings** — PressResponder, missing aria-label (×2), image aspect ratio. Lihat detail di section "Active Browser Warnings".
2. **[CRITICAL] Duplicate hierarchy page** — Hapus `/hr/hierarchy`, rename folder `hierarchy/` → `positions/`.
3. **[CRITICAL] Create/Edit pages tanpa page guard** — Tambahkan `hasPerm` check di 4 halaman (employee create/edit, position create/edit).

### P1 — Sangat Direkomendasikan

4. **[HIGH] Native HTML elements** — 2 native `<button>`, 2 `<span onClick>`, 1 `<div onClick>` yang harus diganti HeroUI.
5. **[HIGH] Sidebar permission filter** — Tambahkan `permissions: ['employee:read']` dan `['position:read']` ke sidebar items.
6. **[HIGH] `<Link>` wraps `<Button>` in `not-found.tsx`** — Full page reload.

### P2 — UX Consistency

7. **[HIGH] Duplicate `DeleteConfirmDialog`** — Extract ke shared component.
8. **[MEDIUM] HeroUI `<Alert>` untuk error state** — 3 file pakai native div.
9. **[MEDIUM] Double padding** — `settings/page.tsx`, `settings/roles/page.tsx`.

---

## Action Plan

### Step 1 — Fix Active Browser Warnings (P0)
```
☐ hierarchy-view.tsx: Fix PressResponder — replace slot="chevron" Button pattern
☐ position-table.tsx:123 — Ganti native <button> dengan HeroUI <Button isIconOnly>
☐ settings/page.tsx:19 — Ganti native <button> dengan HeroUI <Button>
☐ sidebar.tsx:117 — Fix Image aspect ratio (width: "auto")
```

### Step 2 — Architecture Cleanup (P0)
```
☐ Hapus /hr/hierarchy route + page.tsx
☐ Rename modules/hr/hierarchy/ → modules/hr/positions/
☐ Update semua import path yang terdampak
```

### Step 3 — Security & Permission Guards (P0)
```
☐ Tambahkan hasPerm('employee:create') guard di employees/create/page.tsx
☐ Tambahkan hasPerm('employee:update') guard di employees/[id]/edit/page.tsx
☐ Tambahkan hasPerm('position:create') guard di positions/create/page.tsx
☐ Tambahkan hasPerm('position:update') guard di positions/[id]/edit/page.tsx
☐ Tambahkan permission filter ke sidebar items (Karyawan, Struktur Jabatan)
☐ Tambahkan permission guard di settings pages
```

### Step 4 — HeroUI Compliance (P1)
```
☐ Replace all native HTML interactive elements with HeroUI
☐ Fix <Link> wrapping <Button> in not-found.tsx
☐ Fix '—' (em dash) to '-' in positions/[id]/page.tsx
```

### Step 5 — Reusability & Cleanup (P2)
```
☐ Extract shared DeleteConfirmDialog
☐ Extract DateFieldPicker to shared components
☐ Extract findInTree utility
☐ Remove 14 unused shadcn/ui components
☐ Remove deprecated position-form-modal.tsx
☐ Fix double padding in settings pages
```

---

**End of Report**
