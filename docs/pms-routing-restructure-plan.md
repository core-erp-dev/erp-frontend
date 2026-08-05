# PMS Frontend — Routing & Navigation Restructure Plan (Revised v2)

> **Status:** Implementation complete  
> **Scope:** Frontend routing, navigation, sidebar, breadcrumbs, module organization

---

## 1. Executive Summary

The current frontend nests all routes under `/hr/...`, treating PMS functionality as an HR sub-module. All code lives under `src/modules/hr/...`. With a PMS-only focus, both the URL prefix and the module wrapper are obsolete.

**This plan:**
- Removes the `/hr/` prefix from every route
- Eliminates `src/modules/hr/` as a directory
- Moves modules to `src/modules/{kpi,organization,settings}`
- Rewrites root `/` as Dashboard inside `(main)/layout.tsx`
- Removes module-based sidebar filtering
- Deletes the obsolete module-selector page

**No legacy redirects** — no production-deployment evidence found (no Dockerfile, nginx, or existing redirects in `next.config.ts`).

---

## 2. Exact Current Route Inventory

### App Router structure — routes that exist today

```
/                                → Module Selector page
/login                           → Login form

(under (main)/hr/)
├── /hr                          → HR Dashboard placeholder
├── /hr/kpi                      → KPI Overview
├── /hr/kpi/corporate            → Corporate KPI
├── /hr/kpi/activities           → Activities
├── /hr/kpi/reports              → Reports
├── /hr/kpi/approvals            → Approvals
├── /hr/organization/employees   → Employee list
├── /hr/organization/employees/create → Create Employee
├── /hr/organization/employees/[id]   → Employee detail
├── /hr/organization/employees/[id]/edit → Edit Employee
├── /hr/organization/positions   → Position Structure
├── /hr/organization/positions/create → Create Position
├── /hr/organization/positions/[id]   → Position detail
├── /hr/organization/positions/[id]/edit → Edit Position
├── /hr/settings                 → Settings hub
├── /hr/settings/roles           → Roles list
├── /hr/settings/roles/create    → Create Role
├── /hr/settings/roles/[id]      → Role detail
└── /hr/settings/roles/[id]/edit → Edit Role
```

### Internal page-folder layout (current)

```
src/app/
├── (auth)/login/page.tsx
├── (main)/
│   ├── layout.tsx              ← MainLayout (Sidebar + Header + AuthGuard)
│   ├── error.tsx
│   ├── hr/
│   │   ├── page.tsx            ← HR Dashboard placeholder
│   │   ├── kpi/
│   │   │   ├── page.tsx
│   │   │   ├── corporate/page.tsx
│   │   │   ├── activities/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── approvals/page.tsx
│   │   ├── organization/
│   │   │   ├── employees/...
│   │   │   └── positions/...
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── roles/...
├── page.tsx                     ← Module selector (also resolves to `/`)
├── not-found.tsx
├── layout.tsx
└── error.tsx
```

**Important:** `src/app/page.tsx` and any page under `src/app/(main)/` both resolve to `/` — the route group `(main)` does not add a URL segment. They conflict and cannot coexist. Currently `src/app/page.tsx` wins (the module selector), and nothing is directly inside `(main)/page.tsx`.

---

## 3. Exact Current `src/modules/hr` Inventory

```
src/modules/hr/
├── sidebar.ts
├── kpi/
│   ├── constants.ts
│   ├── sidebar.ts
│   ├── overview/
│   │   ├── overview-section.tsx
│   │   └── use-overview-data.ts
│   ├── corporate/             (8 files + 5 test files)
│   ├── activity/              (14 files + 2 test files)
│   ├── report/                (9 files + 2 test files)
│   └── __tests__/             (3 files)
├── organization/
│   ├── shared/utils/
│   │   ├── find-in-tree.ts
│   │   └── flatten-positions.ts
│   ├── employees/             (7 files)
│   └── positions/             (7 files)
└── settings/                  (7 files)
```

---

## 4. Final Target Route Tree

```
/                          Dashboard (wrapped by MainLayout)

/kpi                       KPI Overview
/kpi/corporate             Corporate KPI
/kpi/activities            Activities
/kpi/reports               Reports
/kpi/approvals             Approvals

/organization/employees             Employee list
/organization/employees/create      Create Employee
/organization/employees/[id]        Employee detail
/organization/employees/[id]/edit   Edit Employee
/organization/positions             Position Structure
/organization/positions/create      Create Position
/organization/positions/[id]        Position detail
/organization/positions/[id]/edit   Edit Position

/settings                  Settings hub
/settings/roles            Roles list
/settings/roles/create     Create Role
/settings/roles/[id]       Role detail
/settings/roles/[id]/edit  Edit Role

/login                     Login (unchanged)
```

