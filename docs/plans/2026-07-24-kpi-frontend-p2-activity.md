# P2 — KPI Activity Frontend Implementation Plan

> **For Hermes:** Use `erp-frontend-standards` and `heroui-table-pages` skills when implementing.

**Goal:** Build `/hr/kpi/activities` (My Activities, Managed Activities, My Requests) and
`/hr/kpi/approvals` (approval queue) with create/update/cancel/approve/reject workflows.

**Architecture:** Feature-local hooks (`src/modules/hr/kpi/activity/`), no global store,
no React Query. Two pages, modals for forms and action confirmations. Maker-checker:
submission creates a PENDING request; official activity changes only after approval.

**Tech Stack:** Next.js 16 + React 19 + HeroUI v3 + Phosphor Icons + RHF + Zod + Jest.
English-only. Windows Node/npm only (no WSL Node against `/mnt/c`).

**Baseline:** P1 Corporate KPI complete (commit `c7b0f92`). P0 foundation stable.
Placeholder pages exist at `/hr/kpi/activities` and `/hr/kpi/approvals`.

---

## 1. Objective and Scope

### Pages

| Route | Purpose |
|---|---|
| `/hr/kpi/activities` | Tabbed: My Activities, Managed Activities, My Requests |
| `/hr/kpi/approvals` | Pending administrative approval queue + approve/reject |

### Supported Operations

| Operation | Actor | Permission | Entry Point |
|---|---|---|---|
| View My Activities | Assignee | `kpi_activity:read` | `/hr/kpi/activities` — My Activities tab |
| View Managed Activities | Manager | `kpi_activity:read` | `/hr/kpi/activities` — Managed Activities tab |
| View My Requests | Requester | `kpi_activity:request` | `/hr/kpi/activities` — My Requests tab |
| Create root activity request | User with request + CK read | `kpi_activity:request` AND `corporate_kpi:read` | Page-level button on `/hr/kpi/activities` |
| Create child activity request | Exact parent owner | `kpi_activity:request` | Action on My Activities row (ACTIVE, own) |
| Submit update request | Exact owner | `kpi_activity:request` | Action on My Activities row (ACTIVE, own) |
| Submit cancel request | Exact owner | `kpi_activity:request` | Action on My Activities row (ACTIVE, own) |
| View pending approval queue | Approver | `kpi_activity:approve` | `/hr/kpi/approvals` |
| Approve request | Approver | `kpi_activity:approve` | Action on pending row |
| Reject request | Approver | `kpi_activity:approve` | Action on pending row |

### Not Supported in P2

- Withdrawing/cancelling a PENDING request (no backend endpoint exists)
- Managed Activities mutation actions (no reliable ownership signal in response DTO)
- Reports, evidence, Overview, dashboard widgets

### Excluded (deferred to later phases)

- KPI Reports
- Evidence uploads
- KPI Overview enhancements
- Dashboard widgets
- Bulk operations
- Activity detail dedicated route (detail shown in modal)

---

## 2. Inspected Sources

### Backend (authoritative)

| Source | Path (relative to `erp-backend/src/main/java`) |
|---|---|
| `KpiActivityController` | `com/erp/kpi/controller/KpiActivityController.java` |
| `KpiActivityChangeRequestController` | `com/erp/kpi/controller/KpiActivityChangeRequestController.java` |
| `KpiActivityServiceImpl` | `com/erp/kpi/service/KpiActivityServiceImpl.java` |
| `KpiActivityResponse` | `com/erp/kpi/dto/response/KpiActivityResponse.java` |
| `KpiActivityChangeRequestResponse` | `com/erp/kpi/dto/response/KpiActivityChangeRequestResponse.java` |
| `AssignableUserPositionResponse` | `com/erp/kpi/dto/response/AssignableUserPositionResponse.java` |
| `CreateRootActivityRequest` | `com/erp/kpi/dto/request/CreateRootActivityRequest.java` |
| `CreateChildActivityRequest` | `com/erp/kpi/dto/request/CreateChildActivityRequest.java` |
| `UpdateKpiActivityRequest` | `com/erp/kpi/dto/request/UpdateKpiActivityRequest.java` |
| `CancelKpiActivityRequest` | `com/erp/kpi/dto/request/CancelKpiActivityRequest.java` |
| `RejectActivityRequestRequest` | `com/erp/kpi/dto/request/RejectActivityRequestRequest.java` |
| `KpiActivity` entity | `com/erp/kpi/entity/KpiActivity.java` |
| `KpiActivityChangeRequest` entity | `com/erp/kpi/entity/KpiActivityChangeRequest.java` |
| `KpiActivityStatus` enum | `com/erp/kpi/entity/KpiActivityStatus.java` |
| `KpiActivityRequestType` enum | `com/erp/kpi/entity/KpiActivityRequestType.java` |
| `KpiActivityRequestStatus` enum | `com/erp/kpi/entity/KpiActivityRequestStatus.java` |
| `Permissions` | `com/erp/common/constant/Permissions.java` |
| `MessageConstants` | `com/erp/common/constant/MessageConstants.java` |

### Frontend (reference)

| Source | Path |
|---|---|
| Corporate KPI page | `src/app/(main)/hr/kpi/corporate/page.tsx` |
| Corporate KPI API | `src/modules/hr/kpi/corporate/corporate-kpi-api.ts` |
| Corporate KPI types | `src/modules/hr/kpi/corporate/corporate-kpi.types.ts` |
| Corporate KPI error mapper | `src/modules/hr/kpi/corporate/corporate-kpi-error-mapper.ts` |
| Corporate KPI data hook | `src/modules/hr/kpi/corporate/use-corporate-kpi-data.ts` |
| Corporate KPI API tests | `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-api.test.ts` |
| Placeholder: activities | `src/app/(main)/hr/kpi/activities/page.tsx` |
| Placeholder: approvals | `src/app/(main)/hr/kpi/approvals/page.tsx` |
| Sidebar | `src/modules/hr/kpi/sidebar.ts` |
| Constants | `src/modules/hr/kpi/constants.ts` |
| Permissions | `src/constants/permissions.ts` |
| `usePermission` hook | `src/hooks/use-permission.ts` |
| `ApiResponse` type | `src/types/api.ts` |
| `package.json` (scripts) | `package.json` (`"test": "jest"`) |

---

## 3. Endpoint Matrix

### Activity Read Endpoints

| Method | Path | Permission | Response | Status | Frontend Screen |
|---|---|---|---|---|---|
| GET | `/api/v1/kpi-activities/my` | `kpi_activity:read` | `ApiResponse<KpiActivityResponse[]>` | 200 | My Activities tab |
| GET | `/api/v1/kpi-activities/managed` | `kpi_activity:read` | `ApiResponse<KpiActivityResponse[]>` | 200 | Managed Activities tab |
| GET | `/api/v1/kpi-activities/{id}` | `kpi_activity:read` or `kpi_activity:approve` | `ApiResponse<KpiActivityResponse>` | 200 | Activity detail modal |
| GET | `/api/v1/kpi-activities/assignable-user-positions` | `kpi_activity:request` | `ApiResponse<AssignableUserPositionResponse[]>` | 200 | Root create form |
| GET | `/api/v1/kpi-activities/{parentActivityId}/assignable-user-positions` | `kpi_activity:request` | `ApiResponse<AssignableUserPositionResponse[]>` | 200 | Child create form |

### Request Submission Endpoints

