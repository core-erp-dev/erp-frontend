# P1 — Corporate KPI Frontend Implementation Plan

**Date:** 2026-07-23
**Status:** Ready for review
**Author:** Planning agent (source-inspected)

---

## 1. Objective and Boundaries

### Objective

Build a fully functional `/hr/kpi/corporate` page that manages the Corporate KPI hierarchy connected to the real backend.

### P1 Scope

| Included | Excluded |
|---|---|
| `/hr/kpi/corporate` tree view | Activity frontend (P2) |
| Create ASPECT (root) node | Report frontend (P3) |
| Create INDICATOR (leaf) under ASPECT | Approval/change-request frontend |
| Update node fields (code, name, unit, targetValue, description) | Main-dashboard KPI widgets |
| Change node status (DRAFT → ACTIVE → INACTIVE) | KPI Overview metrics page |
| Soft delete node | Multipart upload / evidence |
| Restore soft-deleted node | Drag-and-drop hierarchy |
| Year filtering | Batch import/export |
| Permission-aware UI (PBAC) | Analytics, score formulas, weighting, remuneration |
| Automated tests (Jest) | Backend changes |
| | Organization changes |
| | New UI/state-management library |

### Critical discovery: hierarchy is 2-level, not 3-level

The user's task description mentions a 3-level hierarchy (Perspective → Objective → Indicator). **The actual backend implements only 2 levels:**

```
ASPECT (root — no parent, no unit/targetValue)
└─ INDICATOR (leaf — must have ASPECT parent, must have unit + targetValue > 0)
```

This is confirmed by `KpiNodeType.java`, `CorporateKpiServiceImpl.java`, and `V6__corporate_kpi.sql` DB constraints. The plan follows the **actual backend contract**, not the task description's hierarchy naming.

---

## 2. Inspected Backend Sources

| File | Purpose |
|---|---|
| `kpi/controller/CorporateKpiController.java` | All endpoints, permissions, HTTP methods |
| `kpi/dto/request/CreateCorporateKpiRequest.java` | Create DTO fields + validation |
| `kpi/dto/request/UpdateCorporateKpiRequest.java` | Update DTO fields + validation |
| `kpi/dto/request/ChangeKpiStatusRequest.java` | Status change DTO |
| `kpi/dto/response/CorporateKpiResponse.java` | Response DTO + recursive `children` |
| `kpi/entity/CorporateKpi.java` | JPA entity — fields, soft-delete, default status |
| `kpi/entity/KpiNodeType.java` | Enum: `ASPECT`, `INDICATOR` |
| `kpi/entity/KpiStatus.java` | Enum: `DRAFT`, `ACTIVE`, `INACTIVE` |
| `kpi/service/CorporateKpiService.java` | Service interface |
| `kpi/service/CorporateKpiServiceImpl.java` | All business rules, validations, lifecycle constraints |
| `kpi/repository/CorporateKpiRepository.java` | Queries, uniqueness, active-children check |
| `common/constant/Permissions.java` | 6 Corporate KPI permission codes |
| `common/constant/MessageConstants.java` | All KPI success/error messages |
| `common/exception/GlobalExceptionHandler.java` | ProblemDetail (RFC 7807) error format |
| `common/response/ApiResponse.java` | Success wrapper `{status, message, data, timestamp}` |
| `db/migration/V6__corporate_kpi.sql` | Table DDL, CHECK constraints, filtered unique index, permission inserts |

---

## 3. Endpoint / Permission Matrix

Base path: `/api/v1/corporate-kpis`

| # | Method | Path | Permission | Request DTO | Response DTO | Status | Hierarchy/Status Change? |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/tree?year={year}` | `corporate_kpi:read` | `year` (query, Integer, required) | `List<CorporateKpiResponse>` (nested tree) | 200 | No |
| 2 | GET | `/{id}` | `corporate_kpi:read` | `id` (path, UUID) | `CorporateKpiResponse` (flat, children=[]) | 200 | No |
| 3 | GET | `/deleted` | `corporate_kpi:read_deleted` | — | `List<CorporateKpiResponse>` (flat) | 200 | No |
| 4 | POST | `` (root) | `corporate_kpi:create` | `CreateCorporateKpiRequest` | `CorporateKpiResponse` | 201 | Yes — creates node |
| 5 | PUT | `/{id}` | `corporate_kpi:update` | `UpdateCorporateKpiRequest` | `CorporateKpiResponse` | 200 | Can change parentId |
| 6 | PATCH | `/{id}/status` | `corporate_kpi:update` | `ChangeKpiStatusRequest` | `CorporateKpiResponse` | 200 | Yes — status change |
| 7 | PATCH | `/{id}/delete` | `corporate_kpi:delete` | — | `Void` (no data) | 200 | Yes — soft delete |
| 8 | POST | `/{id}/restore` | `corporate_kpi:restore` | — | `CorporateKpiResponse` | 200 | Yes — un-delete |

### All 8 operations are supported in P1.

No operation is `NOT SUPPORTED IN P1`.

---

## 4. Confirmed DTO and Enum Contracts

### `CreateCorporateKpiRequest`

```json
{
  "code": "string (required, max 50)",
  "name": "string (required, max 255)",
  "nodeType": "ASPECT | INDICATOR (required)",
  "year": "integer (required, 2000–2100)",
  "parentId": "UUID (required if nodeType=INDICATOR, must be null if nodeType=ASPECT)",
  "unit": "string (max 50, required if nodeType=INDICATOR)",
  "targetValue": "BigDecimal (positive, required if nodeType=INDICATOR)",
  "description": "string (optional)"
}
```

### `UpdateCorporateKpiRequest` (full PUT — all fields submitted)

```json
{
  "code": "string (required, max 50)",
  "name": "string (required, max 255)",
  "unit": "string (max 50, nullable)",
  "targetValue": "BigDecimal (positive, nullable)",
  "description": "string (nullable)",
  "parentId": "UUID (nullable — null for ASPECT, required for INDICATOR)"
}
```

**Note:** `nodeType` and `year` are NOT in the update DTO — they are immutable after creation.

### `ChangeKpiStatusRequest`