### Root route resolution

`src/app/page.tsx` is **deleted**. `src/app/(main)/page.tsx` becomes the **Dashboard** — because `(main)` is a route group (no URL segment), the page resolves to `/` and inherits the MainLayout wrapper from `(main)/layout.tsx`. This eliminates the conflict between two files resolving to `/`.

The Dashboard renders a reusable component from `src/modules/kpi/overview/` (e.g. a KPI overview or dashboard-specific module component). It does **not** import `src/app/(main)/kpi/page.tsx`.

---

## 5. Final Target `src/modules` Tree

```
src/modules/
├── kpi/
│   ├── constants.ts
│   ├── sidebar.ts
│   ├── overview/
│   ├── corporate/
│   ├── activity/
│   ├── report/
│   └── __tests__/
├── organization/
│   ├── shared/utils/
│   │   ├── find-in-tree.ts
│   │   └── flatten-positions.ts
│   ├── employees/
│   └── positions/
└── settings/
    ├── components/
    ├── hooks/
    ├── services/
    └── types.ts
```

---

## 6. Route Migration Matrix

| Current Route | Proposed Route | Action |
|---|---|---|
| `/` | `/` | **Replace**: module selector `page.tsx` deleted → Dashboard at `(main)/page.tsx` |
| `/login` | `/login` | **Keep** |
| `/hr` | — | **Remove** entire directory |
| `/hr/kpi` | `/kpi` | **Move** (git mv directory) |
| `/hr/kpi/corporate` | `/kpi/corporate` | **Move** |
| `/hr/kpi/activities` | `/kpi/activities` | **Move** |
| `/hr/kpi/reports` | `/kpi/reports` | **Move** |
| `/hr/kpi/approvals` | `/kpi/approvals` | **Move** |
| `/hr/organization/employees` | `/organization/employees` | **Move** |
| `/hr/organization/employees/create` | `/organization/employees/create` | **Move** |
| `/hr/organization/employees/[id]` | `/organization/employees/[id]` | **Move** |
| `/hr/organization/employees/[id]/edit` | `/organization/employees/[id]/edit` | **Move** |
| `/hr/organization/positions` | `/organization/positions` | **Move** |
| `/hr/organization/positions/create` | `/organization/positions/create` | **Move** |
| `/hr/organization/positions/[id]` | `/organization/positions/[id]` | **Move** |
| `/hr/organization/positions/[id]/edit` | `/organization/positions/[id]/edit` | **Move** |
| `/hr/settings` | `/settings` | **Move** |
| `/hr/settings/roles` | `/settings/roles` | **Move** |
| `/hr/settings/roles/create` | `/settings/roles/create` | **Move** |
| `/hr/settings/roles/[id]` | `/settings/roles/[id]` | **Move** |
| `/hr/settings/roles/[id]/edit` | `/settings/roles/[id]/edit` | **Move** |

---

## 7. Module-Folder Migration Matrix

All files under `src/modules/hr/` move to one of three top-level domain directories:

| Source | Destination |
|---|---|
| `src/modules/hr/kpi/` | `src/modules/kpi/` |
| `src/modules/hr/organization/` | `src/modules/organization/` |
| `src/modules/hr/settings/` | `src/modules/settings/` |

After moving, `src/modules/hr/` must be deleted.

**Cross-module imports to update** (8 files):

| File | Current import | New import |
|---|---|---|
| `src/modules/organization/positions/services/organization-api.ts` | `@/modules/hr/organization/employees/types` | `@/modules/organization/employees/types` |
| `src/modules/organization/employees/hooks/use-employee-data.ts` | `@/modules/hr/organization/positions/...` (2 imports) | `@/modules/organization/positions/...` |
| `src/modules/organization/positions/hooks/use-position-form-data.ts` | `@/modules/hr/settings/...` + `@/modules/hr/org/employees/types` | `@/modules/settings/...` + `@/modules/organization/employees/types` |
| `src/modules/organization/positions/hooks/use-position-detail.ts` | `@/modules/hr/organization/shared/...` | `@/modules/organization/shared/...` |
| `src/modules/organization/positions/components/position-form.tsx` | `@/modules/hr/organization/...` (3 imports) | `@/modules/organization/...` |
| `src/modules/organization/employees/components/assign-user-modal.tsx` | `@/modules/hr/organization/positions/types` | `@/modules/organization/positions/types` |
| `src/modules/organization/employees/hooks/use-employee-data.ts` | `@/modules/hr/organization/positions/...` | `@/modules/organization/positions/...` |