| Method | Path | Permission | Request DTO | Response | Success | Business Errors |
|---|---|---|---|---|---|---|
| POST | `/api/v1/kpi-activity-requests/root-create` | `kpi_activity:request` | `CreateRootActivityRequest` | `ApiResponse<KpiActivityChangeRequestResponse>` | 201 | `KPI_INDICATOR_NOT_ACTIVE`, `ACTIVITY_PERIOD_YEAR_MISMATCH`, `USER_POSITION_INACTIVE`, `NOT_SUBORDINATE` |
| POST | `/api/v1/kpi-activity-requests/child-create` | `kpi_activity:request` | `CreateChildActivityRequest` | `ApiResponse<KpiActivityChangeRequestResponse>` | 201 | `ACTIVITY_NOT_FOUND`, `ACTIVITY_PARENT_NOT_ACTIVE`, `FORBIDDEN`, `USER_POSITION_INACTIVE`, `NOT_SUBORDINATE`, `KPI_INDICATOR_NOT_ACTIVE` |
| POST | `/api/v1/kpi-activity-requests/update` | `kpi_activity:request` | `UpdateKpiActivityRequest` | `ApiResponse<KpiActivityChangeRequestResponse>` | 201 | `ACTIVITY_NOT_FOUND`, `ACTIVITY_NOT_ACTIVE`, `FORBIDDEN`, `DUPLICATE_PENDING_REQUEST`, `USER_POSITION_INACTIVE`, `KPI_INDICATOR_NOT_ACTIVE`, `ACTIVITY_PERIOD_YEAR_MISMATCH`, `NOT_SUBORDINATE`, `ACTIVITY_PARENT_NOT_ACTIVE` |
| POST | `/api/v1/kpi-activity-requests/cancel` | `kpi_activity:request` | `CancelKpiActivityRequest` | `ApiResponse<KpiActivityChangeRequestResponse>` | 201 | `ACTIVITY_NOT_FOUND`, `ACTIVITY_NOT_ACTIVE`, `FORBIDDEN`, `DUPLICATE_PENDING_REQUEST`, `ACTIVITY_HAS_ACTIVE_CHILDREN` |

### Request Read Endpoints

| Method | Path | Permission | Response | Status | Frontend Screen |
|---|---|---|---|---|---|
| GET | `/api/v1/kpi-activity-requests/my` | `kpi_activity:request` | `ApiResponse<KpiActivityChangeRequestResponse[]>` | 200 | My Requests tab |
| GET | `/api/v1/kpi-activity-requests/{id}` | `kpi_activity:request` or `kpi_activity:approve` | `ApiResponse<KpiActivityChangeRequestResponse>` | 200 | Request detail modal |
| GET | `/api/v1/kpi-activity-requests/pending` | `kpi_activity:approve` | `ApiResponse<KpiActivityChangeRequestResponse[]>` | 200 | Approvals page |

### Approval/Rejection Endpoints

| Method | Path | Permission | Request DTO | Response | Status | Business Errors |
|---|---|---|---|---|---|---|
| PATCH | `/api/v1/kpi-activity-requests/{id}/approve` | `kpi_activity:approve` | — | `ApiResponse<KpiActivityChangeRequestResponse>` | 200 | `ACTIVITY_REQUEST_NOT_FOUND`, `REQUEST_ALREADY_PROCESSED`, `CANNOT_APPROVE_OWN_REQUEST`, `USER_POSITION_INACTIVE`, `NOT_SUBORDINATE`, `KPI_INDICATOR_NOT_ACTIVE`, `ACTIVITY_PARENT_NOT_ACTIVE`, `PARENT_OWNER_INVALID`, `ACTIVITY_HAS_ACTIVE_CHILDREN` |
| PATCH | `/api/v1/kpi-activity-requests/{id}/reject` | `kpi_activity:approve` | `RejectActivityRequestRequest` | `ApiResponse<KpiActivityChangeRequestResponse>` | 200 | `ACTIVITY_REQUEST_NOT_FOUND`, `REQUEST_ALREADY_PROCESSED`, `CANNOT_APPROVE_OWN_REQUEST` |

---

## 4. DTO and Enum Contracts

### 4.1 KpiActivityResponse (backend → frontend)

```typescript
interface KpiActivityResponse {
  id: string;
  parentId: string | null;
  parentActivityName: string | null;
  corporateKpiId: string;
  corporateKpiName: string;
  corporateKpiCode: string;
  assignedToUserPositionId: string;
  assignedToUserName: string;
  assignedToPositionName: string;
  activityName: string;
  description: string | null;
  unit: string;
  targetValue: number;
  periodYear: number;
  periodMonth: number;
  status: 'ACTIVE' | 'CANCELLED';
  realizedValue: number;       // SUM of approved reports, 0 if none
  progressPercent: number;     // derived, capped at 100
  createdAt: string;
  updatedAt: string;
}
```

**Ownership signal:** The response does NOT include `canMutate`, `isExactOwner`,
`actingUserPositionId`, or any other ownership field. The frontend cannot
reliably determine whether the current user is the exact owner of an activity.
Managed Activities must therefore be read-only (see §9).

### 4.2 KpiActivityChangeRequestResponse (backend → frontend)

```typescript
interface KpiActivityChangeRequestResponse {
  id: string;
  requestType: 'CREATE' | 'UPDATE' | 'CANCEL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  activityId: string | null;              // null while PENDING CREATE
  parentId: string | null;
  parentActivityName: string | null;
  corporateKpiId: string | null;
  corporateKpiName: string | null;
  assignedToUserPositionId: string | null;
  assignedToUserName: string | null;
  activityName: string | null;
  description: string | null;
  unit: string | null;
  targetValue: number | null;
  periodYear: number | null;
  periodMonth: number | null;
  requestedByUser: string;
  requestedByUserName: string;
  reviewedBy: string | null;              // UUID only, no name
  reviewedAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;      // non-null for CANCEL type
  createdAt: string;
  updatedAt: string;
}
```

### 4.3 AssignableUserPositionResponse (backend → frontend)

```typescript
interface AssignableUserPositionResponse {
  userPositionId: string;
  userId: string;
  userFullName: string;
  positionId: string;
  positionName: string;
  isPrimary: boolean;
  isSelf: boolean;    // true only for requester's acting UserPosition (root selector)
}
```

### 4.4 Request DTOs (frontend → backend)

#### Root Create — exact payload

```typescript
// SEND: all fields below. Do NOT include parentActivityId in the JSON body.
interface CreateRootActivityPayload {
  corporateKpiId: string;           // required — ACTIVE INDICATOR UUID
  assignedToUserPositionId: string; // required
  activityName: string;             // required, max 255
  unit: string;                     // required, max 50
  targetValue: number;              // required, > 0
  periodYear: number;               // required, year selected first
  periodMonth: number;              // required, 1-12
  description?: string;             // optional — omit when empty
}
// parentActivityId: backend has @Null — omit entirely from payload. Do NOT send null.
```

#### Child Create — exact payload

```typescript
// SEND: only these fields. Do NOT include corporateKpiId, periodYear, or periodMonth.
interface CreateChildActivityPayload {
  parentActivityId: string;           // required
  assignedToUserPositionId: string;   // required
  activityName: string;               // required, max 255
  unit: string;                       // required, max 50
  targetValue: number;                // required, > 0
  description?: string;               // optional — omit when empty
}
// Inherited fields (corporateKpiId, periodYear, periodMonth): backend has @Null on each.
// Omit entirely from JSON payload. Do NOT send null.
```

#### Update — exact payload