```json
{
  "status": "DRAFT | ACTIVE | INACTIVE (required)"
}
```

### `CorporateKpiResponse`

```json
{
  "id": "UUID",
  "parentId": "UUID | null",
  "parentName": "string | null",
  "code": "string",
  "name": "string",
  "nodeType": "ASPECT | INDICATOR",
  "year": "integer",
  "unit": "string | null",
  "targetValue": "BigDecimal | null",
  "status": "DRAFT | ACTIVE | INACTIVE",
  "description": "string | null",
  "deletedAt": "timestamp | null",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "children": "CorporateKpiResponse[] (nested in tree, empty in detail)"
}
```

### Enums

| Enum | Values | Notes |
|---|---|---|
| `KpiNodeType` | `ASPECT`, `INDICATOR` | ASPECT = root; INDICATOR = leaf with parent |
| `KpiStatus` | `DRAFT`, `ACTIVE`, `INACTIVE` | Default = `DRAFT` on create. Independent of soft-delete. |

### Backend Business Rules (from `CorporateKpiServiceImpl`)

| Rule | Condition | Error |
|---|---|---|
| Code uniqueness | Case-insensitive, per year, non-deleted rows | `KPI_CODE_EXISTS` |
| INDICATOR requires parent | `nodeType=INDICATOR` → `parentId` must be non-null ASPECT | `KPI_INDICATOR_REQUIRES_ASPECT_PARENT` |
| ASPECT must be root | `nodeType=ASPECT` → `parentId` must be null | `KPI_ASPECT_NO_TARGET` (create) / `KPI_ASPECT_MUST_BE_ROOT` (update) |
| Same-year parent-child | Parent and child must share the same year | `KPI_PARENT_YEAR_MISMATCH` |
| INDICATOR → ACTIVE requires ACTIVE parent | Parent ASPECT must be `ACTIVE` | `KPI_PARENT_MUST_BE_ACTIVE` |
| ASPECT cannot deactivate with active children | ASPECT has ACTIVE INDICATOR children → cannot set DRAFT/INACTIVE | `KPI_ASPECT_HAS_ACTIVE_CHILDREN` |
| Safe delete | Node must have 0 non-deleted children | `KPI_HAS_CHILDREN` |
| Restore code guard | Restored code must not conflict with existing non-deleted | `KPI_CODE_EXISTS` |
| Restore parent guard | If parent exists, must be non-deleted ASPECT, same year | `KPI_PARENT_DELETED` |

---

## 5. Chosen UX Design

### Selected: Option B — Expandable Hierarchical Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│  KPI Korporat            [Year ▼ 2026]     [Filter] [Search] [Tambah]   │
├──────────┬──────────────────┬────────┬──────┬────────┬──────┬───────────┤
│  Kode    │ Nama             │ Tipe   │ Tahun│ Unit   │ Status│ Aksi      │
├──────────┼──────────────────┼────────┼──────┼────────┼──────┼───────────┤
│ ▼ FIN    │ Financial        │ ASPECT │ 2026 │   -    │ACTIVE│ ⋮         │
│   ▼ F01  │ Revenue Growth   │ INDI.. │ 2026 │  %     │ACTIVE│ ⋮         │
│   ► F02  │ Cost Reduction   │ INDI.. │ 2026 │ Rp     │DRAFT │ ⋮         │
│ ► CUST   │ Customer         │ ASPECT │ 2026 │   -    │DRAFT │ ⋮         │
└──────────┴──────────────────┴────────┴──────┴────────┴──────┴───────────┘
```

### Why Option B over A (tree) or C (master-detail)

| Factor | Assessment |
|---|---|
| **Actual backend hierarchy** | Only 2 levels (ASPECT → INDICATOR). A full tree widget (Option A) is overkill for 2 levels. A table with expandable rows handles this cleanly. |
| **ERP usability** | Tables are the established ERP pattern in this codebase (employees, positions). Users are already familiar with table-based navigation and kebab actions. |
| **Current component library** | The `PositionTable` component already implements expandable tree-rows using `Table.ScrollContainer > Table.Content` with `buildTreeRows()` + `paddingLeft: depth * 24`. This is a proven pattern we can replicate exactly. |
| **Create/edit workflows** | Kebab dropdown actions per row ("Tambah Indikator", "Edit", "Ubah Status", "Hapus") mirror the existing position table pattern. |
| **Future Activity integration** | INDICATOR rows are the leaf nodes that Activities will reference. A table row is easy to extend with an "Lihat Aktivitas" action later without restructuring. |
| **Responsive behavior** | Table with horizontal scroll (`Table.ScrollContainer`) already handles narrow screens. Columns can be hidden on mobile if needed later. |
| **Data volume** | Tree endpoint returns the full hierarchy per year. Expected volume is small (5–20 ASPECT nodes, 20–100 INDICATOR nodes). No pagination needed — client-side rendering is sufficient. |

### Detail view

No separate detail page is needed in P1. The table row + kebab actions + modal forms cover all operations. A detail page (`/hr/kpi/corporate/[id]`) is **deferred** — the `GET /{id}` endpoint exists but the tree response already contains all node data inline.

---

## 6. Hierarchy Behavior

### Structure

```
ASPECT (root)
  parentId = null
  unit = null, targetValue = null
  Can have INDICATOR children

INDICATOR (leaf)
  parentId = <ASPECT UUID>
  unit = required (non-blank)
  targetValue = required (> 0)
  Cannot have children (leaf level)