---

## 8. Sidebar Grouping Changes

### Current Behavior

`src/components/layout/sidebar.tsx` currently:
1. Derives `activeModule` from `pathname.split("/").filter(Boolean)[0]`
2. Filters sidebar items with `item.module !== activeModule`
3. Renders module label from `moduleLabels: {hr: "HR", finance: "FIN", inventory: "INV"}`
4. Shows a "Switch Module" button → `/`

### Required Changes

| Component | Change |
|---|---|
| **`activeModule` derivation** | **Remove** — no multi-module filtering needed |
| **`item.module` check** | **Remove** — all items always visible (subject to permission filtering, which stays) |
| **`moduleLabels` map** | **Remove** entirely |
| **"Switch Module" button** | **Remove** — no other modules to switch to |
| **Sidebar groups** | Keep `group`-based grouping: `KPI`, `ORGANIZATION`, `SETTINGS` (pinned bottom) |

### Updated Sidebar Item Definitions

All `module:` field removed. `href` values change from `/hr/...` to `/...`:

```
No module label displayed (logo only)

KPI
├── Overview          → /kpi
├── Corporate KPI     → /kpi/corporate
├── Activities        → /kpi/activities
├── Reports           → /kpi/reports
└── Approvals         → /kpi/approvals

ORGANIZATION
├── Employees         → /organization/employees
└── Position Structure → /organization/positions

SETTINGS
├── Access Control & Roles → /settings/roles
└── Settings               → /settings
```

### File changes for sidebar

| File | Action |
|---|---|
| `src/config/sidebar.ts` | Delete — aggregator no longer needed |
| `src/modules/hr/sidebar.ts` | Delete — items redistributed |
| `src/modules/hr/kpi/sidebar.ts` | Move to `src/modules/kpi/sidebar.ts`; update hrefs, remove `module: 'hr'` |
| `src/components/layout/sidebar.tsx` | Remove `activeModule`, `moduleLabels`, `item.module` filter, "Switch Module" button; import items directly |

---

## 9. Breadcrumb and Hardcoded-Link Changes

### Breadcrumb Pattern Updates

| Current Breadcrumb | After Change |
|---|---|
| `Home > HR > Employees` | `Home > Organization > Employees` |
| `Home > HR > Position Structure` | `Home > Organization > Positions` |
| `Home > HR > Access Control & Roles` | `Home > Settings > Access Control & Roles` |
| `Home > HR > Employees > {name}` | `Home > Organization > Employees > {name}` |
| `Home > HR > Positions > ...` | `Home > Organization > Positions > ...` |
| `Home > HR > Access Control & Roles > {name}` | `Home > Settings > Access Control & Roles > {name}` |

### Files with Hardcoded Breadcrumbs (10 files)

| File | Lines with `/hr` in breadcrumbs |
|---|---|
| `src/app/(main)/hr/organization/employees/page.tsx` | 2 (`HR`, `Employees`) |
| `src/app/(main)/hr/organization/employees/[id]/page.tsx` | 3 (`HR`, `Employees`, `{name}`) |
| `src/modules/hr/organization/employees/components/employee-form.tsx` | 3 (`HR`, `Employees`, `Add/Edit`) |
| `src/app/(main)/hr/organization/positions/page.tsx` | 2 (`HR`, `Position Structure`) |
| `src/app/(main)/hr/organization/positions/[id]/page.tsx` | 3 (`HR`, `Position Structure`, `{name}`) |
| `src/modules/hr/organization/positions/components/position-form.tsx` | 3 (`HR`, `Positions`, `Add/Edit`) |
| `src/app/(main)/hr/settings/roles/page.tsx` | 1 (`HR`) |
| `src/app/(main)/hr/settings/roles/[id]/page.tsx` | 3 (`HR`, `Access Control & Roles`, `{name}`) |
| `src/modules/hr/settings/components/role-form.tsx` | 3 (`HR`, `Access Control & Roles`, `Create/Edit`) |

### Files with `router.push('/hr/...')` (11 calls, 11 files)

