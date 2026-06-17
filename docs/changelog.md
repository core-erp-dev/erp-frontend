# Changelog

## 2026-06-18 — Frontend Audit Remediation (All Steps Complete ✅)

### Step 1 — Fix Active Browser Warnings

- `sidebar.tsx:123` — Fix Image aspect ratio: tambah `width: "auto"` ke inline style
- `position-table.tsx:123` — Ganti native `<button>` → `<Button isIconOnly>` + `aria-label`
- `hierarchy-view.tsx:179` — Fix PressResponder: ganti `slot="chevron"` → `<span>` indicator
- `settings/page.tsx:19` — Ganti native `<button>` → `<Button variant="ghost">` + `aria-label`

### Step 2 — Architecture Cleanup

- Hapus `app/(main)/hr/hierarchy/` route (duplikat `/hr/positions`)
- Rename `modules/hr/hierarchy/` → `modules/hr/positions/`
- Update 22+ import paths

### Step 3 — Page-Level Permission Guards

- `employees/create` — `hasPerm('employee:create')` guard + forbidden state
- `employees/[id]/edit` — `hasPerm('employee:update')` guard + forbidden state
- `positions/create` — `hasPerm('position:create')` guard + forbidden state
- `positions/[id]/edit` — `hasPerm('position:update')` guard + forbidden state
- `settings/roles` — `hasPerm('role:read')` guard + forbidden state
- `sidebar.ts` — Tambah `permissions: ['employee:read']`, `['position:read']`

### Step 4 — HeroUI Compliance

- `positions/[id]/page` — 2 native `<button>` → `<Button>` (child positions, assigned users)
- `role-permission-panel` — native `<button>` role card → `<Button>`
- `not-found.tsx` — `<Link><Button>` → `<Button onPress>` (SPA navigation)
- `positions/[id]/page` — 3 em dash `'—'` → `'-'` (convention)

### Step 5 — Reusability & Cleanup

**Shared components extracted:**
- `DeleteConfirmDialog` — merge employee + position → `components/shared/`
- `DateFieldPicker` — extract from `employee-form` → `components/shared/`
- `findInTree` — extract to `modules/hr/shared/utils/`

**Dead code removed:**
- 14 unused shadcn/ui components (`components/ui/`)
- 2 old duplicate delete-confirm-dialogs
- 2 empty barrel files (`shared/utils/index.ts`, `shared/types/index.ts`)

**UX fixes:**
- 4 native error divs → HeroUI `<Alert status="danger">`
- Double padding fixed in settings pages
- Empty catch fixed in `employee-form.tsx`
- `eslint-disable` fixed in `use-role-data.ts`

### Step 6 — Final Verification ✅

All 12 checks passed:
- ✅ 0 native `<button>` in non-KPI code
- ✅ 0 `<span onClick>` / `<div onClick>`
- ✅ 0 em dash `'—'`
- ✅ 0 `eslint-disable`
- ✅ 0 `<Link><Button>` nesting
- ✅ `hasPerm` guards on all create/edit/settings pages
- ✅ Sidebar permissions: employee:read, position:read, role:read
- ✅ Hierarchy route deleted
- ✅ Hierarchy folder renamed to positions