```

### Expand/collapse

- ASPECT rows have a caret toggle (▼/▶) when they have INDICATOR children.
- INDICATOR rows have no toggle (leaf).
- `expandedIds: Set<string>` in local UI state.
- Default: all ASPECT nodes expanded on initial load.
- "Perluas Semua" / "Ciutkan Semua" buttons in the filter row.

### Parent-active behavior

- If an ASPECT is INACTIVE/DRAFT, its INDICATOR children cannot be set to ACTIVE (backend enforces, frontend shows appropriate error).
- The create-INDICATOR button under an ASPECT is always available regardless of ASPECT status (creating a DRAFT indicator under any non-deleted ASPECT is valid).

---

## 7. Form Workflows

### Container: Modal

All create/edit operations use a **modal** (not a page route, not a drawer). This keeps users on the tree view and avoids adding 6+ new routes (create-ASPECT, create-INDICATOR, edit-node) for a 2-level hierarchy.

Rationale: the existing codebase uses separate page routes for employees/positions (complex forms with many fields and sub-forms). Corporate KPI forms have ≤7 fields — a modal is the appropriate container.

### 7.1 Create ASPECT

| Aspect | Detail |
|---|---|
| **Entry point** | "Add" button (top-right) → opens modal with `nodeType=ASPECT` pre-selected |
| **Fields** | code*, name*, year*, description |
| **Hidden fields** | `nodeType` = `ASPECT` (fixed), `parentId` = `null` (fixed), `unit` = hidden, `targetValue` = hidden |
| **Validation** | code required (max 50), name required (max 255), year required (2000–2100) |
| **Submit** | POST `/api/v1/corporate-kpis` with `nodeType: "ASPECT"` |
| **Success** | toast.success("Corporate KPI created successfully"), modal closes, tree refreshes |
| **Error** | toast.danger(extractErrorMessage) — e.g. "Corporate KPI code already exists in this year" |

### 7.2 Create INDICATOR (under ASPECT)

| Aspect | Detail |
|---|---|
| **Entry point** | "Add Indicator" on an ASPECT row → opens modal with `nodeType=INDICATOR`, `parentId` pre-filled |
| **Fields** | code*, name*, unit*, targetValue*, description |
| **Hidden fields** | `nodeType` = `INDICATOR` (fixed), `parentId` = `<selected ASPECT UUID>`, `year` = `<ASPECT's year>` (auto-filled from parent, read-only display) |
| **Validation** | code required (max 50), name required (max 255), unit required (max 50), targetValue required (positive number) |
| **Submit** | POST `/api/v1/corporate-kpis` with `nodeType: "INDICATOR"`, `parentId`, `year` from parent |
| **Success** | toast.success, modal closes, tree refreshes, parent ASPECT auto-expands |
| **Error** | toast.danger with backend message |

### 7.3 Edit node

| Aspect | Detail |
|---|---|
| **Entry point** | Kebab action "Edit" on any row → opens modal in edit mode |
| **Fields** | code*, name*, unit (INDICATOR only), targetValue (INDICATOR only), description |
| **Read-only display** | nodeType, year (immutable in update DTO) |
| **Parent selection** | For INDICATOR: a Select dropdown of ASPECT nodes in the same year. Parent CAN be changed to another ASPECT in the same year. For ASPECT: parent is always null (not shown). |
| **Can type/level be changed?** | No — `nodeType` is immutable. Backend update DTO has no `nodeType` field. |
| **Can year be changed?** | No — `year` is immutable. Backend update DTO has no `year` field. |
| **Are codes editable?** | Yes — code is in the update DTO. Backend validates uniqueness per year (excluding self). |
| **Submit** | PUT `/api/v1/corporate-kpis/{id}` |
| **Success** | toast.success("Corporate KPI updated successfully"), modal closes, tree refreshes |
| **Error** | toast.danger with backend message |

### Answers to explicit questions

| Question | Answer |
|---|---|
| How is a Perspective (ASPECT) created? | "Tambah" button → modal with `nodeType=ASPECT` |
| How is an Objective (INDICATOR) attached? | Kebab "Tambah Indikator" on ASPECT row → modal with `parentId` pre-filled |
| How is an Indicator (INDICATOR) attached to Objective? | N/A — backend has only ASPECT → INDICATOR, no intermediate level. "Objective" in the task description maps to INDICATOR (the measurable leaf). |
| Can a node's parent be changed during update? | Yes, for INDICATOR (via Select dropdown of same-year ASPECTs). No, for ASPECT (always root). |
| Can type/level be changed? | No — immutable. |
| How is the active year selected? | Year Select dropdown in the page header. Default = current year. |
| Are codes editable? | Yes. |
| What happens when a parent is inactive? | INDICATOR cannot be set to ACTIVE (backend error `KPI_PARENT_MUST_BE_ACTIVE`). Creating/editing is still allowed. |
| What actions are available for ACTIVE vs INACTIVE nodes? | See lifecycle section below. |

---

## 8. Lifecycle Behavior

### Status flow

```
DRAFT ──→ ACTIVE ──→ INACTIVE
  ↑                    │
  └────────────────────┘
  (can go back to DRAFT if constraints allow)
```

Backend allows any status transition via `PATCH /{id}/status`, but applies these guards:

| Node type | New status | Guard |
|---|---|---|
| INDICATOR → ACTIVE | Parent ASPECT must be ACTIVE | `KPI_PARENT_MUST_BE_ACTIVE` |
| ASPECT → DRAFT or INACTIVE | Must have no ACTIVE INDICATOR children | `KPI_ASPECT_HAS_ACTIVE_CHILDREN` |

### Status actions in the UI

The kebab dropdown shows status-change actions based on current status:

| Current status | Available actions |
|---|---|
| DRAFT | "Aktifkan" (→ ACTIVE) |
| ACTIVE | "Nonaktifkan" (→ INACTIVE), "Set Draf" (→ DRAFT) |
| INACTIVE | "Aktifkan" (→ ACTIVE), "Set Draf" (→ DRAFT) |

**UX decision:** Status changes do NOT require a confirmation modal (unlike delete). They use a simple dropdown selection that calls `PATCH /{id}/status` directly. If the backend rejects (e.g. parent not active), the error toast explains why.

**Rationale:** Status changes are reversible and non-destructive. A confirmation modal adds friction without safety benefit. The backend is the authoritative guard.

### Delete

- Soft delete via `PATCH /{id}/delete`.
- Uses shared `DeleteConfirmDialog` component.
- Guard: node must have 0 non-deleted children (`KPI_HAS_CHILDREN`).
- After delete: tree refreshes, node disappears from tree view.

### Restore

- Only shown in deleted view (when year filter includes deleted, or separate "Terhapus" toggle).
- Actually, the backend `GET /deleted` returns all deleted nodes regardless of year. The UI provides a "Terhapus" toggle (permission-gated by `corporate_kpi:read_deleted`) that switches the table to show the deleted list.
- Restore via `POST /{id}/restore`.
- Guards: code must not conflict (`KPI_CODE_EXISTS`), parent must exist and be valid (`KPI_PARENT_DELETED`).
- After restore: list refreshes.