| File | Current target |
|---|---|
| `src/app/(main)/hr/organization/employees/page.tsx` | `/hr/organization/employees/create` |
| `src/app/(main)/hr/organization/employees/[id]/page.tsx` | `/hr/organization/employees`, `/hr/organization/employees/${id}/edit` |
| `src/app/(main)/hr/organization/employees/create/page.tsx` | `/hr/organization/employees` |
| `src/app/(main)/hr/organization/positions/page.tsx` | `/hr/organization/positions/create` |
| `src/app/(main)/hr/organization/positions/[id]/page.tsx` | `/hr/organization/positions`, `/hr/organization/positions/${id}/edit`, `/hr/organization/positions/create?parentId=` |
| `src/app/(main)/hr/organization/positions/create/page.tsx` | `/hr/organization/positions` |
| `src/app/(main)/hr/organization/positions/[id]/edit/page.tsx` | `/hr/organization/positions` |
| `src/app/(main)/hr/settings/page.tsx` | `/hr/settings/roles` |
| `src/app/(main)/hr/settings/roles/page.tsx` | `/hr/settings/roles/create` |
| `src/app/(main)/hr/settings/roles/[id]/page.tsx` | `/hr/settings/roles`, `/hr/settings/roles/${id}/edit` |
| `src/app/(main)/hr/settings/roles/create/page.tsx` | `/hr/settings/roles` |

### Files with `<Link href="/hr/...">` (3 files, 5 template-literals + breadcrumb `href` attributes)

| File | Occurrences |
|---|---|
| `src/modules/hr/organization/positions/components/position-table.tsx` | 5 (3 `router.push`, 2 `<Link href`) |
| `src/modules/hr/organization/employees/components/data-table.tsx` | 3 (all `<Link href`) |
| `src/modules/hr/settings/components/role-table.tsx` | 2 (all `<Link href`) |

### Files with `KPI_ROUTES` references (4 files)

| File | Usage |
|---|---|
| `src/modules/hr/kpi/constants.ts` | Defines 5 paths |
| `src/modules/hr/kpi/sidebar.ts` | Uses 5 `KPI_ROUTES.*` values as href |
| `src/app/(main)/hr/kpi/page.tsx` | Uses 4 `KPI_ROUTES.*` values in footer links |
| `src/modules/hr/kpi/__tests__/sidebar.test.ts` | Asserts 5 paths, 4 negative paths, route prefix |

---

## 10. Redirect Strategy

**No legacy redirects required.**

Evidence:
- `next.config.ts` contains zero `redirects()`
- No deployment config (Dockerfile, nginx, docker-compose) found
- No evidence of production deployment in project files

Old `/hr/*` routes simply 404 after the move. This is acceptable.

---

## 11. Confirmed Affected-File Inventory

### Confirmed affected (must be moved and/or have route references updated)

**App router pages to move (19 files):**

| # | Source | Destination | Additional changes |
|---|---|---|---|
| 1 | `src/app/page.tsx` | **Delete** | Module selector removed; replaced by `(main)/page.tsx` |
| 2 | `src/app/(main)/hr/page.tsx` | **Delete** | HR Dashboard obsolete |
| 3 | `src/app/(main)/hr/kpi/` | `src/app/(main)/kpi/` | git mv the entire directory (5 page files) |
| 4 | `src/app/(main)/hr/organization/employees/` | `src/app/(main)/organization/employees/` | git mv (4 page files) |
| 5 | `src/app/(main)/hr/organization/positions/` | `src/app/(main)/organization/positions/` | git mv (4 page files) |
| 6 | `src/app/(main)/hr/settings/page.tsx` | `src/app/(main)/settings/page.tsx` | + update router.push |
| 7 | `src/app/(main)/hr/settings/roles/` | `src/app/(main)/settings/roles/` | git mv (4 page files) |
| 8 | `src/app/(main)/page.tsx` | **Create** | Dashboard at `/` — renders module component |

**Module files to move (entire `src/modules/hr`):**

| # | Source | Destination |
|---|---|---|
| 9 | `src/modules/hr/kpi/` | `src/modules/kpi/` |
| 10 | `src/modules/hr/organization/` | `src/modules/organization/` |
| 11 | `src/modules/hr/settings/` | `src/modules/settings/` |
| 12 | `src/modules/hr/` | **Delete** after move |

**Sidebar and config files to update (4 files):**

| # | File | Action |
|---|---|---|
| 13 | `src/config/sidebar.ts` | Delete |
| 14 | `src/modules/hr/sidebar.ts` | Delete |
| 15 | `src/modules/kpi/sidebar.ts` | (moved) update hrefs, remove `module` field |
| 16 | `src/components/layout/sidebar.tsx` | Remove module filtering, moduleLabels, Switch Module button |

