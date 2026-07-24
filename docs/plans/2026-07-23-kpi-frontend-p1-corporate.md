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
| Deleted view toggle | Analytics, score formulas, weighting, remuneration |
| Permission-aware UI (PBAC) | Backend changes |
| Automated tests (Jest) | Organization changes |
| | New UI/state-management library |
| | Localization infrastructure / language switcher |

### Critical discovery: hierarchy is 2-level, not 3-level

The user's task description mentions a 3-level hierarchy (Perspective → Objective → Indicator). **The actual backend implements only 2 levels:**

```
ASPECT (root — no parent, no unit/targetValue)
└─ INDICATOR (leaf — must have ASPECT parent, must have unit + targetValue > 0)
```

This is confirmed by `KpiNodeType.java`, `CorporateKpiServiceImpl.java`, and `V6__corporate_kpi.sql` DB constraints. The plan follows the **actual backend contract**, not the task description's hierarchy naming.

### English-only frontend

All user-facing text in P1 must be English. This includes page titles, descriptions, table headers, field labels, placeholders, buttons, badges, validation messages, confirmation dialogs, success and error notifications, empty states, and loading states.

Code identifiers, DTO fields, backend enum values, and permission strings must continue following the actual technical contracts.

No Indonesian text is introduced in the P1 UI. No localization infrastructure or language-switcher is created.

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

| # | Method | Path | Permission | Request DTO | Response DTO | Status | Changes Hierarchy or Status? |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/tree?year={year}` | `corporate_kpi:read` | `year` (query, Integer, required) | `List<CorporateKpiResponse>` (nested tree) | 200 | No |
| 2 | GET | `/{id}` | `corporate_kpi:read` | `id` (path, UUID) | `CorporateKpiResponse` (flat, children=[]) | 200 | No |
| 3 | GET | `/deleted` | `corporate_kpi:read_deleted` | — | `List<CorporateKpiResponse>` (flat) | 200 | No |
| 4 | POST | `` (root) | `corporate_kpi:create` | `CreateCorporateKpiRequest` | `CorporateKpiResponse` | 201 | Yes — creates node |
| 5 | PUT | `/{id}` | `corporate_kpi:update` | `UpdateCorporateKpiRequest` | `CorporateKpiResponse` | 200 | Can change parentId |
| 6 | PATCH | `/{id}/status` | `corporate_kpi:update` | `ChangeKpiStatusRequest` | `CorporateKpiResponse` | 200 | Yes — status change |
| 7 | PATCH | `/{id}/delete` | `corporate_kpi:delete` | — | `Void` (no data) | 200 | Yes — soft delete |
| 8 | POST | `/{id}/restore` | `corporate_kpi:restore` | — | `CorporateKpiResponse` | 200 | Yes — un-delete |

### Detail endpoint status