---

## 9. Permission Behavior

### Permission → UI mapping

| Permission | Route access | Sidebar | Page visibility | UI elements gated |
|---|---|---|---|---|
| `corporate_kpi:read` | `/hr/kpi/corporate` | "KPI Korporat" sidebar item | Tree view + detail | Tree renders, kebab "Detail" |
| `corporate_kpi:create` | — | — | — | "Tambah" button, "Tambah Indikator" kebab action |
| `corporate_kpi:update` | — | — | — | "Edit" kebab action, status-change kebab actions |
| `corporate_kpi:delete` | — | — | — | "Hapus" kebab action |
| `corporate_kpi:restore` | — | — | — | "Pulihkan" action in deleted view |
| `corporate_kpi:read_deleted` | — | — | — | "Terhapus" toggle button |

### User scenarios

| User type | What they see |
|---|---|
| **Read-only user** (`corporate_kpi:read` only) | Tree renders, no "Tambah" button, no mutation actions in kebab. Kebab may show "Detail" if implemented, otherwise just the node info is visible inline. |
| **Corporate KPI manager** (all 6 permissions) | Full tree, all create/edit/delete/restore/status actions visible. |
| **User without any `corporate_kpi:*` permission** | Sidebar item hidden (sidebar uses `some()` — `corporate_kpi:read` is the only permission listed). Page not navigable. If accessed directly, AuthGuard / page-level guard blocks. |

### Implementation

- Page-level: `usePermission()` hook + `PERM.CORPORATE_KPI_READ` guard. If user lacks read permission, show `<Alert status="danger">Akses Ditolak</Alert>`.
- Action-level: each button/action wrapped in `hasPerm(PERM.CORPORATE_KPI_CREATE/UPDATE/DELETE/RESTORE)`.
- No new authorization framework created. Uses existing `usePermission()` + `PERM.*` constants.

---

## 10. Filtering and Navigation

### Controls (minimal set for v1)

| Control | Implementation | Default |
|---|---|---|
| **Year Select** | `<Select>` with years (current year ± 2 years, or dynamic range) | Current year (2026) |
| **Terhapus toggle** | `<Button>` toggle, permission-gated by `corporate_kpi:read_deleted` | OFF (tree view) |
| **Text search** | `<SearchField>` — client-side filter on code + name within loaded tree | Empty |
| **Expand/Collapse all** | Two buttons: "Perluas Semua" / "Ciutkan Semua" | All expanded |

### NOT included in v1

- Status filter — backend tree endpoint returns all statuses. Client-side status filtering is possible but adds complexity for low value. **Deferred.**
- Level/type filter — only 2 types (ASPECT/INDICATOR). Visual indentation already differentiates them. **Deferred.**

### Behavior

| Scenario | Behavior |
|---|---|
| Default year | Current year (`new Date().getFullYear()`) |
| Year change | Refetch tree: `GET /tree?year={newYear}` |
| Empty result | `<Surface>` with centered icon + "Belum ada KPI untuk tahun {year}" message |
| After refresh (F5) | Year defaults to current year, tree refetches |
| Direct navigation | Page loads with default year, tree fetches |
| Filter state in URL | **Not in v1.** Year is local state. URL params add complexity for minimal benefit at current scale. **Deferred.** |
| Selected node in URL | **Not in v1.** No detail page route. **Deferred.** |

### Search behavior

- `SearchField` filters the currently-loaded tree client-side (code + name match).
- Non-matching nodes are hidden; matching nodes' parent ASPECTs are shown (even if the ASPECT itself doesn't match) to preserve hierarchy context.
- No debounce needed since it's client-side filtering (no API call). The `SearchField` component handles this natively.

---

## 11. State and Data Architecture

### Architecture: feature-local hooks + direct axios (no React Query/TanStack)

The existing codebase uses `useState` + `useEffect` + `useCallback` hooks with direct axios calls — no React Query or TanStack Query. P1 follows this exact pattern.

### API module location

```
src/modules/hr/kpi/corporate/services/corporate-kpi-api.ts
```

### TypeScript DTO location

```
src/modules/hr/kpi/corporate/types.ts
```

### Query keys

No React Query → no query keys. Data refetch is via explicit `fetchTree()` calls in the hook.

### Hooks

| Hook | Location | Responsibility |
|---|---|---|
| `useCorporateKpiData` | `hooks/use-corporate-kpi-data.ts` | Tree fetch, year state, search filter, deleted toggle, CRUD mutations, invalidation/refresh |

This single hook owns ALL server state for the page (following the `useEmployeeData` / `usePositionData` pattern). No separate detail hook needed since tree data is complete.

### Mutations and refresh strategy

All mutations (create, update, status change, delete, restore) call the API, then **refetch the full tree** (`fetchTree(year)`) on success. This is server-confirmed refresh — no optimistic updates.

**Rationale:** The tree is small (expected <100 nodes per year) and lifecycle constraints (parent-child status dependencies, code uniqueness) make optimistic updates risky. Server-confirmed refresh is the correct default for lifecycle-sensitive actions.

### Local UI state (page component)

| State | Type | Purpose |
|---|---|---|
| `expandedIds` | `Set<string>` | Which ASPECT nodes are expanded |
| `searchInput` | `string` | Search field text (client-side filter) |
| `createModalState` | `{ open, nodeType, parentId } \| null` | Controls create modal |
| `editModalState` | `{ open, node } \| null` | Controls edit modal |
| `deleteDialogState` | `{ open, node } \| null` | Controls delete confirmation |

### Server state (hook)

| State | Type |
|---|---|
| `tree` | `CorporateKpiNode[]` |
| `deletedList` | `CorporateKpiNode[]` |
| `isLoading` | `boolean` |
| `isLoadingDeleted` | `boolean` |
| `year` | `number` |

### Form state

React Hook Form + Zod resolver (existing pattern from `EmployeeForm`). Schema defined per modal type.

### What we do NOT create