**Files with cross-module imports to update (8 files):**

| # | File |
|---|---|
| 17 | `src/modules/organization/positions/services/organization-api.ts` |
| 18 | `src/modules/organization/employees/hooks/use-employee-data.ts` |
| 19 | `src/modules/organization/positions/hooks/use-position-form-data.ts` |
| 20 | `src/modules/organization/positions/hooks/use-position-detail.ts` |
| 21 | `src/modules/organization/positions/components/position-form.tsx` |
| 22 | `src/modules/organization/positions/components/position-table.tsx` |
| 23 | `src/modules/organization/employees/components/data-table.tsx` |
| 24 | `src/modules/organization/employees/components/assign-user-modal.tsx` |

**Total confirmed affected: 24 groups** (covering ~50 individual files counting each sub-file under moved directories).

### Test files to update (8 test files)

| # | File | Change |
|---|---|---|
| T1 | `src/modules/kpi/__tests__/sidebar.test.ts` | Update assertion paths from `/hr/kpi` → `/kpi`; remove `module: 'hr'` assertions; update negative assertions |
| T2 | `src/modules/kpi/__tests__/page-shells.test.tsx` | Update import paths from `@/app/(main)/hr/kpi/...` to `@/app/(main)/kpi/...` |
| T3 | `src/modules/kpi/__tests__/overview-page.test.tsx` | Update import/jest.mock paths |
| T4 | `src/modules/kpi/corporate/__tests__/corporate-kpi-page.test.tsx` | Update import path |
| T5 | `src/modules/kpi/report/__tests__/report-page.test.tsx` | Update import/jest.mock paths |
| T6 | `src/modules/kpi/activity/__tests__/activity-page.test.tsx` | Update jest.mock path |
| T7 | `src/modules/kpi/activity/__tests__/activity-api.test.ts` | Update import path |
| T8 | `src/modules/kpi/report/__tests__/report-api.test.ts` | Update import path |

### Unrelated files (no changes needed)

- `src/app/layout.tsx` — metadata not in scope
- `src/app/not-found.tsx` — route-agnostic
- `src/app/error.tsx` — route-agnostic
- `src/app/(main)/error.tsx` — route-agnostic
- `src/app/(main)/layout.tsx` — wrapping logic unchanged
- `src/components/layout/main-layout.tsx` — wrapping logic unchanged
- `src/components/layout/auth-guard.tsx` — unchanged
- `src/components/layout/header.tsx` — `/profile` dead link is out of scope
- `src/lib/*`, `src/hooks/*`, `src/store/*`, `src/types/*`, `src/constants/*` — no route references
- `src/components/shared/*` — route-agnostic

---

## 12. Minimal Ordered Implementation Steps

### Phase 1: Route constants and module prep (no visible change)

1. **Update `src/modules/kpi/constants.ts`** — change `KPI_ROUTES` values to `/kpi/...`

### Phase 2: Move app router pages

2. **Move KPI pages:**
   ```bash
   git mv src/app/(main)/hr/kpi src/app/(main)/kpi
   ```

3. **Move Organization pages:**
   ```bash
   mkdir -p src/app/(main)/organization
   git mv src/app/(main)/hr/organization/employees src/app/(main)/organization/employees
   git mv src/app/(main)/hr/organization/positions src/app/(main)/organization/positions
   ```

4. **Move Settings pages:**
   ```bash
   mkdir -p src/app/(main)/settings
   git mv src/app/(main)/hr/settings/roles src/app/(main)/settings/roles
   git mv src/app/(main)/hr/settings/page.tsx src/app/(main)/settings/page.tsx
   ```

5. **Delete obsolete:**
   ```bash
   rm -rf src/app/(main)/hr
   ```

### Phase 3: Root Dashboard

6. **Delete** `src/app/page.tsx` (module selector)

7. **Create** `src/app/(main)/page.tsx` — renders a reusable component from `src/modules/kpi/overview/` (e.g. a dashboard or overview component). Does NOT import another `page.tsx`.

### Phase 4: Update breadcrumbs and hardcoded links

8. Update breadcrumbs in all 10 affected files (Section 9)
9. Update `router.push('/hr/...')` → `router.push('/...')` in all 11 affected files
10. Update `<Link href="/hr/...">` in 3 affected component files

