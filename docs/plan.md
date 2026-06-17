# PLAN: Frontend Audit Remediation

## Step 1 — Fix Active Browser Warnings ✅

- [x] `hierarchy-view.tsx:179` — Fix PressResponder: ganti Button `slot="chevron"` dengan `<span>` indicator (tree row handles click)
- [x] `position-table.tsx:123` — Ganti native `<button>` tree expand dengan `<Button isIconOnly variant="ghost" size="sm" aria-label={...}>`
- [x] `settings/page.tsx:19` — Ganti native `<button>` settings card dengan `<Button variant="ghost" aria-label="...">`
- [x] `sidebar.tsx:117-123` — Fix Image aspect ratio: tambah `width: "auto"` ke inline style

## Step 2 — Architecture Cleanup ✅

- [x] Hapus `/hr/hierarchy` route: delete `app/(main)/hr/hierarchy/page.tsx`
- [x] Rename folder `modules/hr/hierarchy/` → `modules/hr/positions/`
- [x] Update semua import path yang terdampak (22 files)

## Step 3 — Page-Level Permission Guards

- [ ] `employees/create/page.tsx` — Tambah `hasPerm('employee:create')` guard; redirect atau tampilkan forbidden jika tidak punya
- [ ] `employees/[id]/edit/page.tsx` — Tambah `hasPerm('employee:update')` guard
- [ ] `positions/create/page.tsx` — Tambah `hasPerm('position:create')` guard
- [ ] `positions/[id]/edit/page.tsx` — Tambah `hasPerm('position:update')` guard
- [ ] `sidebar.ts` — Tambah `permissions: ['employee:read']` ke item Karyawan
- [ ] `sidebar.ts` — Tambah `permissions: ['position:read']` ke item Struktur Jabatan
- [ ] `settings/page.tsx` — Tambah permission check
- [ ] `settings/roles/page.tsx` — Tambah `hasPerm('role:read')` page-level guard

## Step 4 — HeroUI Compliance

- [ ] `positions/[id]/page.tsx:160` — Ganti `<span onClick>` child position link dengan `<Button>` atau `<Link>`
- [ ] `positions/[id]/page.tsx:189` — Ganti `<span onClick>` assigned user link dengan `<Button>` atau `<Link>`
- [ ] `role-permission-panel.tsx:136` — Ganti `<div onClick>` role card dengan `<Card isPressable>` atau `<Button>`
- [ ] `not-found.tsx:15` — Fix `<Link><Button>` menjadi `<Button onPress={() => router.push('/')}>`
- [ ] `positions/[id]/page.tsx:143,196` — Ganti `'—'` (em dash) jadi `'-'`

## Step 5 — Reusability & Cleanup

- [ ] Extract shared `DeleteConfirmDialog` — merge `employees/` dan `positions/` versi ke `components/shared/`
- [ ] Extract `DateFieldPicker` dari `employee-form.tsx` ke `components/shared/date-field-picker.tsx`
- [ ] Extract `findInTree` utility ke `modules/hr/shared/utils/`
- [ ] Hapus 14 unused shadcn/ui components di `src/components/ui/`
- [ ] Hapus deprecated `position-form-modal.tsx`
- [ ] Fix double padding: `settings/page.tsx` dan `settings/roles/page.tsx` — ganti `p-6` jadi `gap-6`
- [ ] `positions/[id]/page.tsx:67`, `employees/[id]/edit/page.tsx:44`, `positions/[id]/edit/page.tsx:45` — Ganti native error div dengan `<Alert status="danger">`
- [ ] `employee-form.tsx:119` — Ganti empty catch dengan minimal console error atau toast
- [ ] `use-role-data.ts:38` — Fix eslint-disable, perbaiki dependency array