- Generic entity CRUD framework
- Generic hierarchy engine
- Global KPI Zustand store
- React Query / TanStack Query integration
- Speculative abstractions for Activity or Report

---

## 12. Proposed File Changes

### CREATE

```
src/modules/hr/kpi/corporate/
├── types.ts                                    # CorporateKpiNode, request/response DTOs, enums
├── services/
│   └── corporate-kpi-api.ts                    # API module (8 endpoints)
├── hooks/
│   └── use-corporate-kpi-data.ts               # Tree + deleted + CRUD hook
├── components/
│   ├── corporate-kpi-table.tsx                 # Expandable tree-table (primary component)
│   ├── kpi-node-form-modal.tsx                 # Create/edit modal (ASPECT + INDICATOR modes)
│   ├── kpi-status-badge.tsx                    # Status badge (DRAFT/ACTIVE/INACTIVE)
│   └── kpi-empty-state.tsx                     # Empty tree state
└── __tests__/
    ├── corporate-kpi-api.test.ts               # API contract tests
    └── corporate-kpi-table.test.tsx             # Hierarchy rendering + permissions tests
```

### MODIFY

```
src/app/(main)/hr/kpi/corporate/page.tsx        # Replace placeholder with full implementation
src/__mocks__/heroui-react.tsx                   # Add needed mock exports (Table, Modal, Select, etc.)
src/__mocks__/phosphor-icons-react.tsx           # Add icons used by P1 (Plus, CaretRight, etc.)
```

### REMOVE

(none)

### DEFER

```
src/app/(main)/hr/kpi/corporate/[id]/page.tsx    # Detail page — deferred (tree has all data)
src/modules/hr/kpi/corporate/components/
    kpi-node-detail-panel.tsx                     # Master-detail panel — deferred
```

### File count rationale

- 1 types file (all DTOs + enums in one file, following `employees/types.ts` pattern)
- 1 API service file (all 8 endpoints)
- 1 hook file (all data operations)
- 4 component files (table, form modal, status badge, empty state)
- 2 test files (API contract, table rendering)
- Minimal — no one-line files

---

## 13. Component Design

### `corporate-kpi-table.tsx`

| Aspect | Detail |
|---|---|
| **Responsibility** | Render the ASPECT → INDICATOR hierarchy as an expandable table with per-row kebab actions |
| **Inputs** | `tree: CorporateKpiNode[]`, `expandedIds: Set<string>`, `onToggleExpand`, `searchQuery: string`, `isLoading`, callback handlers for create/edit/delete/status actions |
| **Owns server state?** | No — presentation only. All mutations delegated to parent via callbacks |
| **Genuinely reusable?** | No — specific to Corporate KPI hierarchy |
| **Pattern** | Replicates `PositionTable` tree-view: `buildTreeRows()` flattens tree, `paddingLeft: depth * 24` for indentation, caret toggle for ASPECT rows |

### `kpi-node-form-modal.tsx`

| Aspect | Detail |
|---|---|
| **Responsibility** | Modal form for creating ASPECT, creating INDICATOR, and editing any node. Uses React Hook Form + Zod. |
| **Inputs** | `mode: 'create-aspect' \| 'create-indicator' \| 'edit'`, `node?` (for edit), `parentAspects` (for INDICATOR parent selection), `onSuccess`, `isOpen`, `onClose` |
| **Owns server state?** | No — calls `onSubmit` callback from parent hook, which handles API + toast |
| **Fields shown** | Dynamic based on mode: code, name always; year (create-aspect only, read-only for create-indicator); unit + targetValue (INDICATOR only); parentId Select (edit INDICATOR only); description always |
| **Genuinely reusable?** | No — specific to Corporate KPI node form |

### `kpi-status-badge.tsx`

| Aspect | Detail |
|---|---|
| **Responsibility** | Render a Badge for DRAFT/ACTIVE/INACTIVE status |
| **Inputs** | `status: string` |
| **Owns server state?** | No — pure presentation |
| **Genuinely reusable?** | Borderline — could be reused by Activity (P2) which has different statuses. Keep as Corporate-KPI-local for now. |
| **Badge variant mapping** | DRAFT → `secondary`, ACTIVE → `primary`, INACTIVE → `soft` (only `primary`/`secondary`/`soft` exist in HeroUI v3) |

### `kpi-empty-state.tsx`

| Aspect | Detail |
|---|---|
| **Responsibility** | Centered Surface with icon + message for empty tree |
| **Inputs** | `year: number` |
| **Owns server state?** | No — pure presentation |
| **Genuinely reusable?** | No |

### Reused shared components

| Component | Used for |
|---|---|
| `DeleteConfirmDialog` | Delete confirmation (shared, already exists) |
| `Surface` | All card/section containers |
| `Spinner` | Loading state |
| `Breadcrumbs` / `BreadcrumbsItem` | Page navigation breadcrumb |
| `Button`, `Select`, `ListBox`, `TextField`, `Input`, `Label`, `FieldError`, `TextArea` | Form fields |
| `SearchField` | Client-side search |
| `Dropdown` | Kebab action menu per row |
| `Table` + compound | Tree-table rendering |
| `Modal` + compound | Create/edit form modal |
| `Badge` | Status badge (via `kpi-status-badge.tsx`) |
| `toast` | Success/error feedback |
| `Alert` | Access-denied state |

---

## 14. Validation and Error Handling

### Frontend validation (Zod schemas)

| Field | Create ASPECT | Create INDICATOR | Edit (any) |
|---|---|---|---|
| code | required, max 50 | required, max 50 | required, max 50 |
| name | required, max 255 | required, max 255 | required, max 255 |
| year | required, 2000–2100 | hidden (auto from parent) | hidden (immutable) |
| unit | hidden | required, max 50 | shown if INDICATOR, optional in schema |
| targetValue | hidden | required, positive number | shown if INDICATOR, optional in schema |
| description | optional | optional | optional |
| parentId | hidden (null) | hidden (parent UUID) | Select if INDICATOR |

**Number field:** Use `z.number().min(0)` (NOT `z.coerce.number()` — breaks Zod v4 type inference per frontend standards). Use `valueAsNumber: true` in `register()`.

### Backend validation mapping