### Phase 5: Move `src/modules/hr` to domain modules

11. ```bash
    git mv src/modules/hr/kpi src/modules/kpi
    mkdir -p src/modules/organization
    git mv src/modules/hr/organization/employees src/modules/organization/employees
    git mv src/modules/hr/organization/positions src/modules/organization/positions
    git mv src/modules/hr/organization/shared src/modules/organization/shared
    mkdir -p src/modules/settings
    git mv src/modules/hr/settings/* src/modules/settings/
    rm -rf src/modules/hr
    ```

12. Update the 8 cross-module import paths (Section 7)

### Phase 6: Fix sidebar

13. **Delete** `src/config/sidebar.ts`
14. **Delete** `src/modules/hr/kpi/sidebar.ts` old location (already moved in Phase 5)
15. **Update** `src/modules/kpi/sidebar.ts` — remove `module: 'hr'` from all items, update hrefs to `/kpi/...`
16. **Update** `src/components/layout/sidebar.tsx` — remove `activeModule`, `moduleLabels`, `item.module` filtering, "Switch Module" button; update config import

### Phase 7: Update tests

17. Update all 8 test files (Section 11, T1–T8)

### Phase 8: Verification

18. `npx tsc --noEmit` — fix import errors
19. `npm run build` — verify no broken routes
20. `npm test` — verify all assertions pass

---

## 13. Unresolved Decisions

None. All routing decisions are resolved by this plan.

| Previous question | Resolution |
|---|---|
| Root route: `/dashboard` vs `/` | Root `/` in `(main)/page.tsx` — confirmed per decision #3 |
| Root Dashboard implementation | Reusable component from `src/modules/kpi/overview/`, not `import` from another `page.tsx` |
| `/profile` page | Out of scope — header dead link documented but not fixed |
| Legacy redirects | Not required — no deployment evidence found |
| Sidebar module concept | Removed — no replacement |

---

## Appendix A: Exact Counts (from `rg` search)

| Pattern | Exact count | Scope |
|---|---|---|
| `'@/modules/hr` import references | **107** | Across 34 source and test files (includes `from` + `jest.mock`) |
| `'/hr/` route string literals | **34** | Across 14 files (sidebar config, KPI_ROUTES, router.push, breadcrumbs, test assertions) |
| `router.push('/hr/...')` | **11** | Across 11 page files |
| `href.*'/hr/'` | **8** | Sidebar config + test assertions only |
| `jest.mock('@/modules/hr/...')` | **15** | Across 5 test files |

### Breakdown of the 34 route string literals

| Category | Count |
|---|---|
| `src/modules/hr/kpi/constants.ts` (KPI_ROUTES values) | 5 |
| `src/modules/hr/sidebar.ts` (sidebar item hrefs) | 4 |
| Page `router.push('/hr/...')` calls | 11 |
| `src/modules/hr/kpi/__tests__/sidebar.test.ts` (assertions + negative assertions) | 14 |

### Breakdown of the 107 `@/modules/hr` imports

| Category | Count |
|---|---|
| `from '@/modules/hr/...'` in source files | 92 |
| `jest.mock('@/modules/hr/...')` in test files | 15 |

---

## Appendix B: Target App Folder Structure

```
src/app/
├── (auth)/
│   └── login/page.tsx              ← unchanged
├── (main)/                         ← route group — wraps in MainLayout
│   ├── layout.tsx                  ← unchanged
│   ├── page.tsx                    ← NEW: Dashboard at `/`
│   ├── error.tsx                   ← unchanged
│   ├── kpi/
│   │   ├── page.tsx                ← moved from hr/kpi/page.tsx
│   │   ├── corporate/page.tsx      ← moved
│   │   ├── activities/page.tsx     ← moved
│   │   ├── reports/page.tsx        ← moved
│   │   └── approvals/page.tsx      ← moved
│   ├── organization/
│   │   ├── employees/
│   │   └── positions/
│   └── settings/
│       ├── page.tsx                ← moved from hr/settings/page.tsx
│       └── roles/
├── layout.tsx                      ← unchanged
├── not-found.tsx                   ← unchanged
└── error.tsx                       ← unchanged
```

Key differences from the old structure:
- `src/app/page.tsx` **deleted** (no module selector)
- `src/app/(main)/page.tsx` **created** (Dashboard, wrapped by MainLayout)
- `src/app/(main)/hr/` **deleted** entirely
- No flat `src/app/page.tsx` outside `(main)` — all pages route through the shared MainLayout