```typescript
// SEND: only mutable fields. Immutable fields (parentActivityId, corporateKpiId,
// assignedToUserPositionId, periodYear, periodMonth) must NOT appear in JSON.
// description is always sent — current value, null (cleared), or new text.
interface UpdateKpiActivityPayload {
  activityId: string;                 // required
  activityName: string;               // required, max 255
  description: string | null;         // always sent: current value, null, or new text
  unit: string;                       // required, max 50
  targetValue: number;                // required, > 0
}
// Backend field: private String description; — not annotated @Nullable/@NotNull.
// Jackson deserialises null as null, absent as null. Frontend always sends property.
// If user clears the field → description: null (explicit clear).
// If user leaves untouched → description: <current value> (same as pre-filled).
// Do NOT use dirtyFields-based omission — always include in payload.
```

#### Cancel — exact payload

```typescript
interface CancelKpiActivityPayload {
  activityId: string;               // required
  cancellationReason: string;       // required, max 1000
}
```

#### Reject — exact payload

```typescript
interface RejectActivityRequestPayload {
  rejectionReason: string;          // required, max 1000
}
```

### 4.5 Enums

| Backend Enum | Values | Frontend Type | Entity Has Soft Delete? |
|---|---|---|---|
| `KpiActivityStatus` | `ACTIVE`, `CANCELLED` | `'ACTIVE' \| 'CANCELLED'` | No. Entity has no `deletedAt`, no `@Where`, no `deleted` flag. Cancellation sets `status = CANCELLED`. Records remain readable. |
| `KpiActivityRequestType` | `CREATE`, `UPDATE`, `CANCEL` | `'CREATE' \| 'UPDATE' \| 'CANCEL'` | No |
| `KpiActivityRequestStatus` | `PENDING`, `APPROVED`, `REJECTED` | `'PENDING' \| 'APPROVED' \| 'REJECTED'` | No |

**No backend endpoint exists for withdrawing or cancelling a PENDING request.** Once submitted,
a request can only be Approved or Rejected by an approver.

---

## 5. Confirmed Business Rules

### 5.1 Root Activity Creation

| Rule | Frontend Implication |
|---|---|
| Requester uses deterministic acting UserPosition (primary, or single active) | Backend resolves automatically; no UI for acting position |
| Assignee must be exact acting UP or strict descendant; same-position peers excluded | Assignee from `GET /assignable-user-positions`: `isSelf=true` items = self. Exclude peers via endpoint semantics |
| Corporate KPI must be ACTIVE INDICATOR | Corporate KPI selector loads tree for selected year. Only INDICATOR nodes with status ACTIVE are selectable. Requires `corporate_kpi:read`. |
| Activity period year must match Corporate KPI year | Period Year is selected first. CK tree loads for that year. Selected CK's year always equals Period Year. Changing year clears the CK selection. |
| Submission creates PENDING request (not official activity) | Toast "Request submitted". Activity not visible in My Activities until approved |

### 5.2 Child Activity Creation

| Rule | Frontend Implication |
|---|---|
| Only exact owner of parent activity may submit | Action only on My Activities rows the user owns (by frontend heuristic — backend is authoritative) |
| Assignee must be strict descendant; self-assignment and same peers excluded | Child assignee endpoint already excludes self/peers |
| Corporate KPI and period inherited from parent | Show read-only fields. Omit from payload entirely |
| Backend has `@Null` on inherited fields | Omit `corporateKpiId`, `periodYear`, `periodMonth` from JSON — do NOT send as null |

### 5.3 Update

| Rule | Frontend Implication |
|---|---|
| Only mutable fields: activityName, description, unit, targetValue | Form only exposes these four fields |
| Immutable fields: parent, corporateKpi, assignee, periodYear, periodMonth | Show read-only context; must NOT appear in JSON payload |
| Activity must be ACTIVE | Only show Update on ACTIVE rows |
| Exact owner rules apply | Action only on My Activities rows the user likely owns |
| Submission creates PENDING UPDATE request | Show current data as form defaults; toast on success |

### 5.4 Cancel

| Rule | Frontend Implication |
|---|---|
| Activity must be ACTIVE | Only show Cancel on ACTIVE rows |
| Activity with active children cannot be cancelled | Backend rejects; show error |
| Cancellation reason required | TextArea, required, max 1000 |
| Submission creates PENDING CANCEL request | Confirmation dialog before submit |

### 5.5 Approval

| Rule | Frontend Implication |
|---|---|
| Requester cannot approve/reject own request | Backend enforces. Frontend: show all requests; for own PENDING request, disable buttons with explanation or handle backend 400 |
| Approval revalidates hierarchy and activity state | Backend may reject; display mapped error |
| Request may become APPROVED or REJECTED | Toast; refresh pending queue |
| Official activity changes only after approval | Activity list unchanged until approval; re-fetch on tab revisit |

---

## 6. Page and Tab UX

### 6.1 `/hr/kpi/activities` — Tabbed Page

Tabs using HeroUI `<Tabs>`:

```
My Activities | Managed Activities | My Requests
```

**Tab visibility (permission-aware):**

| Tab | Required Permission | Shown When |
|---|---|---|
| My Activities | `kpi_activity:read` | User has read permission |
| Managed Activities | `kpi_activity:read` | User has read permission |
| My Requests | `kpi_activity:request` | User has request permission |

**Initial tab:** Choose the first permitted tab in order: My Activities > Managed Activities > My Requests. When only one tab is visible, there is no choice — it's the default.

**Create Activity button:**
- A page-level action positioned in the header row, NOT inside a tab.
- Visible for `kpi_activity:request` **AND** `corporate_kpi:read`.
- If the user has `kpi_activity:request` but lacks `corporate_kpi:read`, the button is **hidden**.
- Rationale: the root create form needs the Corporate KPI tree (`GET /corporate-kpis/tree`),
  which requires `corporate_kpi:read`. Hiding is cleaner than showing a disabled button
  with no clear workaround.
- Child create, update, and cancel do NOT require Corporate KPI tree access and remain
  controlled by `kpi_activity:request` plus backend ownership validation.

### 6.2 My Activities Tab

**Layout:** Table. Columns:

| Column | Source | Format |
|---|---|---|
| Activity Name | `activityName` | Clickable → detail modal |
| Parent Activity | `parentActivityName` | `-` if root |
| Corporate KPI | `corporateKpiName` | |
| Period | `periodYear`/`periodMonth` | `2026-07` |
| Target | `targetValue` | `${value} ${unit}` |
| Realized | `realizedValue` | `${value} ${unit}` |
| Progress | `progressPercent` | `<ProgressBar>` + `XX%` |
| Status | `status` | Badge (see §10) |
| Actions | — | Inline buttons (≤3) |

**Actions (shown when `kpi_activity:request`):**
- **Create Child** — on rows identified as the user's own activities (subject to heuristics; backend is authoritative)
- **Update** — on own ACTIVE rows
- **Cancel** — on own ACTIVE rows

**Status badges:** `ACTIVE` → `<Badge variant="primary">Active</Badge>`, `CANCELLED` → `<Badge variant="secondary">Cancelled</Badge>`.

### 6.3 Managed Activities Tab — Read-Only