| Backend error message | Frontend behavior |
|---|---|
| `KPI_CODE_EXISTS` → "Corporate KPI code already exists in this year" | toast.danger — no frontend pre-check (would require API call per keystroke) |
| `KPI_INDICATOR_REQUIRES_ASPECT_PARENT` | toast.danger — should not happen if UI prevents wrong parent selection |
| `KPI_PARENT_MUST_BE_ACTIVE` | toast.danger — shown when user tries to activate INDICATOR under non-active ASPECT |
| `KPI_ASPECT_HAS_ACTIVE_CHILDREN` | toast.danger — shown when user tries to deactivate ASPECT with active children |
| `KPI_HAS_CHILDREN` | toast.danger — shown when user tries to delete ASPECT with INDICATOR children |
| `KPI_PARENT_DELETED` | toast.danger — shown on restore when parent is deleted |
| `KPI_NOT_FOUND` (404) | toast.danger — stale state, tree refreshes |
| Validation `errors` map (400) | If backend returns field-level errors, show inline via `FieldError`. In practice, frontend Zod catches these first. |

### Error display format

All errors use `extractErrorMessage(error, fallbackMessage)` from `@/types/api`. This handles both:
- `ProblemDetail` (RFC 7807): `{ detail, title, status, timestamp }`
- `ApiResponse` error: `{ message, status }`

The function extracts `detail ?? message ?? title ?? fallback`. Backend messages are in English; the hook wraps with Indonesian fallback messages.

**No raw stack traces or internal codes exposed.** Backend returns human-readable messages (e.g. "Corporate KPI code already exists in this year").

### Forbidden (403) behavior

If user somehow triggers an action they don't have permission for (e.g. via devtools), backend returns 403 `ProblemDetail` with `ACCESS_DENIED` message. This surfaces as a toast.danger. Frontend permission gates prevent this in normal usage.

---

## 15. Automated Test Plan

### Test infrastructure

- Jest 30 + Testing Library (existing setup)
- HeroUI and Phosphor mocks need expansion for new components used
- Tests in `src/modules/hr/kpi/corporate/__tests__/`

### Test files and cases

#### `corporate-kpi-api.test.ts` — API contract

| Test | Description |
|---|---|
| getTreeByYear calls correct endpoint | Verifies `GET /api/v1/corporate-kpis/tree?year=2026` |
| getTreeByYear returns parsed tree | Mock response → verify nested structure |
| getById calls correct endpoint | Verifies `GET /api/v1/corporate-kpis/{id}` |
| getDeleted calls correct endpoint | Verifies `GET /api/v1/corporate-kpis/deleted` |
| create sends correct payload | Verifies POST with all fields including nodeType |
| update sends PUT with full payload | Verifies PUT with code, name, unit, targetValue, description, parentId |
| changeStatus sends PATCH | Verifies `PATCH /{id}/status` with `{ status }` |
| delete sends PATCH | Verifies `PATCH /{id}/delete` |
| restore sends POST | Verifies `POST /{id}/restore` |
| error propagation | Mock 400 → verify error thrown with detail message |

#### `corporate-kpi-table.test.tsx` — Rendering + permissions

| Test | Description |
|---|---|
| Renders ASPECT root node | Verify name, code, type badge visible |
| Renders INDICATOR under expanded ASPECT | Expand → verify child rows appear |
| Collapsed ASPECT hides children | Default collapsed → children not in document |
| Empty tree shows empty state | No nodes → "Belum ada KPI" message |
| INACTIVE status badge renders | Verify badge text |
| Read-only user sees no mutation actions | Mock permissions → no "Tambah", no kebab mutation items |
| Manager sees all actions | Mock all permissions → "Tambah" visible, kebab has all items |
| Create ASPECT entry point | "Tambah" button calls handler |
| Create INDICATOR entry point | Kebab "Tambah Indikator" calls handler with parentId |
| Delete shows confirmation | Kebab "Hapus" opens delete dialog |

### Existing tests that must still pass

- `page-shells.test.tsx` — the Corporate page shell test will need updating since the placeholder is replaced. The test case checking for "P1" placeholder text must be removed or updated.
- `sidebar.test.ts` — unchanged, no sidebar modifications in P1.

### Test count impact

| Before P1 | After P1 |
|---|---|
| 46 tests (2 files) | 46 − ~2 (page-shell corporate tests updated) + ~20 (new tests) ≈ **64 tests** |

---

## 16. Manual Smoke-Test Plan

**Not executed in this planning task. To be run after P1 implementation.**

1. Login as ADMIN (has all 6 Corporate KPI permissions).
2. Navigate to `/hr/kpi/corporate`.
3. Verify page loads with current year (2026) and empty tree.
4. Click "Tambah" → create an ASPECT (code: `FIN`, name: `Financial`, year: 2026).
5. Verify ASPECT appears in tree, expanded, with DRAFT status.
6. Click kebab on ASPECT → "Tambah Indikator" → create INDICATOR (code: `F01`, name: `Revenue Growth`, unit: `%`, targetValue: `10.5`).
7. Verify INDICATOR appears under ASPECT with DRAFT status.
8. Try to activate INDICATOR → expect error (parent ASPECT is DRAFT).
9. Activate ASPECT first → then activate INDICATOR → both show ACTIVE.
10. Edit INDICATOR → change name → save → verify update reflected.
11. Edit INDICATOR → change parent to another ASPECT (if exists) → verify move.
12. Try to delete ASPECT with active children → expect error.
13. Deactivate INDICATOR → then delete ASPECT → then delete INDICATOR.
14. Toggle "Terhapus" → verify deleted nodes appear.
15. Restore a node → verify it returns.
16. Login as read-only user → verify no mutation buttons/actions visible.
17. Verify the resulting ACTIVE INDICATOR is usable later by Activity creation (P2 dependency — note for future).

---

## 17. Phased Implementation Plan

### P1.1 — Contract and Data Layer

**Scope:**
- TypeScript types (`types.ts`)
- API module (`corporate-kpi-api.ts`)
- Data hook (`use-corporate-kpi-data.ts`)
- API contract tests