`GET /api/v1/corporate-kpis/{id}` (row #2) is **SUPPORTED BY BACKEND, NOT CONSUMED BY P1 UI**.

P1 has no detail page, no master-detail panel, and complete node data is already available in the hierarchy response. No `getById()` frontend method or API test is planned. The endpoint is documented for future use but no P1 code calls it.

### Total API methods planned in P1: 7 (endpoints #1, #3, #4, #5, #6, #7, #8)

### API response unwrapping

All consumed methods wrap their responses through the existing `ApiResponse<T>` envelope:

```typescript
interface ApiResponse<T> {
  status: string;     // e.g. "success"
  message: string;
  data: T;
  timestamp: string;
}
```

The API service module must:
- Use the existing configured axios client (`@/lib/axios`);
- Deserialize `ApiResponse<T>` from every successful response;
- Return the **inner `data`** to callers — UI components never see the wrapper;
- Preserve backend `ProblemDetail` failures for the existing `extractErrorMessage()` utility.

Exact return types for all seven methods:

```typescript
interface CorporateKpiApi {
  getTreeByYear(year: number): Promise<CorporateKpiNode[]>;
  getDeleted(): Promise<CorporateKpiNode[]>;
  create(payload: CreateCorporateKpiRequest): Promise<CorporateKpiNode>;
  update(id: string, payload: UpdateCorporateKpiRequest): Promise<CorporateKpiNode>;
  changeStatus(id: string, payload: ChangeKpiStatusRequest): Promise<CorporateKpiNode>;
  delete(id: string): Promise<void>;         // wraps ApiResponse<void>
  restore(id: string): Promise<CorporateKpiNode>;
}
```

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
  "unit": "string (max 50, required for INDICATOR, must be null for ASPECT)",
  "targetValue": "BigDecimal (positive, required for INDICATOR, must be null for ASPECT)",
  "description": "string (nullable)",
  "parentId": "UUID (required for INDICATOR, must be null for ASPECT)"
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

### ACTIVE Indicator reparenting

**Backend allows moving an ACTIVE Indicator to a DRAFT or INACTIVE Aspect** during update. The `update()` method validates only:
- Parent is non-null for INDICATOR;
- Parent is an ASPECT (not INDICATOR);
- Same year.

There is **no check on the parent's status** during update. Once moved, if the user later deactivates the Indicator via the status endpoint, reactivating it would fail with `KPI_PARENT_MUST_BE_ACTIVE` because the parent is not ACTIVE.

**Frontend behavior:** Do not invent a restriction. The parent-Aspect Select dropdown in the edit modal includes all same-year non-deleted Aspects regardless of status. The risk is documented in Section 19 (Risks). The backend remains authoritative for all lifecycle guards.

---

## 5. Chosen UX Design

### Selected: Option B — Expandable Hierarchical Table

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Corporate KPI         [Year ▼ 2026]  [Current] [Deleted]  [Search...] [+ Create]│
├──────────┬──────────────────┬────────┬──────┬────────┬────────┬──────────────┤
│  Code    │ Name             │ Type   │ Year │ Unit   │ Status │ Actions       │
├──────────┼──────────────────┼────────┼──────┼────────┼────────┼──────────────┤
│ ▼ FIN    │ Financial        │ Aspect │ 2026 │   –    │ ACTIVE │ ⋮             │
│   ▼ F01  │ Revenue Growth   │ Indic..│ 2026 │  %     │ ACTIVE │ ⋮             │
│   ► F02  │ Cost Reduction   │ Indic..│ 2026 │ Rp     │ DRAFT  │ ⋮             │
│ ► CUST   │ Customer         │ Aspect │ 2026 │   –    │ DRAFT  │ ⋮             │
└──────────┴──────────────────┴────────┴──────┴────────┴────────┴──────────────┘
```

### Why Option B over A (tree) or C (master-detail)

| Factor | Assessment |
|---|---|
| **Actual backend hierarchy** | Only 2 levels (ASPECT → INDICATOR). A full tree widget (Option A) is overkill for 2 levels. A table with expandable rows handles this cleanly. |
| **ERP usability** | Tables are the established ERP pattern in this codebase (employees, positions). Users are already familiar with table-based navigation and kebab actions. |
| **Current component library** | The `PositionTable` component already implements expandable tree-rows using `Table.ScrollContainer > Table.Content` with `buildTreeRows()` + `paddingLeft: depth * 24`. This is a proven pattern we can replicate exactly. |
| **Create/edit workflows** | Kebab dropdown actions per row ("Create Indicator", "Edit", "Activate", "Delete") mirror the existing position table pattern. |
| **Future Activity integration** | INDICATOR rows are the leaf nodes that Activities will reference. A table row is easy to extend with a "View Activities" action later without restructuring. |
| **Responsive behavior** | Table with horizontal scroll (`Table.ScrollContainer`) already handles narrow screens. Columns can be hidden on mobile if needed later. |
| **Data volume** | Tree endpoint returns the full hierarchy per year. Expected volume is small (5–20 ASPECT nodes, 20–100 INDICATOR nodes). No pagination needed — client-side rendering is sufficient. |

### Detail view

No separate detail page or master-detail panel is needed in P1. The table row + kebab actions + modal forms cover all operations. A detail page (`/hr/kpi/corporate/[id]`) is **deferred**.

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
- `expandedIds: Set<string>` in page-local UI state.
- Default: all ASPECT nodes expanded on initial load.
- "Expand All" / "Collapse All" buttons in the filter row.

### Parent-active behavior

- If an ASPECT is INACTIVE/DRAFT, its INDICATOR children cannot be set to ACTIVE (backend enforces, frontend shows an English error message).
- Creating an INDICATOR under any non-deleted ASPECT is always valid regardless of ASPECT status (creates a DRAFT indicator).
- An ACTIVE INDICATOR CAN be reparented to a DRAFT or INACTIVE ASPECT during update — backend allows it. The risk is that the INDICATOR cannot be reactivated if later deactivated. This is documented but not restricted in the UI.

---

## 7. Form Workflows

### Container: Modal

All create/edit operations use a **modal** (not a page route, not a drawer). This keeps users on the tree view and avoids adding 6+ new routes for a 2-level hierarchy.

Rationale: Corporate KPI forms have ≤7 fields — a modal is the appropriate container.

### 7.1 Create Aspect

| Aspect | Detail |
|---|---|
| **Entry point** | "Create" button (top-right) → opens modal with `nodeType=ASPECT` |
| **Fields** | Code*, Name*, Year*, Description |
| **Hidden / disabled fields** | `nodeType` = `ASPECT` (fixed), `parentId` = `null` (fixed), Unit = hidden, Target Value = hidden |
| **Validation (Zod)** | code: required, max 50; name: required, max 255; year: required, 2000–2100 |
| **Submit** | POST `/api/v1/corporate-kpis` with `nodeType: "ASPECT"` |
| **Form → DTO mapping** | `parentId: null`, `unit: null`, `targetValue: null` — explicit nulls |
| **Success** | `toast.success("Corporate KPI created successfully")`, modal closes, tree refreshes |
| **Error** | `toast.danger(mappedErrorMessage)` via error mapper |

### 7.2 Create Indicator (under Aspect)

| Aspect | Detail |
|---|---|
| **Entry point** | Kebab action "Create Indicator" on an ASPECT row → opens modal with `nodeType=INDICATOR`, `parentId` pre-filled |
| **Fields** | Code*, Name*, Unit*, Target Value*, Description |
| **Hidden / disabled fields** | `nodeType` = `INDICATOR` (fixed), `parentId` = `<selected ASPECT UUID>` (fixed), Year = `<ASPECT's year>` (auto-filled, read-only display) |
| **Validation (Zod)** | code: required, max 50; name: required, max 255; unit: required, max 50, non-blank; targetValue: required, strictly positive (z.number().positive()); description: optional |
| **Parent constraint** | `parentId` must be an ASPECT UUID. Year automatically matches parent's year. |
| **Submit** | POST `/api/v1/corporate-kpis` with `nodeType: "INDICATOR"`, `parentId`, `year` from parent |
| **Form → DTO mapping** | `parentId: string`, `unit: string`, `targetValue: number`, `description: string \| undefined` |
| **Success** | `toast.success("Indicator created successfully")`, modal closes, tree refreshes, parent ASPECT auto-expands |
| **Error** | `toast.danger(mappedErrorMessage)` |

### 7.3 Edit node

| Aspect | Detail |
|---|---|
| **Entry point** | Kebab action "Edit" on any row → opens modal in edit mode |
| **Aspect fields** | Code*, Name*, Description. Unit and Target Value hidden. |
| **Indicator fields** | Code*, Name*, Unit*, Target Value*, Description. Unit and Target Value are required (non-optional). Description is optional. |
| **Read-only display** | Type (Aspect/Indicator), Year (immutable in update DTO) |
| **Parent selection** | For Indicator: a Select dropdown of all same-year non-deleted Aspects (regardless of status). Parent CAN be changed to another Aspect in the same year. For Aspect: parent is always null (not shown). |
| **Can type/level be changed?** | No — `nodeType` is immutable. Backend update DTO has no `nodeType` field. |
| **Can year be changed?** | No — `year` is immutable. Backend update DTO has no `year` field. |
| **Are codes editable?** | Yes — code is in the update DTO. Backend validates uniqueness per year (excluding self). |
| **Validation (Zod)** | Aspect: code*, name*, description (optional). Indicator: code*, name*, unit* (required, non-blank), targetValue* (required, strictly positive), description (optional). |
| **Submit** | PUT `/api/v1/corporate-kpis/{id}` |
| **Form → DTO mapping (Aspect)** | `parentId: null`, `unit: null`, `targetValue: null` — explicit nulls |
| **Form → DTO mapping (Indicator)** | `parentId: string`, `unit: string`, `targetValue: number`, `description: string \| null` |
| **Success** | `toast.success("Corporate KPI updated successfully")`, modal closes, tree refreshes |
| **Error** | `toast.danger(mappedErrorMessage)` |

### Answers to explicit questions

| Question | Answer |
|---|---|
| How is an Aspect created? | "Create" button → modal with `nodeType=ASPECT` |
| How is an Indicator attached to an Aspect? | Kebab "Create Indicator" on Aspect row → modal with `parentId` pre-filled |
| Can a node's parent be changed during update? | Yes, for Indicator (via Select dropdown of same-year Aspects regardless of status). No, for Aspect (always root). |
| Can type/level be changed? | No — immutable. |
| How is the active year selected? | Year Select dropdown in the page header. Default = current year. Range = current year ± 3 years. |
| Are codes editable? | Yes. |
| What happens when a parent is inactive? | Indicator cannot be set to ACTIVE via status change (backend error `KPI_PARENT_MUST_BE_ACTIVE`). Creating/editing is still allowed. Reparenting an ACTIVE Indicator to an inactive Aspect is allowed by backend. |
| What actions are available for ACTIVE vs INACTIVE nodes? | See lifecycle section below. |
| Is unit required during Indicator edit? | Yes — always required, never optional. |
| Is targetValue required during Indicator edit? | Yes — always required, never optional. |
| Is description required during Indicator edit? | No — always optional. |

### Zod schema approach

Use **mode-specific discriminated schemas** rather than any field being weakened into optional values:

```typescript
// Mode-specific create schemas
const createAspectSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  year: z.number().int().min(2000).max(2100),
  description: z.string().optional(),
  // No unit, targetValue, parentId fields
});

const createIndicatorSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  unit: z.string().min(1).max(50),
  targetValue: z.number().positive({ message: "Target value must be greater than zero." }),
  parentId: z.string().uuid(),
  description: z.string().optional(),
  // No year (auto-filled from parent), no nodeType (fixed to INDICATOR)
});

// Edit schema — discriminated by node type
const editAspectSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  // unit and targetValue omitted (must be null for Aspect)
});

const editIndicatorSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  unit: z.string().min(1).max(50),
  targetValue: z.number().positive({ message: "Target value must be greater than zero." }),
  parentId: z.string().uuid(),
  description: z.string().optional(),
});
```

### Form-to-request mapping

Form schemas and backend request DTOs are not identical. Plan narrowly scoped mapper functions in the form-modal component:

**Create Aspect:**
```typescript
function toCreateRequest(data: CreateAspectForm): CreateCorporateKpiRequest {
  return {
    code: data.code,
    name: data.name,
    nodeType: "ASPECT",
    year: data.year,
    parentId: null,       // explicit null — backend expects nullable
    unit: null,           // explicit null — backend expects nullable
    targetValue: null,    // explicit null — backend expects nullable
    description: data.description ?? null,
  };
}
```

**Create Indicator:**
```typescript
function toCreateRequest(data: CreateIndicatorForm): CreateCorporateKpiRequest {
  return {
    code: data.code,
    name: data.name,
    nodeType: "INDICATOR",
    year: parentYear,     // from parent ASPECT, not from form
    parentId: data.parentId,
    unit: data.unit,
    targetValue: data.targetValue,
    description: data.description ?? null,
  };
}
```

**Update Aspect:**
```typescript
function toUpdateRequest(data: EditAspectForm): UpdateCorporateKpiRequest {
  return {
    code: data.code,
    name: data.name,
    parentId: null,       // explicit null for root
    unit: null,           // explicit null — ASPECT must not have unit
    targetValue: null,    // explicit null — ASPECT must not have targetValue
    description: data.description ?? null,
  };
}
```

**Update Indicator:**
```typescript
function toUpdateRequest(data: EditIndicatorForm): UpdateCorporateKpiRequest {
  return {
    code: data.code,
    name: data.name,
    parentId: data.parentId,
    unit: data.unit,
    targetValue: data.targetValue,
    description: data.description ?? null,
  };
}
```

**Numeric input handling:** Use `valueAsNumber: true` in RHF `register()`. If the field is blank, RHF produces `NaN`. The Zod schema must reject this with `z.number().positive()`. If the input is truly empty, show `"Target value is required."` — never expose `NaN` to the user as a technical message.

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
| DRAFT | "Activate" (→ ACTIVE) |
| ACTIVE | "Deactivate" (→ INACTIVE), "Set Draft" (→ DRAFT) |
| INACTIVE | "Activate" (→ ACTIVE), "Set Draft" (→ DRAFT) |

**UX decision:** Status changes do NOT require a confirmation modal (unlike delete). They use a kebab dropdown action that calls `PATCH /{id}/status` directly. If the backend rejects (e.g. parent not active), the error toast explains why.

**Rationale:** Status changes are reversible and non-destructive. A confirmation modal adds friction without safety benefit. The backend is the authoritative guard.

### Pending state for lifecycle actions

Each lifecycle action (status change, delete, restore) must track its own pending state:

```typescript
// In page component or hook
const [pendingAction, setPendingAction] = useState<{
  type: 'activate' | 'deactivate' | 'delete' | 'restore';
  nodeId: string;
} | null>(null);
```

While pending:
- The relevant submit/action button is disabled.
- Duplicate requests are prevented (the action does not fire if `pendingAction` is non-null).
- The existing Spinner convention is shown on the affected button or row.
- Unrelated rows remain usable.

### Delete

- Soft delete via `PATCH /{id}/delete`.
- Uses shared `DeleteConfirmDialog` component.
- Confirmation message: `"Delete [Code] - [Name]? This action can be undone later via the Deleted view."`
- Confirmation dialog has its own `isDeleting` pending state (disabling Confirm and Cancel buttons while in-flight).
- Guard: node must have 0 non-deleted children (`KPI_HAS_CHILDREN`).
- **Delete order:** Must delete Indicator first, then delete the now-childless Aspect.
- Attempting to delete an Aspect with non-deleted children produces the mapped English error.

### Restore

- Only available in the Deleted view.
- Backend `GET /deleted` returns all deleted nodes regardless of year.
- Restore via `POST /{id}/restore`.
- Restore action has its own `isRestoring` pending state.
- Guards: code must not conflict (`KPI_CODE_EXISTS`), parent must exist and be non-deleted (`KPI_PARENT_DELETED`).
- **Restore order:** Must restore Aspect first, then restore its Indicator children.
- Attempting to restore an Indicator whose parent is still deleted produces the mapped English error.

---

## 9. Permission Behavior

### Permission → UI mapping

All labels below use the canonical English terminology.

| Permission | Route access | Sidebar | Page visibility | UI elements gated |
|---|---|---|---|---|
| `corporate_kpi:read` | `/hr/kpi/corporate` | "Corporate KPI" sidebar item | Tree renders, read-only mode | — |
| `corporate_kpi:create` | — | — | — | "Create" button, "Create Indicator" kebab action |
| `corporate_kpi:update` | — | — | — | "Edit" kebab action, status-change kebab actions |
| `corporate_kpi:delete` | — | — | — | "Delete" kebab action |
| `corporate_kpi:restore` | — | — | — | "Restore" action in Deleted view |
| `corporate_kpi:read_deleted` | — | — | — | "Deleted" toggle button |

### User scenarios

| User type | What they see |
|---|---|
| **Read-only user** (`corporate_kpi:read` only) | Tree renders, no "Create" button, no kebab menu on rows (no mutation actions), no "Deleted" toggle. Deleted endpoint is never called. |
| **Corporate KPI manager** (all 6 permissions) | Full tree, all create/edit/delete/restore/status actions visible in kebab menu. "Create" button visible. "Deleted" toggle visible. |
| **User without any `corporate_kpi:*` permission** | Sidebar item hidden (sidebar uses `some()` — `corporate_kpi:read` is the listed permission). Page not navigable. If accessed directly, AuthGuard / page-level guard blocks with English access-denied Alert. |

### Implementation

- Page-level: `usePermission()` hook + `PERM.CORPORATE_KPI_READ` guard. If user lacks read permission, show `<Alert status="danger">Access Denied</Alert>`.
- Action-level: each button/action wrapped in `hasPerm(PERM.CORPORATE_KPI_CREATE/UPDATE/DELETE/RESTORE)`.
- No new authorization framework created. Uses existing `usePermission()` + `PERM.*` constants.
- Permission hiding is UX only; backend remains authoritative.

---

## 10. Filtering and Navigation

### Controls (minimal set for v1)

| Control | Implementation | Default |
|---|---|---|
| **Year Select** | `<Select>` with years (current year ± 3 years) | Current year |
| **View toggle** | Two `<Button>` tabs: "Current KPIs" / "Deleted KPIs". Permission-gated Deleted tab requires `corporate_kpi:read_deleted`. If user lacks this permission, the Deleted tab is hidden entirely. | Current KPIs |
| **Text search** | `<SearchField>` — client-side filter on code + name within currently visible records | Empty |
| **Expand/Collapse all** | Two buttons: "Expand All" / "Collapse All" | All expanded |

### NOT included in v1

- Status filter — backend tree endpoint returns all statuses. Client-side status filtering adds complexity for low value. **Deferred.**
- Level/type filter — only 2 types (ASPECT/INDICATOR). Visual indentation already differentiates them. **Deferred.**

### Behavior

| Scenario | Behavior |
|---|---|
| Default year | Current year (`new Date().getFullYear()`) |
| Year change | Refetch tree: `GET /tree?year={newYear}`. Deleted list refilters client-side (no new fetch). |
| Empty result (Current) | `<Surface>` with centered icon + "No Corporate KPIs found for the selected year." |
| Empty result (Deleted) | `<Surface>` with centered icon + "No deleted Corporate KPIs found for the selected year." |
| After refresh (F5) | Year defaults to current year, Current view, tree refetches. Deleted data not fetched (lazy). |
| Direct navigation | Page loads with default year, Current view, tree fetches. |
| Filter state in URL | **Not in v1.** Year and view are local state. **Deferred.** |
| Selected node in URL | **Not in v1.** No detail page route. **Deferred.** |

### Deleted-view behavior

- The backend `GET /deleted` endpoint returns all deleted nodes across all years (flat list, not hierarchical).
- **Lazy, permission-safe fetch:**
  - Initial page load fetches only the current-year tree (no `/deleted` call).
  - The `/deleted` endpoint is NOT called for users without `corporate_kpi:read_deleted`.
  - Deleted data is fetched only when an authorized user first switches to "Deleted KPIs".
  - Reopening the view reuses the in-memory result unless a mutation made it stale.
  - Switching the year Select filters the already-fetched deleted list client-side.
  - A "Refresh" button is available in the Deleted view for failed or stale fetches.
- P1 page retains one selected year for both Current and Deleted views.
- When the Deleted view is active, the downloaded list is **filtered client-side** to the selected year.
- The Year column remains visible in both views.
- The deleted list is flat (no parent-child hierarchy). The `parentName` field helps identify where each node belonged.
- No new backend endpoint is requested.

### Search behavior

For **Current KPIs** (hierarchical):
- `SearchField` filters the currently-loaded tree client-side (code + name match).
- A matching Indicator keeps its parent Aspect visible (even if the Aspect itself doesn't match).
- Matching parent Aspects are expanded in the filtered result.
- Clearing search restores the user's previous `expandedIds` state — search must not permanently mutate `expandedIds`.
- No debounce needed since it's client-side filtering.

For **Deleted KPIs** (flat):
- Simple flat list filter by code + name.

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

### Query keys / cache

No React Query → no query keys or cache layer. Data refetch is via explicit `fetchTree()` / `fetchDeleted()` calls.

### `useCorporateKpiData` hook — server state ONLY

The data hook owns:

| Responsibility | Detail |
|---|---|
| **Hierarchy data** | `tree: CorporateKpiNode[]`, fetched via `GET /tree?year={year}` |
| **Deleted data** | `deletedList: CorporateKpiNode[]`, fetched via `GET /deleted` |
| **Loading state** | `isLoading: boolean`, `isLoadingDeleted: boolean` |
| **Server error state** | `error: string \| null` |
| **Fetch functions** | `fetchTree(year)`, `fetchDeleted()` |
| **Create mutation** | `createNode(payload)` → POST → refreshes tree |
| **Update mutation** | `updateNode(id, payload)` → PUT → refreshes tree |
| **Status mutation** | `changeStatus(id, status)` → PATCH → refreshes tree |
| **Delete mutation** | `deleteNode(id)` → PATCH → refreshes tree AND deleted data if previously loaded |
| **Restore mutation** | `restoreNode(id)` → POST → refreshes tree AND deleted data |
| **Mutation pending state** | Per-action pending flags exposed to page |

The hook does NOT own: year, search query, view toggle, expanded IDs, modal state, or dialog state.

### Page-local UI state

The page component owns:

| State | Type | Purpose |
|---|---|---|
| `selectedYear` | `number` | Currently selected year, passed to hook for tree fetch |
| `searchQuery` | `string` | Search field text (client-side filter) |
| `viewMode` | `'current' \| 'deleted'` | Which view is active |
| `hasFetchedDeleted` | `boolean` | Whether deleted data has been fetched at least once |
| `expandedIds` | `Set<string>` | Which ASPECT nodes are expanded |
| `createModalState` | `{ open: boolean; nodeType: 'ASPECT' \| 'INDICATOR'; parentId?: string } \| null` | Controls create modal |
| `editModalState` | `{ open: boolean; node: CorporateKpiNode } \| null` | Controls edit modal |
| `deleteDialogState` | `{ open: boolean; node: CorporateKpiNode } \| null` | Controls delete confirmation dialog |

### Refresh matrix after mutations

Server-confirmed refresh (no optimistic updates):

| Mutation | Refresh tree | Refresh deleted data |
|---|---|---|
| Create | Yes | No |
| Update | Yes | No |
| Change status | Yes | No |
| Delete | Yes | Yes, if deleted data was previously loaded |
| Restore | Yes | Yes |

Restore must refresh both views so switching back to "Current KPIs" never displays stale data.

**Year handling:** `fetchTree(selectedYear)` is called after every mutation that refreshes the tree, using the current `selectedYear` from page state.

### Form state

React Hook Form + Zod resolver (existing pattern from `EmployeeForm`). Schemas are mode-specific (see Section 7.3).

The `kpi-node-form-modal.tsx` component encapsulates form state internally. It receives an `onSubmit` callback and does not expose form internals to the page. The form submits via the callback and manages its own `isSubmitting` pending state, disabling the Save button and showing a Spinner while in-flight.

### What we do NOT create

- Generic entity CRUD framework
- Generic hierarchy engine
- Global KPI Zustand store
- React Query / TanStack Query integration
- Speculative abstractions for Activity or Report
- Localization / translation infrastructure
- A generic mutation-pending framework (per-action flags are sufficient)

---

## 12. Proposed File Changes

### CREATE

```
src/modules/hr/kpi/corporate/
├── types.ts                                        # CorporateKpiNode, request/response DTOs, enums
├── services/
│   └── corporate-kpi-api.ts                        # API module (7 endpoints — excludes getById)
├── hooks/
│   └── use-corporate-kpi-data.ts                   # Tree + deleted + CRUD hook (server state only)
├── utils/
│   └── corporate-kpi-error-mapper.ts               # Domain-error mapper (English messages) — created in P1.2
├── components/
│   ├── corporate-kpi-table.tsx                     # Expandable tree-table (primary component)
│   ├── kpi-node-form-modal.tsx                     # Create/edit modal (Aspect + Indicator modes)
│   ├── kpi-status-badge.tsx                        # Status badge (DRAFT/ACTIVE/INACTIVE)
│   └── kpi-empty-state.tsx                         # Empty tree state
└── __tests__/
    ├── corporate-kpi-api.test.ts                   # API contract tests (7 methods)
    ├── corporate-kpi-table.test.tsx                 # Hierarchy rendering + search + status badges + row actions
    ├── kpi-node-form-modal.test.tsx                 # Mode-specific forms, validation, DTO mapping
    ├── corporate-kpi-page.test.tsx                  # Page orchestration: permissions, view toggle, refresh, lazy fetch
    └── corporate-kpi-error-mapper.test.ts           # Error mapper tests (created in P1.2)
```

### MODIFY

```
src/app/(main)/hr/kpi/corporate/page.tsx             # Replace placeholder with full implementation
src/modules/hr/kpi/__tests__/page-shells.test.tsx     # Update Corporate page shell test
src/__mocks__/heroui-react.tsx                        # Add needed mock exports (Table, Modal, Select, Badge, etc.)
src/__mocks__/phosphor-icons-react.tsx                # Add icons used by P1
```

### REMOVE

(none)

### DEFER

```
src/app/(main)/hr/kpi/corporate/[id]/page.tsx        # Detail page — deferred (tree has all data)
src/modules/hr/kpi/corporate/components/
    kpi-node-detail-panel.tsx                         # Master-detail panel — deferred
```

### File count rationale

- 1 types file
- 1 API service file (7 methods)
- 1 hook file (server state only, no UI state)
- 1 error mapper utility file (created in P1.2)
- 4 component files (table, form modal, status badge, empty state)
- 5 test files (API, table, form-modal, page, error-mapper)
- Minimal — no one-line files

---

## 13. Component Design

### `corporate-kpi-table.tsx`

| Aspect | Detail |
|---|---|
| **Responsibility** | Render the ASPECT → INDICATOR hierarchy as an expandable table with per-row kebab actions. Handles Current view (hierarchical tree with expand/collapse) and Deleted view (flat list). |
| **Inputs** | `tree: CorporateKpiNode[]`, `deletedList: CorporateKpiNode[]`, `viewMode`, `expandedIds`, `onToggleExpand`, `searchQuery`, `isLoading`, callback handlers for create/edit/delete/status actions |
| **Owns server state?** | No — presentation only. All mutations delegated to parent via callbacks. |
| **Owns `expandedIds`?** | No — receives from page, delegates toggle up. |
| **Search filter** | Applied internally (client-side) before rendering rows. |
| **Genuinely reusable?** | No — specific to Corporate KPI hierarchy. |
| **Pattern** | Replicates `PositionTable` tree-view: `buildTreeRows()` flattens tree, `paddingLeft: depth * 24` for indentation, caret toggle for ASPECT rows. |

### `kpi-node-form-modal.tsx`

| Aspect | Detail |
|---|---|
| **Responsibility** | Modal form for creating Aspect, creating Indicator, and editing any node. Uses React Hook Form + Zod with mode-specific discriminated schemas. Contains narrow form-to-DTO mapper functions. |
| **Inputs** | `mode: 'create-aspect' \| 'create-indicator' \| 'edit-aspect' \| 'edit-indicator'`, `node?` (for edit), `parentAspects: CorporateKpiNode[]` (for Indicator parent selection), `onSubmit(data) => Promise<void>`, `isOpen`, `onClose` |
| **Populated by** | The page component reads the current node to determine mode and passes pre-filled values. |
| **Owns server state?** | No — calls `onSubmit` callback from page, which calls hook method. Form state (RHF) is internal to the modal. |
| **Manages pending state** | `isSubmitting: boolean` — disables Save button, prevents duplicate submit. |
| **Fields shown** | Dynamic based on mode and nodeType. See Section 7.3 for exact field sets. |
| **DTO mapping** | Narrow mapper functions inside the modal component, called on form submit before invoking `onSubmit`. |
| **Genuinely reusable?** | No — specific to Corporate KPI node form. |

### `kpi-status-badge.tsx`

| Aspect | Detail |
|---|---|
| **Responsibility** | Render a Badge for DRAFT/ACTIVE/INACTIVE status. |
| **Inputs** | `status: string` |
| **Owns server state?** | No — pure presentation. |
| **Genuinely reusable?** | Borderline — could be reused by Activity (P2) which has different statuses. Keep as Corporate-KPI-local for now. |
| **Badge variant mapping** | DRAFT → `secondary`, ACTIVE → `primary`, INACTIVE → `soft` |

### `kpi-empty-state.tsx`

| Aspect | Detail |
|---|---|
| **Responsibility** | Centered Surface with icon + message for empty tree or empty deleted list. |
| **Inputs** | `viewMode: 'current' \| 'deleted'`, `year: number` |
| **Owns server state?** | No — pure presentation. |
| **Genuinely reusable?** | No. |

### `corporate-kpi-error-mapper.ts` (created in P1.2)

| Aspect | Detail |
|---|---|
| **Responsibility** | Map backend error codes/strings to user-facing English messages. Single function `mapKpiError(error: unknown): string`. |
| **Inputs** | Raw error from `extractErrorMessage()` or API response. |
| **Output** | User-readable English string suitable for `toast.danger()`. |
| **Genuinely reusable?** | No — specific to Corporate KPI domain errors. |
| **Messages** | See Section 14. |

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

**Number field:** `z.number().positive()` — rejects zero and negative values. Use `valueAsNumber: true` in RHF `register()`. Blank input produces `NaN` which Zod catches as a type error, producing `"Target value is required."` (not `NaN`).

#### Create Aspect schema

| Field | Rule | Message |
|---|---|---|
| `code` | Required, max 50 chars | "Code is required" / "Code must be at most 50 characters" |
| `name` | Required, max 255 chars | "Name is required" / "Name must be at most 255 characters" |
| `year` | Required, 2000–2100 | "Year is required" / "Year must be between 2000 and 2100" |
| `description` | Optional | — |

#### Create Indicator schema

| Field | Rule | Message |
|---|---|---|
| `code` | Required, max 50 chars | "Code is required" / "Code must be at most 50 characters" |
| `name` | Required, max 255 chars | "Name is required" / "Name must be at most 255 characters" |
| `unit` | Required, non-blank, max 50 | "Unit is required" / "Unit must be at most 50 characters" |
| `targetValue` | Required, strictly positive | "Target value is required" / "Target value must be greater than zero" |
| `parentId` | Required (UUID) | Fixed — pre-filled from ASPECT row |
| `description` | Optional | — |

#### Edit Aspect schema

| Field | Rule | Message |
|---|---|---|
| `code` | Required, max 50 | Same as above |
| `name` | Required, max 255 | Same as above |
| `description` | Optional | — |

#### Edit Indicator schema

| Field | Rule | Message |
|---|---|---|
| `code` | Required, max 50 | Same as above |
| `name` | Required, max 255 | Same as above |
| `unit` | Required, non-blank, max 50 | "Unit is required" |
| `targetValue` | Required, strictly positive | "Target value must be greater than zero" |
| `parentId` | Required (UUID) | Shown as Select dropdown of same-year Aspects |
| `description` | Optional | — |

### Domain-error mapper (created in P1.2)

A small Corporate-KPI-local utility (`utils/corporate-kpi-error-mapper.ts`) maps known backend failures to user-facing English messages:

```typescript
function mapKpiError(error: unknown): string {
  const raw = extractErrorMessage(error, "");

  const known: Record<string, string> = {
    "Corporate KPI code already exists in this year":
      "A Corporate KPI with this code already exists for the selected year.",
    "An INDICATOR must have an ASPECT parent":
      "The selected parent is not a valid Aspect.",
    "An ASPECT must not have a unit or target value":
      "An Aspect cannot have a unit or target value.",
    "Parent and child must be in the same year":
      "The Indicator and its parent Aspect must belong to the same year.",
    "An INDICATOR can only become ACTIVE when its parent ASPECT is ACTIVE":
      "An Indicator cannot be activated while its parent Aspect is inactive.",
    "Cannot deactivate ASPECT — it has ACTIVE INDICATOR children":
      "This Aspect cannot be deactivated while it has active Indicators.",
    "Cannot delete — KPI node still has active children":
      "Delete all child Indicators before deleting this Aspect.",
    "Cannot restore — parent KPI is deleted":
      "Restore the parent Aspect before restoring this Indicator.",
    "Corporate KPI not found":
      "The Corporate KPI could not be found.",
    "ACCESS_DENIED":
      "You do not have permission to perform this action.",
  };

  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }

  return raw || "Something went wrong while processing the Corporate KPI request.";
}
```

### Backend validation mapping

| Backend error code / detail | Frontend behavior |
|---|---|
| `KPI_CODE_EXISTS` | `mapKpiError` → "A Corporate KPI with this code already exists…" → `toast.danger` |
| `KPI_INDICATOR_REQUIRES_ASPECT_PARENT` | `mapKpiError` → should not happen if UI prevents wrong parent selection |
| `KPI_PARENT_MUST_BE_ACTIVE` | `mapKpiError` → shown when user tries to activate Indicator under non-active Aspect |
| `KPI_ASPECT_HAS_ACTIVE_CHILDREN` | `mapKpiError` → shown when user tries to deactivate Aspect with active children |
| `KPI_HAS_CHILDREN` | `mapKpiError` → shown when user tries to delete Aspect with Indicator children |
| `KPI_PARENT_DELETED` | `mapKpiError` → shown on restore when parent is deleted |
| `KPI_NOT_FOUND` (404) | `toast.danger("The Corporate KPI could not be found.")` — stale state, tree refreshes |
| Forbidden (403) | `toast.danger("You do not have permission to perform this action.")` |
| Unknown server error | `toast.danger("Something went wrong while processing the Corporate KPI request.")` |

### Error display format

All errors use `extractErrorMessage(error, fallbackMessage)` from `@/types/api`, then pass through the Corporate-KPI-local error mapper before display.

**No raw stack traces, SQL errors, internal class names, or technical diagnostics are exposed.**

### Forbidden (403) behavior

If user triggers an action without permission (e.g. via devtools), backend returns 403 `ProblemDetail` with `ACCESS_DENIED`. The error mapper catches this and shows a user-readable English message. Frontend permission gates prevent this in normal usage.

---

## 15. Automated Test Plan

### Test infrastructure

- Jest 30 + Testing Library (existing setup)
- HeroUI and Phosphor mocks need expansion for new components used
- Tests in `src/modules/hr/kpi/corporate/__tests__/`

### Test files and responsibilities

#### `corporate-kpi-api.test.ts`

Tests only the API service module. No JSX, no rendering.

| Test | Description |
|---|---|
| `getTreeByYear` calls correct endpoint | Verifies `GET /api/v1/corporate-kpis/tree?year=2026` |
| `getTreeByYear` unwraps `ApiResponse` | Verifies data is extracted from `ApiResponse.data` |
| `getDeleted` calls correct endpoint | Verifies `GET /api/v1/corporate-kpis/deleted` |
| `create` sends correct payload | Verifies POST with all fields including nodeType, explicit nulls for Aspect |
| `update` sends PUT with full payload | Verifies PUT with code, name, unit, targetValue, description, parentId |
| `changeStatus` sends PATCH | Verifies `PATCH /{id}/status` with `{ status }` |
| `delete` sends PATCH | Verifies `PATCH /{id}/delete` |
| `restore` sends POST | Verifies `POST /{id}/restore` |
| error propagation | Mock 400 → verify error thrown, `extractErrorMessage` can parse it |
| `ApiResponse` unwrapping with edge cases | Mock response with no data field, verify error handling |
| **`getById` is NOT implemented** | Not tested — no method exists |

#### `corporate-kpi-table.test.tsx`

Tests only the table component rendering. Uses controlled props with mock callbacks.

| Test | Description |
|---|---|
| Renders Aspect root node | Verify name, code, type badge visible |
| Renders Indicator under expanded Aspect | Expand → verify child rows appear |
| Collapsed Aspect hides children | Default collapsed → children not in document |
| Empty tree shows empty state | No nodes → "No Corporate KPIs found" message |
| INACTIVE status badge renders | Verify badge text |
| Hierarchy search: matching child shows parent | Search query → verify matching Indicator row AND parent Aspect visible |
| Hierarchy search preserves expand state after clear | Search filter, clear → verify original expandedIds restored |
| Deleted view shows flat list | Switch to deleted → verify flat rows without caret toggle |
| Deleted view: simple search | Search by code/name in flat list |
| Create Indicator action callback | Click kebab "Create Indicator" → verify callback invoked with parentId |
| Edit action callback | Click kebab "Edit" → verify callback invoked with node |
| Delete action callback | Click kebab "Delete" → verify callback invoked with node |
| Activate/Deactivate action callbacks | Click kebab status action → verify correct callback invoked |

#### `kpi-node-form-modal.test.tsx`

Tests the form modal component in isolation. Renders with mock `onSubmit`.

| Test | Description |
|---|---|
| Create Aspect: shows correct fields | Code, Name, Year visible; Unit and Target Value hidden |
| Create Indicator: shows correct fields | Code, Name, Unit, Target Value, Description visible; Year hidden |
| Edit Aspect: shows correct fields | Code, Name, Description; Unit and Target Value hidden |
| Edit Indicator: shows correct fields | Code, Name, Unit, Target Value, Description, parent Select |
| Required validation: empty code rejected | Submit with empty code → validation error |
| Required validation: empty name rejected | Submit with empty name → validation error |
| Required validation: empty unit rejected | Submit Indicator with empty unit → "Unit is required" |
| Required validation: empty targetValue rejected | Submit Indicator with no targetValue → "Target value is required" |
| Validation: targetValue zero rejected | Submit with 0 → "Target value must be greater than zero" |
| Validation: targetValue negative rejected | Submit with -1 → "Target value must be greater than zero" |
| Validation: blank numeric input | Submit with empty targetValue → "Target value is required" (no NaN message) |
| DTO mapping: Aspect create sends explicit nulls | Verify `parentId: null`, `unit: null`, `targetValue: null` in submitted request |
| DTO mapping: Indicator create sends nodeType + year | Verify `nodeType: "INDICATOR"`, `year: parentYear` |
| DTO mapping: Aspect update sends explicit nulls | Verify `parentId: null`, `unit: null`, `targetValue: null` in update request |
| DTO mapping: Indicator update does NOT send nodeType/year | Verify no nodeType or year fields in update request |
| Submit disabled while pending | Simulate pending submit → Save button disabled |
| Error display | Mock onSubmit rejection → verify error shown |
| Description optional in all modes | Verify Description accepted as optional or empty |

#### `corporate-kpi-page.test.tsx`

Tests the page component orchestration: permissions, view toggle, lazy fetch, refresh behavior.

| Test | Description |
|---|---|
| Page renders with read permission | Mock `corporate_kpi:read` → tree visible, no mutation actions |
| Page renders access-denied without read permission | Mock no read perm → access-denied Alert shown |
| Create button hidden for read-only user | Mock only read perm → "Create" button absent |
| Deleted tab hidden without `read_deleted` | Mock no `read_deleted` → Deleted tab not rendered |
| User with all perms sees all actions | Mock all 6 perms → Create button, kebab items, Deleted tab visible |
| Year selection triggers tree refetch | Change year → verify tree refetched with new year |
| Initial load does NOT fetch deleted | Verify `/deleted` endpoint NOT called on page mount |
| Switching to Deleted tab triggers lazy fetch | Navigate to Deleted → verify `/deleted` called |
| Read-only user never calls `/deleted` | Mock only read perm → open Deleted tab → verify no `/deleted` call |
| Create mutation refreshes tree | Mock create → verify tree refetched, deleted NOT refetched |
| Delete mutation refreshes both | Mock delete → verify tree AND deleted refetched (if deleted was previously loaded) |
| Restore mutation refreshes both | Mock restore → verify tree AND deleted refetched |
| Empty state for current year | No tree data → "No Corporate KPIs found for the selected year." |
| Empty state for deleted view | No deleted data → "No deleted Corporate KPIs found for the selected year." |
| All rendered labels and messages are English | Scan rendered output for any Indonesian text → fail if found |

#### `corporate-kpi-error-mapper.test.ts` (created in P1.2)

| Test | Description |
|---|---|
| Maps duplicate code error | Input includes "Corporate KPI code already exists in this year" → mapped English message |
| Maps inactive parent error | Input includes "An INDICATOR can only become ACTIVE when its parent ASPECT is ACTIVE" → mapped message |
| Maps active children error | Input includes "Cannot deactivate ASPECT — it has ACTIVE INDICATOR children" → mapped message |
| Maps delete-with-children error | Input includes "Cannot delete — KPI node still has active children" → mapped message |
| Maps restore-with-deleted-parent error | Input includes "Cannot restore — parent KPI is deleted" → mapped message |
| Maps not-found error | Input includes "Corporate KPI not found" → mapped message |
| Maps access-denied error | Input includes "ACCESS_DENIED" → "You do not have permission…" |
| Falls back for unknown error | Input: unknown string → generic fallback message |
| Falls back for empty error | Input: empty string → generic fallback message |

### English-only verification

After all tests above pass, a separate check verifies:
- No Indonesian user-facing text is introduced in P1 rendered components.
- All labels, messages, and placeholders in the component files are English.

### Existing tests that must still pass

- `page-shells.test.tsx` — update the Corporate page shell test to check for real page elements.
- `sidebar.test.ts` — unchanged, no sidebar modifications in P1.

### Test count note

Do not hardcode a speculative final test count. Report the actual count after execution.

---

## 16. Manual Smoke-Test Plan

**Not executed by the implementation agent. Provided for the user to run against the real backend.**

1. Login as ADMIN (has all 6 Corporate KPI permissions).
2. Navigate to `/hr/kpi/corporate`.
3. Verify page loads with current year (2026) and empty tree. Note: `/deleted` endpoint is NOT called on initial load.
4. Click "Create" → create an Aspect (code: `FIN`, name: `Financial`, year: 2026).
5. Verify Aspect appears in tree, expanded, with DRAFT status.
6. Click kebab on Aspect → "Create Indicator" → create Indicator (code: `F01`, name: `Revenue Growth`, unit: `%`, targetValue: `10.5`).
7. Verify Indicator appears under Aspect with DRAFT status.
8. Try to activate Indicator → expect error (parent Aspect is DRAFT).
9. Activate Aspect first → then activate Indicator → both show ACTIVE.
10. Edit Indicator → change name → save → verify update reflected.
11. Edit Indicator → change parent to another Aspect (if exists) → verify move works regardless of target Aspect's status.
12. Edit Indicator → clear targetValue → verify frontend validation rejects (required, must be positive).
13. Try to delete Aspect with active children → expect error: "Delete all child Indicators before deleting this Aspect."
14. Deactivate Indicator → delete Indicator first → verify it disappears from Current view.
15. Delete now-childless Aspect → verify it disappears.
16. Switch to "Deleted KPIs" — verify lazy fetch triggers and both deleted nodes appear.
17. Verify deleted list is filtered to the selected year (client-side).
18. Try to restore Indicator while its parent Aspect is still deleted → expect error: "Restore the parent Aspect before restoring this Indicator."
19. Restore Aspect first → verify it returns.
20. Restore Indicator → verify it returns.
21. Switch back to "Current KPIs" → verify both nodes are visible.
22. Login as read-only user → verify no mutation buttons/actions visible; Deleted tab absent; tree renders in read-only mode.
23. Login as user without `corporate_kpi:read` → verify sidebar item absent and direct URL redirects or shows access-denied.
24. Verify the resulting ACTIVE Indicator is usable later by Activity creation (P2 dependency — note for future).

---

## 17. Phased Implementation Plan

### P1.1 — Read-only Corporate KPI vertical slice

**Scope:**
- TypeScript types and enums required for reads
- API methods: `getTreeByYear()`, `getDeleted()`
- Data hook: read-only behavior (fetch tree, fetch deleted)
- Year selector (current year ± 3)
- Client-side search with hierarchical awareness (matching child keeps parent visible)
- Current/Deleted view toggle
- Expandable hierarchy table with expand/collapse all
- Loading state (centered Spinner)
- Empty state (per view mode)
- Error state (network errors)
- Page-level read permission guard
- Status badge component (presentation only)
- Lazy, permission-safe deleted-data fetch (not called on initial load, only when user with `corporate_kpi:read_deleted` first opens Deleted tab)
- Deleted list fetched from `/deleted`, filtered client-side by selected year
- `page-shells.test.tsx` update
- API contract tests for read methods
- Table rendering tests
- Page-level tests (permissions, lazy deleted fetch, year selection)

**What is NOT in P1.1:**
- No create/update API methods
- No mutation stubs in hook
- No error mapper (created in P1.2)
- No form component (created in P1.2)
- No lifecycle actions (created in P1.3)
- No empty future component files

**Expected files (P1.1 only):**
- `src/modules/hr/kpi/corporate/types.ts` (CREATE)
- `src/modules/hr/kpi/corporate/services/corporate-kpi-api.ts` (CREATE — tree + deleted methods only)
- `src/modules/hr/kpi/corporate/hooks/use-corporate-kpi-data.ts` (CREATE — read-only, no mutation stubs)
- `src/modules/hr/kpi/corporate/components/corporate-kpi-table.tsx` (CREATE)
- `src/modules/hr/kpi/corporate/components/kpi-status-badge.tsx` (CREATE)
- `src/modules/hr/kpi/corporate/components/kpi-empty-state.tsx` (CREATE)
- `src/app/(main)/hr/kpi/corporate/page.tsx` (MODIFY — full page with read-only tree)
- `src/modules/hr/kpi/__tests__/page-shells.test.tsx` (MODIFY — update Corporate tests)
- `src/__mocks__/heroui-react.tsx` (MODIFY — add Table, Badge, etc.)
- `src/__mocks__/phosphor-icons-react.tsx` (MODIFY — add icons)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-api.test.ts` (CREATE — read method tests)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-table.test.tsx` (CREATE — rendering + search)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-page.test.tsx` (CREATE — permissions, view toggle, lazy fetch)

**Acceptance criteria:**
- Authorized user can open `/hr/kpi/corporate`.
- ASPECT → INDICATOR hierarchy renders with expand/collapse.
- Year selector (current year ± 3) refetches tree.
- Deleted view shows flat list filtered to selected year (lazy fetched on first open).
- `/deleted` is never called for users without `corporate_kpi:read_deleted`.
- Client-side search shows matching nodes with parent context preserved.
- Clearing search restores original expand state.
- Empty state, loading state, and error state render correctly.
- Read-only user sees tree without mutation actions, no Deleted tab.
- No mutation action buttons exist yet.
- All user-facing text is English.

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest"
```

**Suggested commit:**
```
feat(kpi): add corporate KPI hierarchy view

- Expandable tree-table rendering ASPECT → INDICATOR hierarchy
- Year selector (current year ± 3) with tree refetch
- Current/Deleted view toggle with lazy permission-safe fetch
- Hierarchical client-side search preserving parent context
- Status badges, empty states, loading states
- Page-level read permission guard
- All user-facing text in English
```

---

### P1.2 — Create and update workflows

**Scope:**
- API methods: `createNode()`, `updateNode()`
- Data hook: create/update mutations with server-confirmed refresh
- `kpi-node-form-modal.tsx` with mode-specific Zod schemas and form-to-DTO mappers
- Create Aspect modal (nodeType fixed, parentId/unit/targetValue: explicit null)
- Create Indicator modal (parentId pre-filled, year from parent)
- Edit Aspect modal (unit/targetValue hidden)
- Edit Indicator modal (unit/targetValue required, description optional)
- Parent Select for Indicator edit (all same-year Aspects regardless of status)
- Success/error toast with error mapper
- Frontend validation (required fields, positive targetValue, blank numeric → "required" message)
- Permission gates for create/update
- Error mapper utility + tests
- Form-modal tests
- Pending `isSubmitting` state

**Expected files (P1.2 additions):**
- `src/modules/hr/kpi/corporate/services/corporate-kpi-api.ts` (MODIFY — add createNode, updateNode)
- `src/modules/hr/kpi/corporate/hooks/use-corporate-kpi-data.ts` (MODIFY — add create/update mutations)
- `src/modules/hr/kpi/corporate/components/kpi-node-form-modal.tsx` (CREATE)
- `src/modules/hr/kpi/corporate/utils/corporate-kpi-error-mapper.ts` (CREATE)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-api.test.ts` (MODIFY — add create/update tests)
- `src/modules/hr/kpi/corporate/__tests__/kpi-node-form-modal.test.tsx` (CREATE)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-error-mapper.test.ts` (CREATE)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-page.test.tsx` (MODIFY — add create/update permission tests)
- `src/app/(main)/hr/kpi/corporate/page.tsx` (MODIFY — add create/update handlers, modal state)

**Acceptance criteria:**
- Authorized user can create Aspect and Indicator.
- Create Aspect: sends `parentId: null`, `unit: null`, `targetValue: null`.
- Create Indicator: sends `nodeType: "INDICATOR"`, `parentId`, `year` from parent.
- Edit Aspect: only code, name, description shown; sends explicit nulls for parentId/unit/targetValue.
- Edit Indicator: code, name, unit, targetValue, parentId shown; sends without nodeType or year.
- Zero and negative targetValue rejected by frontend validation.
- Blank numeric input produces "Target value is required." (not NaN).
- Unit required and non-blank for Indicator create and edit.
- Description optional in all modes.
- Parent Aspect dropdown contains all same-year Aspects (any status).
- Submit button disabled while `isSubmitting`.
- Success toast + tree refresh after create/update.
- Backend errors mapped to English messages.
- Read-only user cannot see create/edit actions.

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

**Suggested commit:**
```
feat(kpi): add corporate KPI create and edit workflows

- Mode-specific Zod schemas with form-to-DTO mapper functions
- Create Aspect sends explicit nulls for parentId/unit/targetValue
- Create Indicator pre-fills parentId and year from parent
- Edit Indicator requires unit and targetValue (strictly positive)
- Description optional in all modes
- Blank numeric input handled as "required" (no NaN)
- Error mapper for user-facing English messages
- Permission-gated create/update with pending state
```

---

### P1.3 — Lifecycle and deleted workflow

**Scope:**
- API methods: `changeStatus()`, `deleteNode()`, `restoreNode()`
- Data hook: status/delete/restore mutations with server-confirmed refresh
- Kebab dropdown: "Activate", "Deactivate", "Set Draft"
- `DeleteConfirmDialog` integration with English confirmation text
- Deleted view: "Restore" kebab action
- Lifecycle constraint UX (backend errors mapped to English)
- Per-action pending state (isChangingStatus, isDeleting, isRestoring)
- Correct refresh matrix (tree after status/delete; tree + deleted after delete/restore)
- Permission gates for all lifecycle actions
- Lifecycle-focused tests and page-level orchestration tests

**Expected files (P1.3 additions):**
- `src/modules/hr/kpi/corporate/services/corporate-kpi-api.ts` (MODIFY — add changeStatus, delete, restore)
- `src/modules/hr/kpi/corporate/hooks/use-corporate-kpi-data.ts` (MODIFY — add lifecycle mutations, pending flags)
- `src/modules/hr/kpi/corporate/components/corporate-kpi-table.tsx` (MODIFY — add lifecycle kebab actions)
- `src/app/(main)/hr/kpi/corporate/page.tsx` (MODIFY — add lifecycle handlers, dialog state, pending state)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-api.test.ts` (MODIFY — add lifecycle method tests)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-table.test.tsx` (MODIFY — add lifecycle action callback tests)
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-page.test.tsx` (MODIFY — add lifecycle orchestration + refresh matrix tests)

**Acceptance criteria:**
- Kebab dropdown shows status actions based on current status.
- Activate calls `PATCH /{id}/status` with `ACTIVE`.
- Deactivate calls `PATCH /{id}/status` with `INACTIVE`.
- Delete opens `DeleteConfirmDialog` with English confirmation text.
- Delete dialog has `isDeleting` pending state (Confirm + Cancel disabled while in-flight).
- Delete calls `PATCH /{id}/delete`, refreshes tree + deleted data (if previously loaded).
- Restore action has `isRestoring` pending state.
- Restore calls `POST /{id}/restore`, refreshes tree + deleted data.
- Domain constraints produce readable English errors.
- Deleting Aspect with non-deleted children produces error.
- Restoring Indicator with deleted parent produces error.
- Status change actions disabled while a status change is pending for the same node.
- Permission gates prevent lifecycle actions for read-only users.

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

**Suggested commit:**
```
feat(kpi): add corporate KPI lifecycle management

- Status change (Activate/Deactivate/Set Draft) via kebab dropdown
- Soft delete with English confirmation dialog and pending state
- Deleted view with Restore action and pending state
- Correct refresh matrix (tree + deleted after delete/restore)
- Per-action pending state preventing duplicate requests
- Domain-error UX with user-facing English messages
- Full permission gating on all lifecycle actions
```

---

### P1.4 — Final verification and smoke test

**Scope:**
- Full TypeScript check (`tsc --noEmit`)
- All Jest tests pass
- KPI-scoped lint over all changed files (not just module directory)
- Production build (`npm run build`)
- Generate verification document with automated results
- STOP — manual smoke test is NOT executed by the implementation agent

**Lint verification scope:**
Run ESLint over every changed P1 file. Either:
- Use an explicit changed-file list for `eslint`, or
- Run `eslint .` and separately identify the known pre-existing Organization error.

Changed P1 files include:
- `src/modules/hr/kpi/corporate/**/*` (all new files)
- `src/app/(main)/hr/kpi/corporate/page.tsx`
- `src/modules/hr/kpi/__tests__/page-shells.test.tsx`
- `src/__mocks__/heroui-react.tsx`
- `src/__mocks__/phosphor-icons-react.tsx`

**Expected files (P1.4):**
- `docs/testing/2026-07-23-kpi-frontend-p1-corporate-verification.md` (CREATE)

**Acceptance criteria:**
- TypeScript: zero errors.
- All Jest tests pass (existing 46 + all new P1 tests).
- Production build: green.
- No new lint errors from any P1-changed file (pre-existing Organization error acknowledged).
- Verification report documents all automated results.

**Verification:**
```bash
# TypeScript type check
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"

# All tests
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx jest"

# Lint — full project (one known pre-existing Organization error expected)
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."

# Build
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

**Manual smoke test:** The implementation agent does NOT run the manual smoke test. The verification report (created in P1.4) documents all automated results and marks manual smoke testing as:

```
PENDING USER EXECUTION
```

After the user provides smoke-test results, update the report to PASS/FAIL in a separate step.

**Suggested commit:**
```
test(kpi): verify corporate KPI frontend

- Full TypeScript, Jest, and production build verification
- Lint passes on all changed files
- Manual smoke test: PENDING USER EXECUTION
- Verification report generated
```

---

## 18. Proposed Commit Messages

| Phase | Commit type | Message |
|---|---|---|
| P1.1 | `feat(kpi)` | add corporate KPI hierarchy view |
| P1.2 | `feat(kpi)` | add corporate KPI create and edit workflows |
| P1.3 | `feat(kpi)` | add corporate KPI lifecycle management |
| P1.4 | `test(kpi)` | verify corporate KPI frontend |

---

## 19. Risks and Open Questions

### Risks

| Risk | Mitigation |
|---|---|
| HeroUI mock needs expansion for Table, Modal, Select, Badge, Dropdown | P1.1 includes mock expansion. If a component is missing, add a minimal mock that renders children. |
| Tree endpoint has no pagination — large datasets could slow rendering | Expected volume is small (<100 nodes/year). If performance becomes an issue, add virtualization later. |
| `page-shells.test.tsx` Corporate test checks for "P1" placeholder text | P1.1 updates this test to check for real page elements instead of placeholder text. |
| Form modal with 4 modes could become complex | Single component with conditional rendering. Zod schemas and form-to-DTO mappers are separate per mode. |
| **ACTIVE Indicator reparenting to DRAFT/INACTIVE Aspect:** backend allows it. If the Indicator is later deactivated, it cannot be reactivated because the parent isn't ACTIVE. | Documented as allowed by backend. Parent Select shows all Aspects (any status). User may encounter `KPI_PARENT_MUST_BE_ACTIVE` error on reactivation. No frontend restriction. |
| `/deleted` endpoint could return many records across all years | Expected volume is small. Client-side year filtering is efficient. Only fetched once per session per Deleted tab open. |

### Open questions

| # | Question | Resolution |
|---|---|---|
| 1 | Should the year Select offer a fixed range or query available years? | Fixed range: current year ± 3. Backend validates 2000–2100. No "available years" endpoint exists. |
| 2 | Can an ACTIVE Indicator be reparented to a DRAFT/INACTIVE Aspect? | **Resolved by source inspection:** Yes. Backend `update()` validates parent type (ASPECT) and same-year only — not parent status. Documented as allowed. |

No genuinely unresolved questions remain. The backend and frontend source fully determine the implementation.

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
- Localization infrastructure / language switcher
- URL query parameter filter state
- Separate detail page (`/hr/kpi/corporate/[id]`)
- React Query / TanStack Query integration
- Generic entity CRUD framework
- Generic hierarchy engine
- Global KPI Zustand store
- Indonesian user-facing text
- A generic mutation-pending framework (per-action flags are sufficient)
- Mutation stubs or placeholder files in P1.1

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

# Lint — full project with known pre-existing Organization error excluded
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."
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

The pre-existing lint error must be distinguished from any new P1 lint error. Run full lint and acknowledge the known Organization error.

---

## 22. P1 Definition of Done

### Functional

- [ ] `/hr/kpi/corporate` renders the ASPECT → INDICATOR tree from the real backend
- [ ] Year selector (current year ± 3) switches tree data
- [ ] Client-side search filters by code/name; matching child keeps parent visible
- [ ] Clearing search restores original expand state
- [ ] Expand/collapse individual ASPECT nodes + expand/collapse all
- [ ] Current/Deleted view toggle (Deleted gated by `corporate_kpi:read_deleted`)
- [ ] Deleted list lazily fetched only when an authorized user first opens "Deleted KPIs"
- [ ] `/deleted` endpoint never called for users without `corporate_kpi:read_deleted`
- [ ] Deleted list fetched from `/deleted`, filtered client-side by selected year
- [ ] Create Aspect via modal (explicit nulls for parentId/unit/targetValue)
- [ ] Create Indicator under Aspect via kebab action (parentId pre-filled, year from parent)
- [ ] Edit Aspect (code, name, description only; explicit nulls for parentId/unit/targetValue)
- [ ] Edit Indicator (code, name, unit, targetValue, parentId — all required except description)
- [ ] Target value validation: strictly positive (zero and negative rejected by Zod)
- [ ] Blank numeric input → "Target value is required." (not `NaN`)
- [ ] Unit validation: required, non-blank for Indicator
- [ ] Description optional in all modes
- [ ] Change status (DRAFT → ACTIVE → INACTIVE and back) with backend constraint enforcement
- [ ] Soft delete with English confirmation dialog and pending state
- [ ] ACTIVE Indicator reparenting to any same-year Aspect (no frontend restriction on parent status)
- [ ] Restore from Deleted view with pending state and order enforcement
- [ ] Correct refresh matrix (tree after create/update/status; tree + deleted after delete/restore)
- [ ] All mutation actions permission-gated via `usePermission()` + `PERM.*`
- [ ] Page-level read permission guard
- [ ] All user-facing text in English (no Indonesian)

### Technical

- [ ] TypeScript: zero errors (`tsc --noEmit`)
- [ ] Jest: all tests green (existing 46 + new P1 tests)
- [ ] Production build: green (`npm run build`)
- [ ] Lint: no new errors from any P1-changed file (pre-existing Organization error acknowledged)
- [ ] No React/browser console warnings
- [ ] All code follows `erp-frontend-standards` skill conventions
- [ ] 100% HeroUI components (no native HTML form elements)
- [ ] All user-facing strings in English, code identifiers in English
- [ ] Feature-local files only (no global state, no generic frameworks)

### Architectural

- [ ] API module at `services/corporate-kpi-api.ts` with 7 endpoints (no getById)
- [ ] `ApiResponse<T>` unwrapped in service layer — UI receives `data` directly
- [ ] Data hook at `hooks/use-corporate-kpi-data.ts` owning server state only
- [ ] Error mapper at `utils/corporate-kpi-error-mapper.ts`
- [ ] Types at `types.ts` matching backend DTOs exactly
- [ ] Components at `components/` — table, form modal, status badge, empty state
- [ ] Form-to-DTO mapper functions in `kpi-node-form-modal.tsx`
- [ ] Page-local UI state: year, search, view toggle, expanded IDs, modal/dialog state
- [ ] Per-action mutation pending state (not a generic framework)
- [ ] No direct API calls from components (always via hook)
- [ ] Server-confirmed refresh after mutations (no optimistic updates)
- [ ] Sidebar unchanged
- [ ] No backend modifications
- [ ] Verification report at `docs/testing/2026-07-23-kpi-frontend-p1-corporate-verification.md`
- [ ] Manual smoke test documented as `PENDING USER EXECUTION` (not claimed as completed by agent)