**Layout:** Table (no mutation actions). The response DTO does not expose a reliable ownership
signal (`canMutate`, `isExactOwner`, or current user's acting UserPosition ID). Therefore:

- **No** Create Child, Update, or Cancel actions in Managed Activities
- This is an **intentional v1 safety decision**: backend authorization is the only reliable
  ownership check, and Managed Activities cannot determine ownership without one.
- If a future backend response adds an ownership field, actions may be added then.

**Columns:**

| Column | Source |
|---|---|
| Assignee | `assignedToUserName` |
| Position | `assignedToPositionName` |
| Activity Name | `activityName` |
| Parent | `parentActivityName` |
| Corporate KPI | `corporateKpiName` |
| Target | `targetValue` + `unit` |
| Progress | `progressPercent` |
| Status | `status` |

### 6.4 My Requests Tab

**Layout:** Table.

**Columns:**

| Column | Source | Format |
|---|---|---|
| Request Type | `requestType` | Badge (see §10) |
| Activity | `activityName` | Clickable → request detail modal |
| Status | `status` | Badge (see §10) |
| Created | `createdAt` | `dd/MM/yyyy HH:mm` |
| Reviewed | `reviewedAt` | `dd/MM/yyyy HH:mm` or `-` |
| Rejection Reason | `rejectionReason` | `-` if none |
| Actions | — | View detail only |

**No Cancel/Withdraw action for PENDING requests.** The backend has no endpoint for
withdrawing a pending request. The only path from PENDING is Approve or Reject by an
approver.

### 6.5 `/hr/kpi/approvals` — Pending Queue Page

**Layout:** Single table. Visible for `kpi_activity:approve`.

**Columns:**

| Column | Source | Format |
|---|---|---|
| Request Type | `requestType` | Badge |
| Requester | `requestedByUserName` | |
| Activity Name | `activityName` | |
| Parent | `parentActivityName` | `-` if root |
| Assignee | `assignedToUserName` | |
| Corporate KPI | `corporateKpiName` | |
| Period | `periodYear`/`periodMonth` | `2026-07` |
| Proposed Target | `targetValue` + `unit` | |
| Actions | — | Approve, Reject |

**Self-request visibility:** All pending requests returned by the backend remain visible,
including those created by the current user. The maker-checker restriction is enforced by
the backend. For the user's own PENDING request, disable Approve/Reject buttons with a
tooltip "You cannot approve your own request." If attempted, map the backend
`CANNOT_APPROVE_OWN_REQUEST` error safely.

**UPDATE comparison (lazy, not per-row):**
- Open request detail modal
- If `activityId` is non-null (i.e., type is UPDATE or CANCEL), lazily fetch `GET /kpi-activities/{activityId}`
- Show current vs proposed values for UPDATE type
- Do NOT fetch current activity for every queue row (avoids N+1)

### 6.6 Activity/Request Detail — Modal

**Pattern:** Modal, not dedicated route. No deep-linking needed.

**Activity detail modal:**
- All `KpiActivityResponse` fields in structured layout
- Read-only, close button

**Request detail modal:**
- All `KpiActivityChangeRequestResponse` fields
- Parent/assignee lineage context
- For UPDATE: comparison (current vs proposed, fetched lazily)
- For CANCEL: cancellation reason displayed prominently

---

## 7. Permission Matrix

### Navigation Visibility

| Sidebar Item | Current Permission Rule | P2 Correction |
|---|---|---|
| Activities (`/hr/kpi/activities`) | `[PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_APPROVE]` | **Remove `kpi_activity:approve`.** Use `[PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST]` only. |
| Approvals (`/hr/kpi/approvals`) | `[PERM.KPI_ACTIVITY_APPROVE]` | No change. |

**Sidebar modification required (P2.1):** Remove `KPI_ACTIVITY_APPROVE` from the Activities
sidebar item's `permissions` array. An approve-only user must see Approvals but NOT Activities.

### Tab/Feature Visibility

| Feature | Permission | Notes |
|---|---|---|
| Activities page | `kpi_activity:read` OR `kpi_activity:request` | Page-level guard; if neither, access denied |
| My Activities tab | `kpi_activity:read` | Tab hidden if not granted |
| Managed Activities tab | `kpi_activity:read` | Tab hidden if not granted |
| My Requests tab | `kpi_activity:request` | Tab hidden if not granted |
| Create Activity button | `kpi_activity:request` **AND** `corporate_kpi:read` | Page-level, not tab-dependent; hidden when CK read missing |
| My Activities actions (Create Child, Update, Cancel) | `kpi_activity:request` | Only on own rows |
| Managed Activities actions | N/A | Read-only (no actions) |
| My Requests actions | N/A | No mutation actions for requests |
| Approvals page | `kpi_activity:approve` | Page-level guard |
| Approve/Reject | `kpi_activity:approve` | Buttons gated |
| Request detail | `kpi_activity:request` OR `kpi_activity:approve` | Both can view |

### Behavior by Permission Set

| Permissions | Activities Page | Tabs Visible | Actions | Approvals Page |
|---|---|---|---|---|
| `read` only | Accessible | My Activities, Managed | None | Not accessible |
| `request` only (no `corporate_kpi:read`) | Accessible | My Requests | Create Activity hidden (no CK read) | Not accessible |
| `request` + `corporate_kpi:read` (no `read`) | Accessible | My Requests | Create Activity visible | Not accessible |
| `read` + `request` + `corporate_kpi:read` | Accessible | My Activities, Managed, My Requests | Create Activity, actions on own rows | Not accessible |
| `approve` only | **Not accessible** | N/A | N/A | Accessible |
| `read` + `approve` | Accessible | My Activities, Managed | None | Accessible |
| `request` + `approve` (+ `corporate_kpi:read`) | Accessible | My Requests | Create Activity (if CK read) | Accessible |
| All three (+ `corporate_kpi:read`) | Accessible | All three | All | Accessible |
| None | Access denied | N/A | N/A | Access denied |

**Sidebar modification required (P2.1):** Remove `KPI_ACTIVITY_APPROVE` from the Activities
sidebar item. Currently `[PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_APPROVE]`.
After change: `[PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST]`.
Approvals item remains `[PERM.KPI_ACTIVITY_APPROVE]`.

---

## 8. Form Workflows

### 8.1 Create Root Activity (Modal)

**Trigger:** "Create Activity" button (page-level, visible for `kpi_activity:request` AND `corporate_kpi:read`).

**Selection sequence (year-first, mandatory):**

```
1. Select Period Year
   → fetch Corporate KPI tree for that year via GET /api/v1/corporate-kpis/tree?year=N
   → requires corporate_kpi:read
   → filter to ACTIVE INDICATOR nodes only
   → changing year clears the selected Corporate KPI
2. Select Corporate KPI (from filtered ACTIVE INDICATOR list)
3. Select Period Month (1-12)
4. Select Assignee
   → GET /api/v1/kpi-activities/assignable-user-positions
5. Enter Activity Name, Description (optional), Unit, Target Value
```

**Fields (in display order):**

| Field | Component | Required | Notes |
|---|---|---|---|
| Period Year | `Select` (number range, e.g. 2024-2030) | Yes | Selected FIRST. Changing it refetches CK tree and clears CK selection. |
| Corporate KPI | `Select` | Yes | Filtered to ACTIVE INDICATOR for selected year. Cleared when year changes. |
| Period Month | `Select` (1-12) | Yes | |
| Assignee | `Select` | Yes | From `GET /kpi-activities/assignable-user-positions`; self items marked "(You)" |
| Activity Name | `Input` | Yes | Max 255 |
| Description | `TextArea` | No | Optional |
| Unit | `Input` | Yes | Max 50, e.g. "%", "IDR" |
| Target Value | `Input` (number) | Yes | Must be > 0 |

**Corporate KPI loading:** Reuse the existing P1 `corporateKpiApi.getTreeByYear(year)` method.
The response includes all nodes; frontend filters to `nodeType === 'INDICATOR' && status === 'ACTIVE'`.
Handle the case where `corporate_kpi:read` is missing: the fetch fails and the form shows
an error or prevents submission (the Create button is already hidden when this permission is absent).

**Payload:** Omit `parentActivityId` entirely from JSON.

**On submit:** `POST /api/v1/kpi-activity-requests/root-create`
→ toast "Activity request submitted successfully"
→ close modal
→ refresh My Requests tab

### 8.2 Create Child Activity (Modal)

**Trigger:** "Create Child" action on a My Activities row (own, ACTIVE).

**Fields:**

| Field | Component | Required | Notes |
|---|---|---|---|
| Parent Activity | Display only | — | Shows `parentActivityName`, inherited |
| Corporate KPI | Display only | — | Inherited from parent |
| Period | Display only | — | Inherited from parent: `${year}-${month}` |
| Activity Name | `Input` | Yes | Max 255 |
| Description | `TextArea` | No | |
| Unit | `Input` | Yes | Max 50 |
| Target Value | `Input` (number) | Yes | > 0 |
| Assignee | `Select` | Yes | From `GET /kpi-activities/{parentId}/assignable-user-positions` |

**Payload:** Omit `corporateKpiId`, `periodYear`, `periodMonth` entirely from JSON.

**On submit:** `POST /api/v1/kpi-activity-requests/child-create`
→ toast
→ close modal
→ refresh My Requests tab

### 8.3 Update Activity (Modal)

**Trigger:** "Update" action on a My Activities row (own, ACTIVE).

**Fields:**

| Field | Component | Required | Notes |
|---|---|---|---|
| Activity Name | `Input` | Yes | Pre-filled with current |
| Description | `TextArea` | No | Pre-filled. If user clears, send `null` (explicit clear). Always included in payload. |
| Unit | `Input` | Yes | Pre-filled |
| Target Value | `Input` (number) | Yes | Pre-filled, > 0 |
| (Context) Corporate KPI | Display only | — | Not editable |
| (Context) Assignee | Display only | — | Not editable |
| (Context) Period | Display only | — | Not editable |

**Payload:** Always send: `activityId`, `activityName`, `description`, `unit`, `targetValue`.
`description` is always present in the JSON body: current value if unchanged, `null` if cleared by user, new text if edited.
Do NOT include `parentActivityId`, `corporateKpiId`, `assignedToUserPositionId`, `periodYear`, `periodMonth`.

**`description` semantics:**
- `description: <current value>` → unchanged (form default sent as-is)
- `description: null` → explicit clear
- `description: ""` → empty string (valid, sent as-is)
- No dirtyFields-based omission — always include the property in the payload.

**On submit:** `POST /api/v1/kpi-activity-requests/update`
→ toast
→ close modal
→ refresh My Requests tab

### 8.4 Cancel Activity (Modal)

**Trigger:** "Cancel" action on a My Activities row (own, ACTIVE).

**Fields:**

| Field | Component | Required | Notes |
|---|---|---|---|
| Activity Name | Display only | — | Shows `activityName` |
| Cancellation Reason | `TextArea` | Yes | Max 1000. Placeholder: "Explain why this activity is being cancelled..." |

**On submit:** `POST /api/v1/kpi-activity-requests/cancel`
→ toast
→ close modal
→ refresh My Requests tab

### 8.5 Approve/Reject (On `/hr/kpi/approvals`)

**Approve:** Confirmation modal. "Approve this request?"
→ `PATCH /api/v1/kpi-activity-requests/{id}/approve`
→ toast "Request approved successfully"
→ refresh pending queue

**Reject:** Rejection reason modal.
- `TextArea` for `rejectionReason` (required, max 1000)
- `PATCH /api/v1/kpi-activity-requests/{id}/reject` with `{ rejectionReason }`
→ toast "Request rejected successfully"
→ refresh pending queue

---

## 9. Ownership Behavior in My Activities

**The `KpiActivityResponse` DTO contains no ownership signal** (no `canMutate`,
`isExactOwner`, `actingUserPositionId`). The frontend cannot definitively determine
whether the current user is the exact owner of an activity row.

**What My Activities shows:**
- All activities assigned to the current user (`GET /my` returns activities where the
  current user is the assignee, via backend `assignedToUserPosition.coreUser` match).
- The backend `GET /my` resolves "my activities" to activities assigned to any of the
  current user's active UserPositions. This is the user's own activity scope.

**Mutation actions in My Activities:**
- Create Child, Update, Cancel actions are shown on rows returned by `GET /my`.
- The backend validates exact ownership and authority on each mutation.
- If the frontend shows an action on a row and the user submits, the backend
  either executes or rejects with `FORBIDDEN` — the mapped error guides the user.

**Managed Activities is a separate concern:** Even though My Activities may show actions
for own activities, Managed Activities (activities belonging to subordinates) is
intentionally read-only because the frontend cannot distinguish between "owned" and
"monitored" managed activities without a backend ownership signal.

**Intentional v1 decision:** The current response DTO is sufficient for My Activities
actions (the backend filters by ownership at request time). Adding an ownership flag
to `KpiActivityResponse` would be a future enhancement.

---

## 10. Status and Request Presentation

### Activity Status Labels

| Backend Value | Display Label | Badge Variant |
|---|---|---|
| `ACTIVE` | Active | `primary` |
| `CANCELLED` | Cancelled | `secondary` |

### Request Type Labels

| Backend Value | Display Label | Badge Variant |
|---|---|---|
| `CREATE` | Create | `primary` |
| `UPDATE` | Update | `secondary` |
| `CANCEL` | Cancel | `soft` |

### Request Status Labels

| Backend Value | Display Label | Badge Variant |
|---|---|---|
| `PENDING` | Pending | `soft` |
| `APPROVED` | Approved | `primary` |
| `REJECTED` | Rejected | `secondary` |

All badges use `<Badge variant=... size="sm">`. No raw enum values displayed to users.

---

## 11. Filtering and Local State

### Tab State

- Tab selection: local React state (`useState`), NOT URL query params
- Filter state: local React state

### Filters (My Activities / Managed Activities)

| Filter | Type | Values |
|---|---|---|
| Search | `SearchField` | By `activityName` (client-side) |
| Status | Dropdown multiselect | Active, Cancelled |

### Filters (My Requests)

| Filter | Type | Values |
|---|---|---|
| Search | `SearchField` | By `activityName` (client-side) |
| Request Type | Dropdown multiselect | Create, Update, Cancel |
| Status | Dropdown multiselect | Pending, Approved, Rejected |

### Pagination

No server-side pagination. Backend returns complete lists. Client-side filtering
with expected v1 volume <100 activities.

---

## 12. Refresh Matrix

**Tab activation strategy:** Every time a tab becomes active, fetch that tab's current
dataset. This ensures data is always fresh without global state or cross-page sync.

- Activate My Activities → fetch `GET /api/v1/kpi-activities/my`
- Activate Managed Activities → fetch `GET /api/v1/kpi-activities/managed`
- Activate My Requests → fetch `GET /api/v1/kpi-activity-requests/my`
- Open Approvals page → fetch `GET /api/v1/kpi-activity-requests/pending`

**Mutation refresh:** Maker-checker submissions do not immediately change activity state.
The official activity is only mutated after approval.

| Operation | Required Refresh | Rationale |
|---|---|---|
| Submit root create | My Requests tab | Request appears; activity does not yet exist |
| Submit child create | My Requests tab | Same — request is PENDING |
| Submit update | My Requests tab | Update request appears; activity unchanged until approval |
| Submit cancel | My Requests tab | Cancel request appears; activity unchanged until approval |
| Approve request | Pending Approvals list | Request transitions to APPROVED/REJECTED and leaves queue |
| Reject request | Pending Approvals list | Request leaves queue |

**No automatic activity-list refresh after PENDING submission.** Activity lists re-fetch
when the tab becomes active. This is sufficient for v1 — no global sync system.

---

## 13. Error UX

### Activity-Local Error Mapper

`activity-error-mapper.ts` — maps known backend error detail strings to user-facing
English messages. Pattern matches P1 `corporate-kpi-error-mapper.ts`.

```typescript
const knownErrors: Record<string, string> = {
  'Activity not found':
    'The activity could not be found or is no longer available.',
  'Activity request not found':
    'The request could not be found.',
  'Corporate KPI must be an ACTIVE INDICATOR':
    'The selected Corporate KPI is not valid. It must be an active indicator.',
  'Activity period year must match Corporate KPI year':
    'The activity period year must match the Corporate KPI year.',
  'Parent activity is not active':
    'The parent activity is no longer active.',
  'Request has already been processed':
    'This request has already been processed by another approver.',
  'Cannot approve your own request':
    'You cannot approve or reject your own request.',
  'User position is inactive or user/position is deleted':
    'The assigned user position is no longer active.',
  'No active position found':
    'You do not have an active position assigned.',
  'Multiple active positions found without a primary':
    'Multiple active positions found. Please set a primary position.',
  'Parent activity owner is no longer valid':
    'The parent activity owner is no longer valid.',
  'A pending update or cancel request already exists for this activity':
    'A pending update or cancel request already exists for this activity.',
  'Cannot cancel activity with active child activities':
    'Cannot cancel this activity because it has active child activities. Cancel the children first.',
  'Activity is not active':
    'This activity is no longer active.',
  'User is not your subordinate':
    'The selected user is not in your reporting line.',
  'ACCESS_DENIED':
    'You do not have permission to perform this action.',
};
```

### Fallback

Unknown technical errors → safe generic: `"Something went wrong. Please try again."`
No SQL, stack traces, Java class names, or constraint names.

### Error Display

- Form validation errors: inline `<FieldError />`
- Server business errors: `toast.danger(mappedMessage)`
- Fetch errors: `toast.danger(mappedMessage)` and error in table area

---

## 14. Proportional File Structure

### Production Files

```
src/modules/hr/kpi/activity/
├── activity.types.ts              # DTO interfaces, enums
├── activity-api.ts                # All API methods (reads + mutations)
├── activity-error-mapper.ts       # Known error → English message
├── use-activity-data.ts           # Data hook for /activities page
├── use-approval-data.ts           # Data hook for /approvals page
├── activity-table.tsx             # My Activities + Managed Activities table
├── request-table.tsx              # My Requests table
├── activity-form-modal.tsx        # Root create, child create, update (mode-driven)
├── activity-cancel-dialog.tsx     # Cancel confirmation + reason
├── kpi-activity-detail-modal.tsx   # Activity + Request detail modal (shared)
├── approval-dialog.tsx            # Approve confirmation + reject reason modal
```

**11 production files** — consolidated from the previous 16.

**Design rationale:**
- `activity-form-modal.tsx` is mode-driven (`CREATE_ROOT | CREATE_CHILD | UPDATE`)
  sharing common fields (name, description, unit, target) while varying:
  - `CREATE_ROOT`: year → CK → month → assignee
  - `CREATE_CHILD`: read-only inherited fields + assignee
  - `UPDATE`: mutable fields only + read-only context
- `activity-cancel-dialog.tsx` stays separate because it's a short confirmation+
  reason form, not a multi-field mode
- `approval-dialog.tsx` handles both approve (simple confirm) and reject (reason)
  since both are single-action modals on the approvals page

### Test Files

```
src/modules/hr/kpi/activity/__tests__/
├── activity-api.test.ts            # API contract tests (all methods)
├── activity-page.test.tsx          # Permissions, tabs, page-level rendering
├── activity-form-modal.test.tsx    # Root create, child create, update form behavior
├── activity-approval.test.tsx      # Approve, reject, maker-checker, pending queue
```

**4 test suites** — consolidated from the previous 9.

**Justification:**
- API tests cover exact paths and payloads for all 14 methods
- Page tests cover permission visibility, tab rendering, refresh
- Form modal tests cover validation, inheritance, field exclusion
- Approval tests cover approve/reject flows, self-request handling, error mapping
- Error mapper is tested inline within relevant suites (not its own file)

### MODIFY (replace placeholders)

```
src/app/(main)/hr/kpi/activities/page.tsx
src/app/(main)/hr/kpi/approvals/page.tsx
```

---

## 15. Proportional Testing

### What We Test

**API contracts (`activity-api.test.ts`):**

| Test | Validates |
|---|---|
| `getMyActivities` | GET `/api/v1/kpi-activities/my`, `ApiResponse.data` unwrap |
| `getManagedActivities` | GET `/api/v1/kpi-activities/managed` |
| `getActivityById` | GET `/api/v1/kpi-activities/{id}` |
| `getAssignableForRoot` | GET `/api/v1/kpi-activities/assignable-user-positions` |
| `getAssignableForChild` | GET `/api/v1/kpi-activities/{parentId}/assignable-user-positions` |
| `submitRootCreate` | POST `/api/v1/kpi-activity-requests/root-create` — no `parentActivityId` in payload |
| `submitChildCreate` | POST `/api/v1/kpi-activity-requests/child-create` — no inherited fields in payload |
| `submitUpdate` | POST `/api/v1/kpi-activity-requests/update` — immutable fields excluded |
| `submitCancel` | POST `/api/v1/kpi-activity-requests/cancel` — correct shape |
| `getMyRequests` | GET `/api/v1/kpi-activity-requests/my` |
| `getRequestById` | GET `/api/v1/kpi-activity-requests/{id}` |
| `getPendingRequests` | GET `/api/v1/kpi-activity-requests/pending` |
| `approveRequest` | PATCH `/api/v1/kpi-activity-requests/{id}/approve` — no body |
| `rejectRequest` | PATCH `/api/v1/kpi-activity-requests/{id}/reject` — with `{ rejectionReason }` |
| Error propagation | All methods throw Axios errors correctly |

**Permissions and rendering (`activity-page.test.tsx`):**

| Test | Scenario |
|---|---|
| No permissions | Both pages show access denied (or redirect) |
| Read only | My/Managed tabs visible; no Create button; no mutation actions |
| Request only (without `corporate_kpi:read`) | My Requests tab visible; Create button hidden |
| Approve only | Approvals page accessible; approve/reject buttons visible |
| Mixed permissions | Correct tab set for each combination |
| Empty state | Tables show "No data" when list is empty |

**Forms (`activity-form-modal.test.tsx`):**

| Test | What it validates |
|---|---|
| Root create required fields | `activityName`, `unit`, `targetValue` required |
| Root create year-first | Year selection loads CK tree; CK filtered to ACTIVE INDICATOR |
| Root create payload | No `parentActivityId` sent |
| Child create inherited fields | `corporateKpiId`, `periodYear`, `periodMonth` omitted from payload |
| Child create required fields | `parentActivityId`, `assignee`, `activityName`, `unit`, `target` required |
| Update payload shape | Only `activityId`, `activityName`, `description`, `unit`, `targetValue` sent; immutable fields absent |
| Update pre-filled values | Form defaults match current activity data |
| Update description semantics | Always sent: current value, null (cleared), or new text. No dirtyFields omission. |
| Cancel reason required | `cancellationReason` required; max 1000 enforced |
| Cancel payload shape | `activityId` + `cancellationReason` only |

**Approval (`activity-approval.test.tsx`):**

| Test | What it validates |
|---|---|
| Approve endpoint | PATCH with no body, correct path |
| Reject endpoint | PATCH with `{ rejectionReason }`, correct path |
| Maker-checker UX | Self-request disabled with explanation or backend error handled |
| Pending queue refresh | Queue refreshed after approve/reject |
| Error mapping | Known backend errors → user-friendly message; unknown → safe fallback |

### What We Do NOT Test

- Exact icons, CSS classes, column order
- Modal DOM nesting
- Every badge variation or empty-state wording
- Pixel layout
- Animation behavior
- `500` or network timeout handling (generic error mapper covers it)

---

## 16. Manual Smoke-Test Plan

> **Status:** `PENDING USER EXECUTION` — do not run during implementation.

1. Login as **manager** with `kpi_activity:read`, `kpi_activity:request`, `kpi_activity:approve`, and `corporate_kpi:read`
2. Open `/hr/kpi/activities` → verify tabs: My Activities, Managed Activities, My Requests
3. Switch to **My Activities** tab → verify empty state or list
4. Click **Create Activity** (page-level button) → **select Period Year first** → CK tree loads for that year → select ACTIVE INDICATOR CK → month → assignee → enter fields → submit
5. Verify toast "Activity request submitted successfully"
6. Switch to **My Requests** tab → verify PENDING CREATE request appears
7. Login as **approver** (only `kpi_activity:approve`) → verify Approvals sidebar visible, Activities sidebar NOT visible
8. Open `/hr/kpi/approvals` → verify pending request visible
9. Verify own request not hidden; verify self-approve button disabled or backend error on attempt
10. Login as a **different approver** → click **Approve** → confirm → verify toast + queue refresh (request gone)
11. Login as **manager** → revisit My Activities (triggers fresh fetch) → verify approved activity appears with ACTIVE status
12. Click **Create Child** on that activity → fill form (assignee must be strict descendant) → submit
13. Login as **second approver** → approve child request
14. Login as **manager** → verify child in Managed Activities with parent name — **read-only**, no mutation buttons
15. Click **Update** on an activity → modify fields → submit (description included in payload)
16. Login as **approver** → click **Reject** (enter reason) → verify toast + queue refresh
17. Login as **manager** → verify activity still shows original values unchanged
18. Submit another update → login as approver → **Approve** → verify changes applied
19. Try to cancel parent activity (has active child) → verify backend error message
20. Cancel child first → approver approves → cancel parent → approver approves
21. Verify both activities show CANCELLED status
22. Login as **request-only user** (no `kpi_activity:read`, no `corporate_kpi:read`, no `approve`) → verify My Requests tab only; Create Activity hidden; no Approvals sidebar
23. Login as **read-only user** → verify My/Managed tabs visible; no Create button; no mutation actions
24. Login as **approve-only user** → verify Approvals page only; verify Activities sidebar NOT visible

---

## 17. Implementation Phases

### P2.1 — Read-only Activity Vertical Slice

**Objective:** DTOs, read API methods, My Activities, Managed Activities (read-only),
My Requests, detail modals, permission-aware tabs, sidebar permission correction.

**Files created:**
- `src/modules/hr/kpi/activity/activity.types.ts`
- `src/modules/hr/kpi/activity/activity-api.ts` (read methods only)
- `src/modules/hr/kpi/activity/activity-error-mapper.ts`
- `src/modules/hr/kpi/activity/use-activity-data.ts` (read-only)
- `src/modules/hr/kpi/activity/activity-table.tsx`
- `src/modules/hr/kpi/activity/request-table.tsx`
- `src/modules/hr/kpi/activity/kpi-activity-detail-modal.tsx`
- `src/modules/hr/kpi/activity/__tests__/activity-api.test.ts` (read methods)
- `src/modules/hr/kpi/activity/__tests__/activity-page.test.tsx` (permissions + rendering + sidebar)

**Files modified:**
- `src/modules/hr/kpi/sidebar.ts` — remove `KPI_ACTIVITY_APPROVE` from Activities item
- `src/app/(main)/hr/kpi/activities/page.tsx` — tabbed page with read-only tables

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPattern=activity --no-coverage"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"src/modules/hr/kpi/activity\" \"src/app/(main)/hr/kpi/activities\" \"src/modules/hr/kpi/sidebar.ts\""
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

**Commit:** `feat(kpi): add activity and request read-only views`

---

### P2.2 — Activity Request Submission

**Objective:** Create Activity button, root/child/update/cancel forms, assignable
UserPosition loading, year-first CK selection, validated payloads, My Requests refresh.

**Files created:**
- `src/modules/hr/kpi/activity/activity-form-modal.tsx` (modes: CREATE_ROOT, CREATE_CHILD, UPDATE)
- `src/modules/hr/kpi/activity/activity-cancel-dialog.tsx`
- `src/modules/hr/kpi/activity/__tests__/activity-form-modal.test.tsx`

**Files modified:**
- `src/modules/hr/kpi/activity/activity-api.ts` — add POST mutation methods
- `src/modules/hr/kpi/activity/use-activity-data.ts` — add mutation methods, assignable position loading
- `src/modules/hr/kpi/activity/activity-table.tsx` — add action buttons (Create Child, Update, Cancel)
- `src/modules/hr/kpi/activity/__tests__/activity-api.test.ts` — add mutation tests
- `src/app/(main)/hr/kpi/activities/page.tsx` — wire modals and mutation callbacks

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPattern=activity --no-coverage"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"src/modules/hr/kpi/activity\" \"src/app/(main)/hr/kpi/activities\""
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

**Commit:** `feat(kpi): add activity request submission workflows`

---

### P2.3 — Administrative Approval

**Objective:** `/hr/kpi/approvals` page, pending queue table, approve/reject modals,
maker-checker UX, lazy request detail with current-activity comparison.

**Files created:**
- `src/modules/hr/kpi/activity/use-approval-data.ts`
- `src/modules/hr/kpi/activity/approval-dialog.tsx`
- `src/modules/hr/kpi/activity/__tests__/activity-approval.test.tsx`

**Files modified:**
- `src/modules/hr/kpi/activity/activity-api.ts` — add PATCH approve/reject, GET pending
- `src/modules/hr/kpi/activity/kpi-activity-detail-modal.tsx` — add lazy current-activity fetch for comparison
- `src/app/(main)/hr/kpi/approvals/page.tsx` — replace placeholder

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPattern=activity --no-coverage"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"src/modules/hr/kpi/activity\" \"src/app/(main)/hr/kpi/activities\" \"src/app/(main)/hr/kpi/approvals\""
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

**Commit:** `feat(kpi): add activity approval workflow`

---

### P2.4 — Final Verification

**Objective:** Full TypeScript, focused + full Jest, lint (changed files and full),
production build, verification report, manual smoke checklist.

**Verification:**
```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPattern=activity --no-coverage"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --no-coverage"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"src/modules/hr/kpi/activity\" \"src/app/(main)/hr/kpi/activities\" \"src/app/(main)/hr/kpi/approvals\" \"src/modules/hr/kpi/sidebar.ts\""
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

**Verification document:** `docs/testing/2026-07-24-kpi-frontend-p2-activity-verification.md`

**Commit:** `test(kpi): finalize activity frontend verification`

---

## 18. Verification Commands (Windows CMD)

All commands run via Windows CMD (repo is on Windows filesystem, no WSL Node).

```bash
# TypeScript
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"

# Focused Jest (activity tests only)
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPattern=activity --no-coverage"

# Full Jest
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --no-coverage"

# Changed-file ESLint
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"src/modules/hr/kpi/activity\" \"src/app/(main)/hr/kpi/activities\" \"src/app/(main)/hr/kpi/approvals\" \"src/modules/hr/kpi/sidebar.ts\""

# Full ESLint
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."

# Production build
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

**Notes:**
- Jest 30 uses `--testPathPattern` without quotes in CMD
- Full lint may still show pre-existing Organization module issues; these are not blockers
- Every changed P2 file must have zero new ESLint errors and warnings
- `npx eslint` with double-quoted arguments handles spaces in glob paths correctly

---

## 19. Risks and Open Questions

### Resolved Questions (Inspected from Source)

| Question | Answer | Evidence |
|---|---|---|
| Is there a pending-request withdrawal endpoint? | **No.** Not in `KpiActivityChangeRequestController` or service. PENDING can only be APPROVED or REJECTED. | `search_files` for `withdraw` returns zero matches across entire kpi module |
| Does `KpiActivity` use soft delete? | **No.** Entity has no `deletedAt`, no `@Where`, no `deleted` flag. Comment confirms: "No soft delete (deletedAt)". | `KpiActivity.java` lines 14-20 |
| Does `KpiActivityResponse` include ownership signal? | **No.** Response has `assignedToUserPositionId` but no `canMutate`, `isExactOwner`, or acting user position. | `KpiActivityResponse.java` |
| Should `parentActivityId` be sent as null in root create? | **No.** Backend uses `@Null`. Omit the field entirely from JSON — Jackson leaves it null. | `CreateRootActivityRequest.java` |
| Should inherited fields be sent as null in child create? | **No.** All three have `@Null`. Omit entirely from JSON. | `CreateChildActivityRequest.java` |
| Does `PATCH /approve` require a body? | **No.** Path-only. | `KpiActivityChangeRequestController.java` |
| Does `PATCH /reject` require a body? | **Yes.** `RejectActivityRequestRequest { rejectionReason }`. | `KpiActivityChangeRequestController.java` |
| Can `kpi_activity:request` call `GET /corporate-kpis/tree`? | **No.** That endpoint requires `corporate_kpi:read` via `@PreAuthorize`. | `CorporateKpiController` (previous inspection) |

### Genuine Open Questions

| Question | Impact | Suggested Resolution |
|---|---|---|
| **Corporate KPI selector permission dependency** | Root create form needs Corporate KPI ACTIVE INDICATOR list. The `GET /corporate-kpis/tree` endpoint requires `corporate_kpi:read`. A user with only `kpi_activity:request` cannot call this endpoint. | The plan hides the Create button when `corporate_kpi:read` is absent. Verify with existing user roles before implementation. If the permission is not always bundled, the user sees My Requests but cannot create root activities — this is acceptable v1 behavior. |
| **Self-approval disable — reliable user identity comparison** | The approvals page shows all PENDING requests. To disable Approve/Reject on the user's own request, the frontend needs to compare `requestedByUser` against the current user's ID. The `useAuthStore` provides `user.id` — if this is a UUID matching `requestedByUser`, comparison works. Verify `user.id` shape at implementation time. | If comparison is reliable, disable buttons with tooltip. If not, allow the attempt and map backend error. |

---

## 20. Exclusions

Do NOT plan or implement:

- KPI Reports (P3+)
- Evidence uploads (P3+)
- KPI Overview modifications
- Dashboard widgets
- Backend changes
- Organization changes
- New UI libraries
- New state-management libraries
- React Query
- Global KPI store
- Generic workflow engine
- Bulk operations
- Drag-and-drop
- Analytics
- Formula engine
- Weights
- Remuneration
- Activity detail dedicated route (use modal)
- Localization infrastructure (English only)

All user-facing frontend text remains English.

---

## 21. P2 Definition of Done

**Permission and navigation:**
- [ ] Activities page accessible for `kpi_activity:read` OR `kpi_activity:request`
- [ ] Approvals page accessible for `kpi_activity:approve`
- [ ] Sidebar: Activities item uses `[kpi_activity:read, kpi_activity:request]` — remove `kpi_activity:approve`
- [ ] Approve-only user sees Approvals sidebar but NOT Activities sidebar
- [ ] Tabs permission-aware: My/Managed → `read`, My Requests → `request`
- [ ] First permitted tab is the default tab
- [ ] Create Activity button visible for `kpi_activity:request` **AND** `corporate_kpi:read`; hidden when CK read absent

**Tab content:**
- [ ] My Activities: table with search, status filter, action buttons (Create Child, Update, Cancel) on own ACTIVE rows
- [ ] Managed Activities: read-only table — no mutation actions (intentional v1 decision)
- [ ] My Requests: table with type/status badges, no Cancel Pending action (no backend endpoint)

**Forms and payloads:**
- [ ] Root create: **year-first** selection → CK tree fetched for selected year → filter ACTIVE INDICATOR → month → assignee → fields
- [ ] Root create payload omits `parentActivityId` entirely
- [ ] Child create form shows inherited fields as read-only; payload omits `corporateKpiId`, `periodYear`, `periodMonth`
- [ ] Update form: only mutable fields editable; immutable fields display-only; payload excludes immutable fields
- [ ] Update payload always includes `description` (current value, null, or new text) — no dirtyFields omission
- [ ] Cancel: `cancellationReason` required (max 1000); payload is `activityId` + reason

**Approvals:**
- [ ] Pending queue: all requests visible (including own)
- [ ] Self-request disabled with explanation, or backend `CANNOT_APPROVE_OWN_REQUEST` error mapped safely
- [ ] Approve: confirmation modal, `PATCH` with no body, queue refresh
- [ ] Reject: reason modal, `PATCH` with `{ rejectionReason }`, queue refresh
- [ ] UPDATE request detail: lazy-fetch current activity for comparison (not per-row)

**Refresh:**
- [ ] Every tab activation fetches that tab's dataset — no stale data, no cross-page sync
- [ ] Submission refreshes My Requests only (no activity list auto-refresh after PENDING submission)
- [ ] Approve/reject refreshes pending queue only

**API contracts:**
- [ ] All read methods tested: `getMyActivities`, `getManagedActivities`, `getActivityById`, `getAssignableForRoot`, `getAssignableForChild`, `getMyRequests`, `getRequestById`, `getPendingRequests`
- [ ] All mutation methods tested with exact payloads: root/child create, update, cancel, approve, reject
- [ ] `ApiResponse<T>.data` unwrapping and error propagation tested

**Errors:**
- [ ] Error mapper handles all known backend messages; safe fallback for unknown content
- [ ] English only — no Indonesian labels, validation, or errors

**Quality:**
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] Jest passes (focused + full, `--no-coverage`)
- [ ] ESLint on changed P2 files: zero new errors and warnings
- [ ] Production build succeeds (`npm run build`)
- [ ] Manual smoke checklist prepared at `docs/testing/2026-07-24-kpi-frontend-p2-activity-verification.md` — not executed
- [ ] All user-facing text is English

---

**Plan status:** `READY FOR REVIEW`