**Expected files:**
- `src/modules/hr/kpi/corporate/types.ts` (CREATE)
- `src/modules/hr/kpi/corporate/services/corporate-kpi-api.ts` (CREATE)
- `src/modules/hr/kpi/corporate/hooks/use-corporate-kpi-data.ts` (CREATE)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-api.test.ts` (CREATE)

**Acceptance criteria:**
- All 8 API methods exist with correct method, path, and payload shape.
- Types match backend DTOs exactly.
- Hook manages tree/deleted state, year, search, and CRUD operations.
- API tests pass.

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest corporate-kpi-api --passWithNoTests"
```

**Commit message:**
```
feat(kpi): add Corporate KPI API layer and types

- TypeScript types matching backend DTOs (CorporateKpiNode, request/response)
- corporate-kpi-api.ts with all 8 endpoints (tree, detail, deleted, create, update, status, delete, restore)
- useCorporateKpiData hook with tree fetch, year/search state, CRUD mutations
- API contract tests verifying method, path, and payload
```

---

### P1.2 — Read-only Hierarchy UI

**Scope:**
- Replace placeholder page with full page layout (breadcrumb, title, year filter, search, refresh)
- `corporate-kpi-table.tsx` — expandable tree-table (read-only)
- `kpi-status-badge.tsx`
- `kpi-empty-state.tsx`
- Expand/collapse all functionality
- Page connects to `useCorporateKpiData` hook
- Update HeroUI/Phosphor mocks for test compatibility
- Update `page-shells.test.tsx` Corporate tests

**Expected files:**
- `src/app/(main)/hr/kpi/corporate/page.tsx` (MODIFY — full implementation)
- `src/modules/hr/kpi/corporate/components/corporate-kpi-table.tsx` (CREATE)
- `src/modules/hr/kpi/corporate/components/kpi-status-badge.tsx` (CREATE)
- `src/modules/hr/kpi/corporate/components/kpi-empty-state.tsx` (CREATE)
- `src/modules/hr/kpi/__tests__/page-shells.test.tsx` (MODIFY — update Corporate tests)
- `src/__mocks__/heroui-react.tsx` (MODIFY — add Table, Badge, etc.)
- `src/__mocks__/phosphor-icons-react.tsx` (MODIFY — add icons)

**Acceptance criteria:**
- Page renders tree from backend (via mock or real backend).
- ASPECT rows expand/collapse to show INDICATOR children.
- Year filter changes fetch.
- Search filters client-side.
- Empty state shows when no data.
- Loading state shows centered Spinner.
- Read-only user sees tree without mutation actions.

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest"
```

**Commit message:**
```
feat(kpi): add Corporate KPI read-only hierarchy table

- Expandable tree-table rendering ASPECT → INDICATOR hierarchy
- Year filter, client-side search, expand/collapse all
- Status badges (DRAFT/ACTIVE/INACTIVE)
- Empty state, loading state
- Permission-gated action visibility
```

---

### P1.3 — Create/Update Workflow

**Scope:**
- `kpi-node-form-modal.tsx` — modal for create ASPECT, create INDICATOR, edit node
- React Hook Form + Zod validation per mode
- Parent Select for INDICATOR edit
- "Tambah" button (create ASPECT) and "Tambah Indikator" kebab action
- "Edit" kebab action
- Form submission → API → toast → tree refresh
- Error handling for code conflicts, validation errors

**Expected files:**
- `src/modules/hr/kpi/corporate/components/kpi-node-form-modal.tsx` (CREATE)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-table.test.tsx` (CREATE — form + rendering tests)

**Acceptance criteria:**
- Create ASPECT modal: code, name, year, description fields. Submits POST.
- Create INDICATOR modal: code, name, unit, targetValue, description. Parent pre-filled. Submits POST.
- Edit modal: fields pre-populated. Parent Select for INDICATOR. Submits PUT.
- Code/name required validation works.
- Unit/targetValue required for INDICATOR.
- Submit disabled while pending.
- Success toast + tree refresh.
- Error toast on backend rejection.

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

**Commit message:**
```
feat(kpi): add Corporate KPI create and edit modal workflows

- Modal form for create ASPECT, create INDICATOR, and edit node
- React Hook Form + Zod validation per mode
- Parent selection for INDICATOR (same-year ASPECT dropdown)
- Success/error toast feedback, tree refresh on submit
- Automated tests for form validation and submission
```

---

### P1.4 — Lifecycle Actions and Permissions

**Scope:**
- Status change actions in kebab (Aktifkan/Nonaktifkan/Set Draf)
- Delete action with `DeleteConfirmDialog`
- "Terhapus" toggle for deleted view
- Restore action in deleted view
- All actions permission-gated
- Page-level permission guard (`corporate_kpi:read`)

**Expected files:**
- `src/app/(main)/hr/kpi/corporate/page.tsx` (MODIFY — add lifecycle handlers, deleted toggle, delete dialog)
- `src/modules/hr/kpi/corporate/components/corporate-kpi-table.tsx` (MODIFY — add kebab status/delete actions)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-table.test.tsx` (MODIFY — add lifecycle test cases)

**Acceptance criteria:**
- Status dropdown actions call `PATCH /{id}/status` with correct status.
- Delete opens `DeleteConfirmDialog`, calls `PATCH /{id}/delete`, refreshes tree.
- "Terhapus" toggle (permission-gated) switches to deleted list view.
- Restore action calls `POST /{id}/restore`, refreshes deleted list.
- Backend errors (active children, parent not active) shown as toast.
- Read-only user sees no mutation actions.

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

**Commit message:**
```
feat(kpi): add Corporate KPI lifecycle actions and permissions

- Status change (DRAFT/ACTIVE/INACTIVE) via kebab dropdown
- Soft delete with confirmation dialog
- Deleted view toggle (permission-gated) and restore action
- Full PBAC permission gating on all mutation actions
- Page-level read permission guard
```

---

### P1.5 — Tests, Documentation, and Smoke Verification

**Scope:**
- Final test pass — verify all tests green
- Verify no new lint errors (beyond pre-existing Organization lint issue)
- Verify production build green
- Update KPI module notes / documentation if applicable
- Manual smoke test (Section 16)

**Expected files:**
- No new files — verification phase

**Acceptance criteria:**
- All Jest tests pass (existing 46 + new P1 tests).
- TypeScript compilation: zero errors.
- Production build: green.
- Lint: only the pre-existing Organization error, no new P1 errors.
- Manual smoke test passes all steps.

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint src/modules/hr/kpi/corporate/"
```

**Commit message:**
```
test(kpi): finalize Corporate KPI P1 test coverage and verification

- All API contract, rendering, permission, form, and lifecycle tests green
- TypeScript, Jest, and production build verified
- No new lint errors (pre-existing Organization error excluded)
```

---

## 18. Proposed Commit Messages

Listed in each phase above (Section 17). Summary:

| Phase | Commit type | Message |
|---|---|---|
| P1.1 | `feat(kpi)` | add Corporate KPI API layer and types |
| P1.2 | `feat(kpi)` | add Corporate KPI read-only hierarchy table |
| P1.3 | `feat(kpi)` | add Corporate KPI create and edit modal workflows |
| P1.4 | `feat(kpi)` | add Corporate KPI lifecycle actions and permissions |
| P1.5 | `test(kpi)` | finalize Corporate KPI P1 test coverage and verification |

---

## 19. Risks and Open Questions

### Risks

| Risk | Mitigation |
|---|---|
| HeroUI mock needs expansion for Table, Modal, Select, Badge, Dropdown, Pagination | P1.2 includes mock expansion. If a component is missing, add a minimal mock that renders children. |
| Tree endpoint has no pagination — large datasets could slow rendering | Expected volume is small (<100 nodes/year). If performance becomes an issue, add virtualization later. |
| `page-shells.test.tsx` Corporate test checks for "P1" placeholder text — will break when placeholder is replaced | P1.2 updates this test to check for real page elements (table, year filter, etc.) instead of placeholder text. |
| Form modal with 3 modes (create-aspect, create-indicator, edit) could become complex | Single component with conditional fields. Zod schema is dynamic per mode (following `getFormSchema(isEditMode)` pattern from EmployeeForm). |

### Open questions

| # | Question | Status |
|---|---|---|
| 1 | Should the year Select offer a fixed range (current ± 2) or query available years from backend? | **Answered by source:** Backend `GET /tree?year={year}` takes any integer 2000–2100. There is no "available years" endpoint. Use a fixed range (current year ± 3 years) in the Select. This is a UX decision, not a backend constraint. |

No genuinely unresolved questions remain — the backend and frontend source fully determine the implementation.

---

## 20. Explicit Exclusions

The following are **NOT** planned or implemented in P1:

- Activity frontend (P2)
- Activity change-request approval frontend
- Report frontend (P3)
- Multipart upload
- Evidence preview
- KPI Overview metrics
- Main-dashboard KPI widgets
- Drag-and-drop hierarchy editing
- Batch import/export
- Analytics
- Score formulas
- Weighting
- Remuneration
- Backend changes
- Organization module changes
- New UI library
- New state-management library
- URL query parameter filter state
- Separate detail page route (`/hr/kpi/corporate/[id]`)
- React Query / TanStack Query integration
- Generic entity CRUD framework
- Generic hierarchy engine
- Global KPI Zustand store

---

## 21. Windows Verification Commands

**CRITICAL:** The frontend project is on the Windows filesystem (`C:\Project\erp-new\erp-frontend`). All Node/npm commands MUST run via Windows, not WSL Linux Node.

### Verification commands

```bash
# TypeScript type check
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"

# Jest tests
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest"

# Production build
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"

# Lint (KPI module only — avoids pre-existing Organization error)
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint src/modules/hr/kpi/corporate/"
```

### Rules

- **Do NOT** run `node`, `npm`, or `npx` from WSL against `/mnt/c/` paths.
- **Do NOT** mix Windows and Linux `node_modules`.
- Always use `cmd.exe /c "cd /d C:\... && ..."` pattern.

### Known baseline

| Check | Status before P1 |
|---|---|
| TypeScript (`tsc --noEmit`) | Green |
| Jest | 46 tests green |
| Production build (`npm run build`) | Green |
| Lint | One pre-existing Organization error outside KPI |

The pre-existing lint error must be distinguished from any new P1 lint error. Run lint scoped to `src/modules/hr/kpi/corporate/` to isolate P1 issues.

---

## 22. P1 Definition of Done

### Functional

- [ ] `/hr/kpi/corporate` renders the ASPECT → INDICATOR tree from the real backend
- [ ] Year filter switches tree data
- [ ] Client-side search filters tree by code/name
- [ ] Expand/collapse individual ASPECT nodes + expand/collapse all
- [ ] Create ASPECT via modal
- [ ] Create INDICATOR under ASPECT via kebab action
- [ ] Edit node (code, name, unit, targetValue, description, parentId for INDICATOR)
- [ ] Change status (DRAFT → ACTIVE → INACTIVE and back) with backend constraint enforcement
- [ ] Soft delete with confirmation dialog
- [ ] Deleted view toggle (permission-gated) + restore
- [ ] All mutation actions permission-gated via `usePermission()` + `PERM.*`
- [ ] Page-level read permission guard

### Technical

- [ ] TypeScript: zero errors (`tsc --noEmit`)
- [ ] Jest: all tests green (existing 46 + new P1 tests)
- [ ] Production build: green (`npm run build`)
- [ ] Lint: no new errors beyond pre-existing Organization issue
- [ ] No React/browser console warnings
- [ ] All code follows `erp-frontend-standards` skill conventions
- [ ] 100% HeroUI components (no native HTML form elements)
- [ ] All user-facing strings in Indonesian, code in English
- [ ] Feature-local files only (no global state, no generic frameworks)

### Architectural

- [ ] API module at `services/corporate-kpi-api.ts` with all 8 endpoints
- [ ] Data hook at `hooks/use-corporate-kpi-data.ts` owning all server state
- [ ] Types at `types.ts` matching backend DTOs exactly
- [ ] Components at `components/` — table, form modal, status badge, empty state
- [ ] No direct API calls from components (always via hook)
- [ ] Server-confirmed refresh after mutations (no optimistic updates)
- [ ] Sidebar unchanged
- [ ] No backend modifications
