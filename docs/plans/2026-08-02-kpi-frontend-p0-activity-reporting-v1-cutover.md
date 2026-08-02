# P0 — KPI Activity & Reporting V1 Frontend Cutover Plan

> **Date:** 2026-08-02 (Revision 2 — separate Activities and Activity Approvals pages; responsibility-based sidebar discoverability)
> **Branch (frontend):** `refactor/pms-focus` @ `6631cad` (ahead 9 of origin)
> **Branch (backend, authoritative):** `refactor/kpi-activity-reporting-v1` @ `d06ff13`
> **Status:** PLANNING ONLY — no application source was modified by this session
> **Scope:** Cut the frontend over to the final KPI Activity & Reporting V1 backend contract (18 endpoints, 5 permissions), removing the old over-engineered Activity/Report endpoints, permissions, and workflows, using **separate first-class Activities and Activity Approvals pages**.

---

## 1. Plain-Language Current Condition

The frontend KPI module (`src/modules/kpi/`) still talks to the **pre-V1 backend contract** that was deleted by the backend refactor. The UI is built around five legacy ideas that no longer exist on the server:

1. **Four separate activity lists** — My Activities (`GET /api/v1/kpi-activities/my`), Managed (`/managed`), Owned (`/owned`), and a Pending approval queue (`GET /api/v1/kpi-activity-requests/pending`). The backend now exposes **one scoped list endpoint** (`GET /api/v1/kpi-activities?scope=mine|subordinates|all`).
2. **Separate create/update/cancel submission endpoints** — `POST /kpi-activity-requests/root-create`, `/child-create`, `/update`, `/cancel`. The backend now exposes **two submission endpoints**: `POST /kpi-activity-requests` (unified CREATE, root-vs-child decided by `parentId`) and `POST /kpi-activities/{id}/change-requests` (unified UPDATE/CANCEL).
3. **Separate Activity approve/reject endpoints** — `PATCH /{id}/approve` and `PATCH /{id}/reject`. The backend now has **one unified decision endpoint** `PATCH /{id}/decision` with a `decision` discriminator (`APPROVE|REJECT`) and a conditional rejection reason.
4. **Permission-based access everywhere** — the UI gates pages, tabs, buttons, and sidebar entries on `kpi_activity:read`, `kpi_activity:request`, `kpi_report:read`, `kpi_report:submit`, `kpi_report:review`. The V1 backend removed these codes and made the normal workflow routes **responsibility-based** (exact assignment / stored approver / stored reviewer identity), keeping only five codes: `kpi_activity:root_request`, `kpi_activity:approve`, `kpi_activity:manage`, `kpi_activity:read_all`, `kpi_report:manage`. The frontend does not even define three of these five constants.
5. **No acting-Position concept** — V1 requires the caller to pass `actingPositionId` (a `core_positions.id`) for hierarchy-dependent reads and for **every** create/change submission. The frontend has no acting-position selector, no model, and the auth store exposes no position information at all (`src/types/auth.ts` has only `username/email/roles/permissions`).

Current navigation state: `src/config/navigation.ts` (the canonical sidebar source consumed by `src/components/layout/sidebar.tsx`) has **no Activity Approvals entry** — the standalone `/kpi/approvals` page exists and is reachable only by direct URL. The KPI Dashboard guard (`src/app/(main)/kpi/page.tsx`) gates on `KPI_ANY_PERMISSION` (9 obsolete codes), so an authenticated employee whose only relationship to KPI is assigned activities or stored-reviewer duties is **blocked from the Dashboard** despite V1 making those flows responsibility-based. `src/modules/kpi/sidebar.ts` is a stale duplicate that still lists an Approvals item; it is imported only by its own test (`src/modules/kpi/__tests__/sidebar.test.ts:4`) — zero production callers (verified this session).

The old `kpi_task:*` and `kpi_task_change:*` workflow contracts from the June 2026 multi-position audit (`FRONTEND_MULTIPOSITION_AUDIT.md`) no longer exist in either codebase — no trace of them remains in `src/`.

The `/hr` route prefix has already been removed (completed per `docs/pms-routing-restructure-plan.md`); the app is PMS-focused with routes `/`, `/kpi`, `/kpi/corporate`, `/kpi/activities`, `/kpi/approvals`, `/kpi/reports`, `/organization/*`, `/settings/*`.

## 2. Plain-Language Target Condition

After P0–P6, the frontend will:

- **Separate first-class pages and sidebar entries**: `Activities → /kpi/activities`, `Activity Approvals → /kpi/approvals`, `Reports → /kpi/reports`. Activity approval lives on its own page — never inside an Activities tab. `/kpi/approvals` is **not** deleted, redirected, or converted into a tab; it remains the real standalone approval page and appears directly in the canonical sidebar.
- Call **exactly the 18 V1 endpoints** through a small, type-checked client surface; no obsolete paths remain anywhere in `src/`.
- Model **explicit scopes** (`mine | subordinates | all` for activities; `mine | to-review` for requests and reports) and always send `scope` — never rely on a backend default. The three Activity scopes remain **view controls inside `/kpi/activities`** — they are not separate sidebar entries.
- **Separate the two request surfaces by responsibility**: `/kpi/activities` owns the user's own submitted requests (`requests?scope=mine`) and all Activity lists/requests; `/kpi/approvals` owns only requests assigned to the current user for decision (`requests?scope=to-review`), the unified APPROVE/REJECT decision, conditional rejection reason, stored-approver and maker–checker UX, already-processed recovery, and refetch after decision. The two surfaces share request types, the V1 client, detail presentation, error mapping, and invalidation utilities.
- Model **acting Position** explicitly: the user picks the Position (from their active assignments) that they are acting in for hierarchy-dependent operations; the frontend never guesses a primary/first-active position, and identity is always `core_positions.id`.
- Use **one unified decision call** for Activity request approve/reject (conditional reason required for REJECT), while keeping **separate approve/reject calls** for Reports.
- Make **sidebar discoverability responsibility-based**: Activities and Reports are visible to any authenticated user (V1 lists/reads need no permission); Activity Approvals is visible with `kpi_activity:approve`; the KPI Dashboard is visible to any authenticated user. Permission codes gate only their corresponding elevated actions or scopes — never the module entry points.
- Gate **actions** on the five V1 permissions only: `kpi_activity:root_request` → root Activity request; `kpi_activity:approve` → Activity decision; `kpi_activity:read_all` → all-Activities scope; `kpi_activity:manage` → Activity administrative tools; `kpi_report:manage` → Report administrative tools. `kpi_activity:manage` is never an approval bypass; `kpi_report:manage` is never required merely to open Reports. The backend remains authoritative (stored approver/reviewer identity, maker–checker).
- Surface **already-processed / version-conflict** failures as clear, recoverable UI states with data refresh — not generic error toasts.
- Keep Report submission, detail, evidence, approve, and reject inside the Reports experience (`/kpi/reports`), with evidence visible only to submitter/stored reviewer/`kpi_report:manage` holders. My Reports and Review Queue remain inside Reports (no separate problem found).

## 3. Authoritative Backend Contract (verified at `d06ff13`)

Source of truth: `erp-backend/src/main/java/com/erp/kpi/controller/*.java`, `dto/request/*.java`, `dto/response/*.java`, `entity/*.java`, `service/*.java`, `common/constant/{Permissions,MessageConstants}.java`. All statements below were read from these files in this session.

### 3.1 Exact endpoints (18)

**Activity + Activity-request (11):**

| # | Method | Path | Auth / permission | Notes |
|---|---|---|---|---|
| T1 | GET | `/api/v1/kpi-activities?scope=&actingPositionId=` | responsibility-based | `scope` required: `mine` (any active assignment), `subordinates` (requires valid `actingPositionId`), `all` (requires `kpi_activity:read_all` OR `kpi_activity:manage`); `actingPositionId` optional (only needed for `subordinates`) |
| T2 | GET | `/api/v1/kpi-activities/{id}?actingPositionId=` | assignee (exact core user) OR direct superior (Position-id via `actingPositionId`) OR `read_all` OR `manage` | `actingPositionId` optional; never implicit |
| T3 | GET | `/api/v1/kpi-activities/assignable-assignees?actingPositionId=&parentId=` | root (`parentId` null): `kpi_activity:root_request`; child (`parentId` set): exact parent-assignee or self-child hierarchy | returns actor's own assignment (root, `isSelf=true`) + direct subordinates of the acting Position |
| T4 | POST | `/api/v1/kpi-activity-requests` | root: `kpi_activity:root_request` (service-enforced); child: hierarchy | body `CreateActivityRequest`; root vs child decided by `parentId` |
| T5 | POST | `/api/v1/kpi-activities/{id}/change-requests` | owner (exact assignment) OR direct superior (Position-id) | body `ChangeRequestRequest` with `requestType` UPDATE or CANCEL; duplicate-pending guard |
| T6 | GET | `/api/v1/kpi-activity-requests?scope=` | `mine`: requester; `to-review`: requires `kpi_activity:approve`, returns PENDING where `approverUserId` = me | `scope` required |
| T7 | GET | `/api/v1/kpi-activity-requests/{id}` | requester OR stored approver OR `manage` | — |
| T8 | PATCH | `/api/v1/kpi-activity-requests/{id}/decision` | `@PreAuthorize kpi_activity:approve` + service: stored approver must be me; requester can never decide; PENDING only | body `RequestDecisionRequest`; **no separate approve/reject endpoints exist** |
| T9 | PATCH | `/api/v1/admin/kpi-activity-requests/{id}/approver` | `kpi_activity:manage` | body `AdminReassignRequestApproverRequest`; stuck-request recovery only; requester can never become approver |
| T10 | POST | `/api/v1/admin/kpi-activities` | `kpi_activity:manage` | body `AdminCreateActivityRequest` (mandatory `reason`); direct create, no approval |
| T11 | PATCH | `/api/v1/admin/kpi-activities/{id}` | `kpi_activity:manage` | body `AdminUpdateActivityRequest` with `action` UPDATE/REASSIGN/CANCEL + mandatory `reason` + `expectedVersion` |

**Report (7):**

| # | Method | Path | Auth | Notes |
|---|---|---|---|---|
| T12 | POST | `/api/v1/kpi-reports` (multipart) | exact assignee of the activity | parts `report` (JSON `SubmitReportRequest`) + `evidence` (file); reviewer resolved server-side (child → parent assignee; non-top-level root → unique superior; top-level root → configured `ROOT_REPORT_REVIEWER`) |
| T13 | GET | `/api/v1/kpi-reports?scope=` | `mine`: submitter; `to-review`: stored reviewer + PENDING | `scope` required |
| T14 | GET | `/api/v1/kpi-reports/{reportId}` | submitter OR stored reviewer OR `kpi_report:manage` | — |
| T15 | GET | `/api/v1/kpi-reports/{reportId}/evidence` | same as T14 | binary, `Content-Disposition: inline`, `X-Content-Type-Options: nosniff` |
| T16 | PATCH | `/api/v1/kpi-reports/{reportId}/approve` | stored reviewer (BEFORE status checks) | no body; cannot review own; PENDING only; activity must be ACTIVE; evidence must exist |
| T17 | PATCH | `/api/v1/kpi-reports/{reportId}/reject` | stored reviewer (BEFORE status checks) | body `RejectReportRequest { rejectionReason }` required; cannot review own; PENDING only; **rejection allowed when activity is CANCELLED and when evidence is unreadable** |
| T18 | PATCH | `/api/v1/admin/kpi-reports/{id}/reviewer` | `kpi_report:manage` | body `AdminReassignReportReviewerRequest`; submitter can never become reviewer |

**Client-function accounting (18 endpoints ↔ 18 client functions):** Activity normal-workflow client **8 functions** (T1–T8: `getActivities`, `getActivityById`, `getAssignableAssignees`, `submitCreateRequest`, `submitChangeRequest`, `getRequests`, `getRequestById`, `decideRequest`); Activity + Report admin client **4 functions** (T9, T10, T11, T18); Report normal-workflow client **6 functions** (T12–T17: `submitReport`, `getReports`, `getReportById`, `getEvidence`, `approveReport`, `rejectReport`). Total 8 + 4 + 6 = **18**.

### 3.2 Exact permission inventory (5 codes)

```
kpi_activity:root_request   — root CREATE submission + root assignable-assignees (T3 root, T4 root)
kpi_activity:approve        — T8 decision endpoint (@PreAuthorize) + T6 to-review scope + /kpi/approvals sidebar/page access
kpi_activity:manage         — T9/T10/T11 admin endpoints + T1 `all` scope + T2/T7 detail (admin visibility)
kpi_activity:read_all       — T1 `all` scope + T2 detail (read-only org-wide visibility)
kpi_report:manage           — T18 admin reviewer reassignment + T14/T15 detail/evidence visibility
```

Obsolete codes that must reach zero active frontend references: `kpi_activity:read`, `kpi_activity:request`, `kpi_report:read`, `kpi_report:submit`, `kpi_report:review`.

### 3.3 Exact DTOs / enums / rules (verified)

- **`CreateActivityRequest`** (T4): `assignedToUserPositionId` (required, `core_user_positions.id`), `actingPositionId` (required, `core_positions.id`), `parentId` (null → root), `corporateKpiId`, `periodYear`, `periodMonth` (required for root, must be null for child — service-validated `@Null`), `activityName` (required, ≤255), `description`, `unit` (required, ≤50), `targetValue` (required, positive BigDecimal).
- **`ChangeRequestRequest`** (T5): `requestType` (required UPDATE|CANCEL), `actingPositionId` (required), UPDATE-only fields `activityName`/`description`/`unit`/`targetValue`, CANCEL-only `cancellationReason` (≤1000), immutable lineage fields `parentId`/`corporateKpiId`/`assignedToUserPositionId`/`periodYear`/`periodMonth` all `@Null` (must be **omitted**, never sent as null).
- **`RequestDecisionRequest`** (T8): `decision` (required, `APPROVE|REJECT`), `rejectionReason` (≤1000); `@AssertTrue` — reason required **only when decision is REJECT**.
- **`SubmitReportRequest`** (T12): `activityId` (required), `reportDate` (required `LocalDate`, must fall within activity period year/month), `executionDescription` (required, ≤2000), `realizedValue` (required, positive), `note` (≤1000). No `actingPositionId` — report submission is exact-assignee only.
- **`RejectReportRequest`** (T17): `rejectionReason` (required, ≤1000).
- **Admin bodies**: `AdminCreateActivityRequest` = assignee/parent/indicator/period (same root-child rules as T4) + `reason` (required, ≤1000). `AdminUpdateActivityRequest` = `action` (`UPDATE|REASSIGN|CANCEL`) + `reason` + `expectedVersion` (required Long) + action-specific fields; lineage `@Null`. `AdminReassignRequestApproverRequest` = `newApproverUserId` (required), `newApproverUserPositionId` (optional validated context), `reason` (required). `AdminReassignReportReviewerRequest` = same shape.
- **Responses**: `KpiActivityResponse` — `id, parentId, parentActivityName, corporateKpiId, corporateKpiName, corporateKpiCode, assignedToUserPositionId, assignedToUserName, assignedToPositionName, activityName, description, unit, targetValue, periodYear, periodMonth, status (ACTIVE|CANCELLED), realizedValue, progressPercent, createdAt, updatedAt`. **No `version` field.**
  `KpiActivityChangeRequestResponse` — `id, requestType (CREATE|UPDATE|CANCEL), status (PENDING|APPROVED|REJECTED), activityId (null while PENDING), parentId, parentActivityName, corporateKpiId, corporateKpiName, assignedToUserPositionId, assignedToUserName, activityName, description, unit, targetValue, periodYear, periodMonth, requestedByUser, requestedByUserName, approverUserId, approverUserName, reviewedBy (UUID only, no name), reviewedAt, rejectionReason, cancellationReason, createdAt, updatedAt`. **No `version` field.**
  `AssignableUserPositionResponse` — `userPositionId, userId, userFullName, positionId, positionName, isPrimary, isSelf`.
  `KpiReportResponse` — `id, activityId, activityName, unit, activityTargetValue, submittedByUserPositionId, submittedByUserName, submittedByPositionName, reviewerUserId, reviewerUserName, reviewerUserPositionId (nullable), reviewerPositionName (nullable), reportDate, executionDescription, realizedValue, note, status (PENDING|APPROVED|REJECTED), reviewedBy, reviewedAt, rejectionReason, evidenceOriginalFilename, evidenceContentType, evidenceFileSize, createdAt, updatedAt`. No evidence path/URL.
- **Scopes**: activities `mine|subordinates|all`; requests and reports `mine|to-review`. Missing/invalid scope → 400 (`ACTIVITY_REQUEST_INVALID` / `INVALID_REPORT_SCOPE`). No pagination — all list endpoints return bare arrays.
- **Acting-position contract** (`ActingPositionValidator`): `actingPositionId` is a `core_positions.id`; the actor must hold an active `core_user_positions` assignment for it; both the Position and the exact assignment are returned. Never primary/first-active guessing.
- **Key error codes** (`MessageConstants`): `REQUEST_ALREADY_PROCESSED`, `REPORT_ALREADY_PROCESSED`, `ACTIVITY_VERSION_CONFLICT` ("Activity was modified by another user — reload and retry"), `NOT_THE_ASSIGNED_APPROVER`, `NOT_THE_REVIEWER`, `CANNOT_APPROVE_OWN_REQUEST`, `CANNOT_REVIEW_OWN_REPORT`, `DUPLICATE_PENDING_REQUEST`, `DUPLICATE_PENDING_REPORT`, `ACTIVITY_HAS_PENDING_REPORT`, `ACTIVITY_HAS_ACTIVE_CHILDREN`, `AMBIGUOUS_APPROVER`, `ADMIN_APPROVER_NOT_CONFIGURED`, `ADMIN_REVIEWER_NOT_CONFIGURED`, `APPROVER_NOT_ELIGIBLE`, `CANNOT_ASSIGN_REQUEST_TO_REQUESTER`, `ACTIVITY_TARGET_NOT_DIRECT_SUBORDINATE`, `CANNOT_ASSIGN_ACTIVITY_TO_SELF`, `REPORT_DATE_OUTSIDE_PERIOD`, `EVIDENCE_REQUIRED`, `INVALID_EVIDENCE_TYPE`, `EVIDENCE_NOT_FOUND`, `USER_POSITION_INACTIVE`, `PARENT_OWNER_INVALID`.
- **Optimistic lock**: `expectedVersion` required for T11; entity `@Version` also protects T8 (REJECT path), T9, T16–T18 (mapped to already-processed errors). **No response DTO exposes `version` — see §15.2.**

## 4. Current Frontend Inventory (repository audit)

### 4.1 Routes (App Router)

| Route | Page file | Current behavior |
|---|---|---|
| `/` | `src/app/(main)/page.tsx` | Main Dashboard (renders `DashboardContent`) |
| `/kpi` | `src/app/(main)/kpi/page.tsx` | KPI Dashboard; guard `hasAnyPerm(...KPI_ANY_PERMISSION)` (9 old codes) — **blocks responsibility-based users; guard must become authenticated-only** |
| `/kpi/corporate` | `src/app/(main)/kpi/corporate/page.tsx` | Corporate KPI configuration workspace (OUT OF SCOPE for cutover; unchanged) |
| `/kpi/activities` | `src/app/(main)/kpi/activities/page.tsx` | 5 tabs: My Activities / Managed / Owned / My Requests / **Approvals** (739 lines) — the Approvals tab is removed in P0 |
| `/kpi/approvals` | `src/app/(main)/kpi/approvals/page.tsx` | **Real standalone approval page** (guard `kpi_activity:approve`) — kept, adapted to V1 in P3 |
| `/kpi/reports` | `src/app/(main)/kpi/reports/page.tsx` | 2 tabs: My Reports / Review Queue; guard = old capability triple — guard becomes authenticated-only |

### 4.2 KPI module files (src/modules/kpi/)

- `constants.ts` — `KPI_ROUTES` (5 paths **including `approvals: '/kpi/approvals'`** — canonical route constants already contain both `/kpi/activities` and `/kpi/approvals`), `KPI_LABELS`, `KPI_DESCRIPTIONS`, `KPI_ANY_PERMISSION` (9 old codes; obsolete as a gate — deleted in P0, see §6.4).
- `sidebar.ts` — **stale duplicate with zero production callers** (verified: only `__tests__/sidebar.test.ts:4` imports `kpiSidebar`; the sidebar renderer consumes `navigationConfig`). **Deleted in P0.**
- `activity/` — `activity.types.ts`, `activity-api.ts`, `activity-error-mapper.ts`, `use-activity-data.ts`, `use-approval-data.ts`, `activity-table.tsx`, `request-table.tsx`, `approval-table.tsx`, `activity-form-modal.tsx`, `activity-cancel-dialog.tsx`, `kpi-activity-detail-modal.tsx`, `approval-dialog.tsx`, `__tests__/{activity-api.test.ts, activity-page.test.tsx}`.
- `report/` — `report.types.ts`, `report-api.ts`, `report-error-mapper.ts`, `use-report-data.ts`, `report-table.tsx`, `report-detail-modal.tsx`, `report-submit-modal.tsx`, `report-review-dialog.tsx`, `__tests__/{report-api.test.ts, report-page.test.tsx}`.
- `overview/` — `use-overview-data.ts` (aggregates old endpoints), `dashboard-content.tsx`, `overview-section.tsx`.
- `corporate/` — Corporate KPI aggregate workspace + `corporate-kpi-api.ts` (`getTreeByYear` reused by activity form; `/tree` stays for the activity selector — outside cutover).
- `__tests__/` — `sidebar.test.ts`, `overview-page.test.tsx`, `page-shells.test.tsx`.

### 4.3 Shared infrastructure

- `src/constants/permissions.ts` — `PERM` constants; **missing** `KPI_ACTIVITY_MANAGE`, `KPI_ACTIVITY_READ_ALL`, `KPI_REPORT_MANAGE`; defines the five obsolete codes.
- `src/hooks/use-permission.ts` — `hasPerm / hasAnyPerm / hasAllPerms` over `useAuthStore.user.permissions`.
- `src/config/navigation.ts` — **canonical sidebar source** (`src/components/layout/sidebar.tsx` imports `navigationConfig`). Current KPI entries: Dashboard (permission-gated via `KPI_ANY_PERMISSION`), Corporate KPI (`corporate_kpi:read`), Activities (4 old codes), Reports (`capability` over 3 obsolete codes). **No Activity Approvals entry.** Sidebar semantics: item with no `permissions`/`capability`/`roles` → `return true` (visible to every authenticated user — the (main) layout wraps the app in AuthGuard, so "any authenticated user" = omit the gate).
- `src/lib/axios.ts` — shared axios instance, bearer + refresh interceptor, FormData-aware (used by report submit).
- `src/types/api.ts` — `ApiResponse<T>` wrapper, `extractErrorMessage` (reads `detail ?? message ?? title`).
- `src/types/auth.ts` — `User { username, email, roles, permissions }` — **no `id`, no positions**; current-user UUID is not available client-side (backend `AuthResponse` also omits `id`; `GET /users/{id}/positions` requires `user:read`).
- `src/store/auth-store.ts` — Zustand auth store; no position data.
- Jest 30 (`jest.config.ts`): `moduleNameMapper` → `src/__mocks__/{heroui-react,phosphor-icons-react}.tsx`; test commands must run through Windows `cmd.exe /c` (WSL Node is too slow — user convention); use plural `--testPathPatterns`.

### 4.4 Current API call sites (22 total, all obsolete-path)

`src/modules/kpi/activity/activity-api.ts` (15 functions): `getMyActivities`, `getManagedActivities`, `getOwnedActivities`, `getActivityById`, `getMyRequests`, `getRequestById`, `getAssignableUserPositionsForRoot`, `getAssignableUserPositionsForChild`, `submitRootCreate`, `submitChildCreate`, `submitUpdate`, `submitCancel`, `getPendingRequests`, `approveRequest`, `rejectRequest`.

`src/modules/kpi/report/report-api.ts` (7 functions): `submitReport`, `getMyReports`, `getReportsToReview`, `getReportById`, `getEvidence`, `approveReport`, `rejectReport`.

Callers of the activity client: `use-activity-data.ts`, `use-approval-data.ts`, `kpi-activity-detail-modal.tsx` (line 57: direct `getActivityById` for UPDATE comparison), `report-submit-modal.tsx` (line 46: `getMyActivities` as the eligible-activity selector), `overview/use-overview-data.ts` (lines 122–185). Callers of the report client: `use-report-data.ts`, `report-detail-modal.tsx` (line 34: `getEvidence`).

### 4.5 Automated tests that must be rewritten/updated

`activity-api.test.ts` (400 lines; asserts 13 obsolete paths incl. `PATCH /{id}/approve` and `PATCH /{id}/reject`), `report-api.test.ts` (192 lines; asserts `/my` and `/to-review` paths), `activity-page.test.tsx` (99 lines; old permission-logic assertions incl. the Approvals tab), `report-page.test.tsx` (127 lines; old capability assertions), `overview-page.test.tsx` (262 lines; old endpoint calls), `sidebar.test.ts` (190 lines; tests the stale `kpiSidebar` duplicate — **rewritten in P0 to test `navigationConfig`**), `page-shells.test.tsx` (212 lines; renders 3 of 5 KPI page shells).

### 4.6 Historical plan documents (read as context; obsolete where they conflict)

- `docs/plans/2026-07-23-kpi-frontend-p0-foundation.md`, `2026-07-24-kpi-frontend-p2-activity.md`, `2026-07-25-…-strict-cascading-remediation.md`, `2026-07-26-kpi-frontend-p3-reports.md`, `2026-07-27-…-p4-overview.md` — all describe the **old** `/hr` routes, old permission codes, and old endpoints (`root-create`, `child-create`, `/update`, `/cancel`, `/pending`, `/approve`, `/reject`, `kpi_report:read|submit|review`). Treat as obsolete contract history; reusable only for UI-pattern decisions.
- `docs/pms-routing-restructure-plan.md` — status "Implementation complete"; `/hr` removal verified in the tree (no `src/modules/hr`, no `/hr` routes).
- `FRONTEND_MULTIPOSITION_AUDIT.md` (repo root, June 2026) — stale audit of modules that no longer exist; **relevant only as evidence that the frontend has never had an acting-position model**, and that auth carries no position data.

## 5. Old-to-New API Matrix

### 5.1 Activity client (`src/modules/kpi/activity/activity-api.ts` → V1)

| # | Current function | Current method/path | Current callers | Final endpoint | Payload/response changes | Disposition |
|---|---|---|---|---|---|---|
| 1 | `getMyActivities` | GET `/api/v1/kpi-activities/my` | `use-activity-data.ts:94`, `report-submit-modal.tsx:46`, `use-overview-data.ts:122` | GET `/api/v1/kpi-activities?scope=mine` | response identical (`KpiActivityResponse[]`); no `actingPositionId` needed for `mine` | rewrite (merge into `getActivities(scope)`, P1) |
| 2 | `getManagedActivities` | GET `/api/v1/kpi-activities/managed` | `use-activity-data.ts:109`, `use-overview-data.ts:132` | GET `/api/v1/kpi-activities?scope=subordinates&actingPositionId=<pos>` | requires explicit acting Position; response identical | rewrite (same merged function, P1) |
| 3 | `getOwnedActivities` | GET `/api/v1/kpi-activities/owned` | `use-activity-data.ts:124`, `use-overview-data.ts:145` | **no equivalent** — "owned" (requester-created) activity list does not exist in V1; ownership is the assignee's exact assignment (`scope=mine`) | — | **delete** (obsolete concept, P1) |
| 4 | `getActivityById` | GET `/api/v1/kpi-activities/{id}` | `use-activity-data.ts:153`, `use-approval-data.ts:65`, `kpi-activity-detail-modal.tsx:57` | GET `/api/v1/kpi-activities/{id}` (+ optional `actingPositionId` query) | same DTO; add optional query param for direct-superior access | keep (add param, P0 client) |
| 5 | `getMyRequests` | GET `/api/v1/kpi-activity-requests/my` | `use-activity-data.ts:139` | GET `/api/v1/kpi-activity-requests?scope=mine` | same DTO; response adds `approverUserId`/`approverUserName` | rewrite (merged `getRequests(scope)`, P1) |
| 6 | `getRequestById` | GET `/api/v1/kpi-activity-requests/{id}` | `use-activity-data.ts:166`, `use-approval-data.ts:56` | GET `/api/v1/kpi-activity-requests/{id}` | same DTO + approver fields | keep (P0 client) |
| 7 | `getAssignableUserPositionsForRoot` | GET `/api/v1/kpi-activities/assignable-user-positions` | `use-activity-data.ts:181` | GET `/api/v1/kpi-activities/assignable-assignees?actingPositionId=<pos>` (no `parentId`) | requires acting Position; response identical | merge into `getAssignableAssignees(actingPositionId, parentId?)` (P2) |
| 8 | `getAssignableUserPositionsForChild` | GET `/api/v1/kpi-activities/{parentId}/assignable-user-positions` | `use-activity-data.ts:194` | GET `/api/v1/kpi-activities/assignable-assignees?actingPositionId=<pos>&parentId=<id>` | requires acting Position; identical response | merge (same function, P2) |
| 9 | `submitRootCreate` | POST `/api/v1/kpi-activity-requests/root-create` | `use-activity-data.ts:209` | POST `/api/v1/kpi-activity-requests` with root-discriminated `CreateActivityRequest` (no `parentId`) + `actingPositionId` | payload renamed; discriminated root variant; add `actingPositionId` | merge into `submitCreateRequest(payload)` (P2) |
| 10 | `submitChildCreate` | POST `/api/v1/kpi-activity-requests/child-create` | `use-activity-data.ts:225` | POST `/api/v1/kpi-activity-requests` with child-discriminated variant (`parentId` set, corporate/period forbidden) + `actingPositionId` | `@Null` omission discipline enforced by TS `never` fields | merge (same function, P2) |
| 11 | `submitUpdate` | POST `/api/v1/kpi-activity-requests/update` | `use-activity-data.ts:241` | POST `/api/v1/kpi-activities/{id}/change-requests` body `UpdateChangeRequest` (`requestType:'UPDATE'`, `actingPositionId`, mutable fields) | path changes; discriminated UPDATE variant | rewrite (P2) |
| 12 | `submitCancel` | POST `/api/v1/kpi-activity-requests/cancel` | `use-activity-data.ts:257` | POST `/api/v1/kpi-activities/{id}/change-requests` body `CancelChangeRequest` (`requestType:'CANCEL'`, `actingPositionId`, `cancellationReason`) | path changes; discriminated CANCEL variant | rewrite (P2) |
| 13 | `getPendingRequests` | GET `/api/v1/kpi-activity-requests/pending` | `use-approval-data.ts:43`, `use-overview-data.ts:158` | GET `/api/v1/kpi-activity-requests?scope=to-review` | same DTO + approver fields; still requires `kpi_activity:approve` (service) | rewrite (merged `getRequests`, P3) |
| 14 | `approveRequest` | PATCH `/api/v1/kpi-activity-requests/{id}/approve` | `use-approval-data.ts:74` | PATCH `/api/v1/kpi-activity-requests/{id}/decision` body `ApproveDecision {decision:'APPROVE'}` (no reason) | **unified decision endpoint; no separate approve method may exist** | rewrite (merged `decideRequest`, P3) |
| 15 | `rejectRequest` | PATCH `/api/v1/kpi-activity-requests/{id}/reject` | `use-approval-data.ts:89` | PATCH `/api/v1/kpi-activity-requests/{id}/decision` body `RejectDecision {decision:'REJECT', rejectionReason}` | reason required only for REJECT (backend `@AssertTrue`; TS-discriminated) | rewrite (same merged function, P3) |
| 16 | — (new) | — | — | PATCH `/api/v1/admin/kpi-activity-requests/{id}/approver` | body `{newApproverUserId, newApproverUserPositionId?, reason}`; `kpi_activity:manage` | **add** (P5) |
| 17 | — (new) | — | — | POST `/api/v1/admin/kpi-activities` | body `AdminCreateActivityRequest` incl. `reason`; `kpi_activity:manage` | **add** (P5) |
| 18 | — (new) | — | — | PATCH `/api/v1/admin/kpi-activities/{id}` | body `{action, reason, expectedVersion, ...}`; `kpi_activity:manage` | **add** (P5; **blocked on §15.2**) |

### 5.2 Report client (`src/modules/kpi/report/report-api.ts` → V1) — 6 normal functions (T12–T17)

| # | Current function | Current method/path | Current callers | Final endpoint | Payload/response changes | Disposition |
|---|---|---|---|---|---|---|
| 1 | `submitReport` | POST `/api/v1/kpi-reports` (multipart `report`+`evidence`) | `use-report-data.ts:56` | **unchanged** | identical parts; `SubmitReportRequest` fields unchanged | keep (P4) |
| 2 | `getMyReports` | GET `/api/v1/kpi-reports/my` | `use-report-data.ts:23`, `use-overview-data.ts:171` | GET `/api/v1/kpi-reports?scope=mine` | response identical; add `reviewerUserId`, make `reviewerUserPositionId`/`reviewerPositionName` nullable | rewrite (merged `getReports(scope)`, P4) |
| 3 | `getReportsToReview` | GET `/api/v1/kpi-reports/to-review` | `use-report-data.ts:41`, `use-overview-data.ts:184` | GET `/api/v1/kpi-reports?scope=to-review` | response identical; **no permission needed** (stored reviewer identity) | rewrite (same merged function, P4) |
| 4 | `getReportById` | GET `/api/v1/kpi-reports/{reportId}` | `use-report-data.ts` (detail path) | **unchanged** | response + reviewer fields | keep (P4) |
| 5 | `getEvidence` | GET `/api/v1/kpi-reports/{reportId}/evidence` | `report-detail-modal.tsx:34` | **unchanged** | blob, inline disposition | keep (P4) |
| 6 | `approveReport` | PATCH `/api/v1/kpi-reports/{reportId}/approve` | `use-report-data.ts:74` | **unchanged** (stored-reviewer only) | no body | keep (P4) |
| 7 | `rejectReport` | PATCH `/api/v1/kpi-reports/{reportId}/reject` | `use-report-data.ts:92` | **unchanged** (stored-reviewer only) | `{rejectionReason}` required | keep (P4) |

T18 (`PATCH /api/v1/admin/kpi-reports/{id}/reviewer`, `kpi_report:manage`) belongs to the **admin client** (P5), not to the normal report client. Report normal client = **6 functions for T12–T17**.

### 5.3 Endpoint/function totals (must sum to 18)

| Surface | Endpoints | Client functions |
|---|---|---|
| Activity normal workflow (`activity-v1-api.ts`) | T1–T8 (8) | `getActivities`, `getActivityById`, `getAssignableAssignees`, `submitCreateRequest`, `submitChangeRequest`, `getRequests`, `getRequestById`, `decideRequest` (8) |
| Admin (`kpi-admin-v1-api.ts`) | T9, T10, T11, T18 (4) | `adminReassignApprover`, `adminCreateActivity`, `adminUpdateActivity`, `adminReassignReportReviewer` (4) |
| Report normal workflow (`report-v1-api.ts`) | T12–T17 (6) | `submitReport`, `getReports`, `getReportById`, `getEvidence`, `approveReport`, `rejectReport` (6) |
| **Total** | **18** | **18** |

### 5.4 Shared/corporate (out of scope)

`corporateKpiApi.getTreeByYear` (GET `/api/v1/corporate-kpis/tree?year=N`) — reused unchanged by the activity form and overview; part of the Corporate KPI surface that the cutover must **not** modify.

## 6. Permission Migration Matrix

### 6.0 Access-level model (do not collapse)

Sidebar discoverability, page access, scope access, and action access are **four separate concerns** and are documented separately. The backend is authoritative for authorization; frontend checks exist for discoverability and UX. The V1 normal workflow endpoints carry no permission annotations — access is responsibility-based (exact assignment / stored approver / stored reviewer). `KPI_ANY_PERMISSION` is **not** a valid gate for any of the four levels and is deleted in P0 (§6.4).

| Level | Rule |
|---|---|
| **Sidebar discoverability** | Activities: any authenticated user. Activity Approvals: `kpi_activity:approve`. Reports: any authenticated user. Corporate KPI: `corporate_kpi:read` (unchanged). Dashboard: any authenticated user. |
| **Page access** | `/kpi/activities`: any authenticated user. `/kpi/approvals`: `kpi_activity:approve`. `/kpi/reports`: any authenticated user. `/kpi`: any authenticated user. Each page renders graceful empty/error states when the user has no data in the requested scope — never a fabricated permission wall. |
| **Scope access** | `mine` (activities/requests/reports): responsibility-based, no permission. `subordinates`: hierarchy via explicit acting Position, no permission. `all` (activities): `kpi_activity:read_all` OR `kpi_activity:manage`. `to-review` (requests): `kpi_activity:approve`. `to-review` (reports): stored reviewer identity, no permission. |
| **Action access** | `kpi_activity:root_request` → root Activity request (T4 root, T3 root). `kpi_activity:approve` → Activity decision (T8) + to-review scope. `kpi_activity:read_all` → all-Activities scope read. `kpi_activity:manage` → Activity admin tools (T9/T10/T11) + `all` scope + detail visibility. `kpi_report:manage` → Report admin tools (T18) + detail/evidence visibility. Stored-approver/stored-reviewer identity and maker–checker are enforced by the backend; frontend mirrors only for UX (e.g., disabled buttons), never as the authority. |

### 6.1 Final permission constants

| Constant (to add/keep in `src/constants/permissions.ts`) | Value | Frontend usage level |
|---|---|---|
| `KPI_ACTIVITY_ROOT_REQUEST` (keep) | `kpi_activity:root_request` | action (Create Activity button + root assignable-assignees) |
| `KPI_ACTIVITY_APPROVE` (keep) | `kpi_activity:approve` | **sidebar + page access for `/kpi/approvals`**, action (decide buttons), scope `to-review` |
| `KPI_ACTIVITY_MANAGE` (**add**) | `kpi_activity:manage` | action (Activity admin tools), scope `all`, detail visibility |
| `KPI_ACTIVITY_READ_ALL` (**add**) | `kpi_activity:read_all` | scope `all` (read-only) |
| `KPI_REPORT_MANAGE` (**add**) | `kpi_report:manage` | action (reviewer reassignment, P5), detail/evidence visibility |
| `CORPORATE_KPI_READ` (keep, existing) | `corporate_kpi:read` | root-create form CK selector dependency (unchanged) |

### 6.2 Target sidebar rules (canonical `src/config/navigation.ts`)

| Sidebar entry | Route | Gate | Rationale |
|---|---|---|---|
| Dashboard | `/kpi` | none (any authenticated user) | V1 lists/reads are responsibility-based; an employee with assigned activities or reports must not be blocked by the old catalog |
| Corporate KPI | `/kpi/corporate` | `corporate_kpi:read` | unchanged (configuration surface is permission-based) |
| Activities | `/kpi/activities` | none (any authenticated user) | `GET /kpi-activities?scope=mine` and `GET /kpi-activity-requests?scope=mine` require no permission; an assignee must never lose the entry for lacking the four activity codes |
| Activity Approvals | `/kpi/approvals` | `kpi_activity:approve` | T8 decision + T6 to-review require this code; **`kpi_activity:manage` is not an approval bypass and never gates this entry** |
| Reports | `/kpi/reports` | none (any authenticated user) | submission, `scope=mine`, and stored-reviewer access are responsibility-based; `kpi_report:manage` gates only admin tools, not the entry |

### 6.3 Obsolete-permission reference inventory (every current reference)

| Permission literal | Files using it (non-test) | Current UI behavior | Final replacement rule | Level |
|---|---|---|---|---|
| `kpi_activity:read` | `permissions.ts:41`; `navigation.ts:38` (Activities item); `kpi/sidebar.ts:32`; `constants.ts:37` (KPI_ANY_PERMISSION); `activities/page.tsx:52,68` (canRead, canAccess); `overview/use-overview-data.ts:90` (canReadActivities); `report-submit-modal` indirectly via activity fetch | gates My/Managed tabs, Activities page access, overview Activities group, report-submit activity selector | **remove**; reads are responsibility-based (assignee/direct-superior/`manage`/`read_all`); page access = any authenticated user | page (transitional) → none |
| `kpi_activity:request` | `permissions.ts:43`; `navigation.ts:38`; `kpi/sidebar.ts:32`; `constants.ts:38`; `activities/page.tsx:54-72` (canOwned, canRequest, canMyRequests, canAccess); `overview/use-overview-data.ts:91` (canRequest) | gates Owned/My Requests tabs, Create-Child/Update/Cancel row actions | **remove**; submission is hierarchy-based (root needs `root_request`; child/update/cancel need exact owner or direct superior) | action/tab (transitional) → none |
| `kpi_report:read` | `permissions.ts:47`; `navigation.ts:46` (capability); `kpi/sidebar.ts:40`; `constants.ts:41`; `reports/page.tsx:22,25` (canReadMyReports, canAccess); `overview/use-overview-data.ts:93` (canReadReports) | gates My Reports tab + Reports page | **remove**; `scope=mine` is submitter-identity-based, no permission; page access = any authenticated user | tab (transitional) → none |
| `kpi_report:submit` | `permissions.ts:48`; `navigation.ts:48`; `kpi/sidebar.ts:42`; `constants.ts:42`; `reports/page.tsx:24` (canSubmitReport) | gates Submit Report button + submit-only empty state | **remove**; submission is exact-assignee; the submit modal's activity selector (from `scope=mine`) is the real gate | action (transitional) → none |
| `kpi_report:review` | `permissions.ts:49`; `navigation.ts:47`; `kpi/sidebar.ts:41`; `constants.ts:43`; `reports/page.tsx:23,25,67` (canReviewReports, detail mode); `overview/use-overview-data.ts:94` (canReviewReports) | gates Review Queue tab, REVIEW detail mode | **remove**; `scope=to-review` is stored-reviewer-identity-based | tab (transitional) → none |

Total obsolete references found in non-test `src/`: **30 usage sites across 9 files** (plus the literal definitions themselves). Test files (`sidebar.test.ts`, `overview-page.test.tsx`, `activity-page.test.tsx`, `report-page.test.tsx`) carry ~30 more.

### 6.4 `KPI_ANY_PERMISSION` removal

`KPI_ANY_PERMISSION` (defined in `src/modules/kpi/constants.ts:34-44`, used by `navigation.ts` Dashboard item, `src/modules/kpi/sidebar.ts` (stale), and `/kpi/page.tsx` guard) collapses discoverability/page access into one obsolete-code rule — exactly what §6.0 forbids. P0: after the Dashboard item is ungated, the stale sidebar is deleted, the `/kpi` guard is made authenticated-only, and the sidebar test is rewritten, the constant has **zero callers** and is **deleted in P0**. Its 9 obsolete entries never appear in any new gate.

## 7. Route and Screen Migration Matrix

### 7.1 Route map (target)

| Route | Page file | Target ownership |
|---|---|---|
| `/kpi/activities` | `src/app/(main)/kpi/activities/page.tsx` | Activity workspace: lists (`mine`/`subordinates`/`all` as view controls), acting-Position selection, Activity detail, root/child Activity requests, UPDATE/CANCEL change requests, submitted-request history (`requests?scope=mine`). **No approval queue, no approve/reject.** |
| `/kpi/approvals` | `src/app/(main)/kpi/approvals/page.tsx` (kept) | Approval page: `requests?scope=to-review`, approval request detail, unified APPROVE/REJECT decision, conditional rejection reason, stored-approver + maker–checker UX, already-processed recovery, refetch after decision. **No Activity lists, no Activity creation, no submitted-request history.** |
| `/kpi/reports` | `src/app/(main)/kpi/reports/page.tsx` | Reports experience (My Reports / Review Queue structure unchanged): submission, `scope=mine`, `scope=to-review`, detail, evidence, separate approve/reject. |
| `/kpi` | `src/app/(main)/kpi/page.tsx` | KPI Dashboard; guard becomes authenticated-only. |

### 7.2 Migration matrix

| Current route/construct | Current behavior | Target | Retained components | Replaced components | Timing | Navigation changes |
|---|---|---|---|---|---|---|
| `/kpi/activities` — Approvals tab (5th tab) | pending queue + approve/reject inside Activities | **Removed** — approval lives only on `/kpi/approvals` | — | tab wiring, `useApprovalData` usage, `ApprovalTable`/`ApprovalDialog` usage on this page | **P0** (visible P0 deliverable; removes the duplicate queue surface immediately) | — |
| `/kpi/activities` — remaining 4 tabs (My/Managed/Owned/My Requests) | legacy endpoints | Tabs rebuilt on scopes: My Activities (`scope=mine`), Team Activities (`scope=subordinates` + acting Position), All Activities (`scope=all`, `read_all`/`manage`), My Requests (`requests?scope=mine`). The three activity scopes are **view controls inside this page**, never sidebar entries. | `ActivityTable`, `RequestTable`, `ActivityFormModal`, `ActivityCancelDialog`, `KpiActivityDetailModal` (adapted) | legacy fetch hooks, old tab wiring | P1–P2 | Activities sidebar entry ungated (any authenticated user) |
| `/kpi/approvals` — standalone page | legacy `GET /pending` + separate approve/reject; guard `kpi_activity:approve`; **no sidebar entry** | **Kept as the real standalone approval page**; adapted to `requests?scope=to-review` + unified `PATCH /{id}/decision`; sidebar entry added (gated `kpi_activity:approve`). Not deleted, not redirected, not converted to a tab. | `ApprovalTable`, `ApprovalDialog`, `KpiActivityDetailModal` (REQUEST mode), `useApprovalData` (adapted) | legacy pending fetch, separate approve/reject calls | P3 (adaptation); P0 (sidebar entry + guard kept) | **New separate sidebar entry "Activity Approvals" → `/kpi/approvals`** |
| `/kpi/reports` | 2 tabs My Reports / Review Queue; capability gate | Same tab structure; scoped fetches; guard becomes authenticated-only; `kpi_report:manage` gates only admin tools (P5) | `ReportTable`, `ReportDetailModal`, `ReportSubmitModal`, `ReportReviewDialog` (adapted) | capability logic, old fetch paths, obsolete permission gates | P4 | Reports sidebar entry ungated (any authenticated user) |
| `/kpi` Dashboard | guard `hasAnyPerm(...KPI_ANY_PERMISSION)` blocks responsibility-based users | authenticated-only guard; groups fed by scoped endpoints (`mine` + `to-review` counts; subordinate metrics only once acting-Position selector exists) | `dashboard-content.tsx`, `overview-section.tsx` (adapted), `use-overview-data.ts` (rewritten) | old fetch calls, old guard | P1/P4 | Dashboard sidebar entry ungated |

## 8. Workflow Matrix

Conventions: **entry point** = UI surface; **owner route** = the page that owns the capability; **backend endpoint** = exact path; **identity** = required query/body identity; **states** = loading/empty/error/success; **invalidation** = refetch scope after mutation. "Already-processed/version-conflict" handling is global: on `REQUEST_ALREADY_PROCESSED`, `REPORT_ALREADY_PROCESSED`, or `ACTIVITY_VERSION_CONFLICT` show an inline banner/dialog state (not a toast) and refetch the current list/detail.

| # | Workflow | Owner route | Entry point | Required UI capability | Backend endpoint | Required query/body identity | Loading/empty/error/success | Invalidation |
|---|---|---|---|---|---|---|---|---|
| 1 | View own activities | `/kpi/activities` | My Activities view | none (responsibility-based) | `GET /kpi-activities?scope=mine` | `scope=mine` only | table spinner → empty state "No activities assigned to you" → inline error + Retry | fetch on view activation |
| 2 | View team activities | `/kpi/activities` | Team Activities view | explicit acting Position | `GET /kpi-activities?scope=subordinates&actingPositionId=` | `scope=subordinates` + acting Position (`core_positions.id`) | acting-Position selector empty state when no active assignment; table states as #1 | fetch on view activation / acting-Position change |
| 3 | View all activities | `/kpi/activities` | All Activities view | `kpi_activity:read_all` OR `kpi_activity:manage` | `GET /kpi-activities?scope=all` | `scope=all` | view hidden unless capability; graceful error otherwise | fetch on view activation |
| 4 | View activity detail | `/kpi/activities` | row eye action / detail modal | assignee, direct superior (with acting Position), `read_all`, or `manage` | `GET /kpi-activities/{id}?actingPositionId=` | optional acting Position (only for direct-superior access) | modal spinner → detail surfaces → "Failed to load activity detail." | close/reopen |
| 5 | Explicitly choose acting Position | `/kpi/activities` (page-level selector; also inside create/change modals) | acting-Position selector | user has ≥1 active assignment | — (client-side; feeds every hierarchy call) | value must be `core_positions.id` | selector shows active positions by name; empty state when user has no active assignment; **never auto-picks primary/first** | refresh on identity change; invalidates `subordinates` list, assignable-assignees, and all submission payloads |
| 6 | Request a root Activity | `/kpi/activities` | "Create Activity" button | `kpi_activity:root_request` + `corporate_kpi:read` | `POST /kpi-activity-requests` | body: root-discriminated `CreateActivityRequest` (no `parentId`, corporate/period required, `actingPositionId` required) | form validation errors inline; submit spinner; success toast + close; server errors via domain mapper | refetch My Requests (`requests?scope=mine`) |
| 7 | Request a child Activity | `/kpi/activities` | row action on an assigned ACTIVE activity | exact parent assignee (via acting Position) | `POST /kpi-activity-requests` | body: child-discriminated variant (`parentId` set, corporate/period forbidden — TS `never` fields, `actingPositionId` required) | same as #6; empty assignee list → "No direct subordinates are available." | refetch My Requests |
| 8 | Request Activity changes (UPDATE) | `/kpi/activities` | row action on an owned ACTIVE activity | exact owner or direct superior | `POST /kpi-activities/{id}/change-requests` | body `UpdateChangeRequest` (`requestType:'UPDATE'`, `actingPositionId`, mutable fields; lineage forbidden) | duplicate-pending error mapped; success toast + close | refetch My Requests + the activity list |
| 9 | Request cancellation (CANCEL) | `/kpi/activities` | row action / cancel dialog on an owned ACTIVE activity | exact owner or direct superior | `POST /kpi-activities/{id}/change-requests` | body `CancelChangeRequest` (`requestType:'CANCEL'`, `actingPositionId`, `cancellationReason`) | reason required (≤1000); `ACTIVITY_HAS_ACTIVE_CHILDREN` / `ACTIVITY_HAS_PENDING_REPORT` mapped | refetch My Requests |
| 10 | View submitted requests | `/kpi/activities` | My Requests view | none (requester identity) | `GET /kpi-activity-requests?scope=mine` | `scope=mine` | table + status chips (PENDING/APPROVED/REJECTED) | fetch on view activation |
| 11 | View assigned approval requests | `/kpi/approvals` | page load / refresh | `kpi_activity:approve` (page guard) | `GET /kpi-activity-requests?scope=to-review` | `scope=to-review` | only PENDING where `approverUserId` = me; empty state "No requests assigned to you"; inline error + Retry | fetch on mount; **after every decision** |
| 12 | View approval request detail | `/kpi/approvals` | row eye action / shared request-detail modal | requester OR stored approver OR `manage` (backend) | `GET /kpi-activity-requests/{id}` | — | modal spinner → request detail incl. approver identity, rejection/cancellation reasons | close/reopen |
| 13 | Approve Activity request | `/kpi/approvals` | row Approve / dialog | `kpi_activity:approve` + stored approver = me | `PATCH /kpi-activity-requests/{id}/decision` | body `ApproveDecision {decision:'APPROVE'}` (no reason field serialized) | confirmation dialog; success toast; `REQUEST_ALREADY_PROCESSED`/`NOT_THE_ASSIGNED_APPROVER`/`CANNOT_APPROVE_OWN_REQUEST` mapped; already-processed → banner + refetch | refetch `scope=to-review` |
| 14 | Reject Activity request (required reason) | `/kpi/approvals` | row Reject / dialog | same as #13 | `PATCH /kpi-activity-requests/{id}/decision` | body `RejectDecision {decision:'REJECT', rejectionReason}` — reason mandatory client-side and server-side (`@AssertTrue`) | reason field required, ≤1000; same error handling as #13 | refetch `scope=to-review` |
| 15 | Submit Report | `/kpi/reports` | Submit Report button → modal | exact assignee of an ACTIVE activity (activity selector from `scope=mine`) | `POST /kpi-reports` (multipart) | parts `report` JSON + `evidence` file; no acting Position | validation (date in period, positive realized value, evidence image ≤5MB); `DUPLICATE_PENDING_REPORT`, `REPORT_DATE_OUTSIDE_PERIOD` mapped | if My Reports visible, refetch `scope=mine`; else close silently |
| 16 | View own Reports | `/kpi/reports` | My Reports tab | submitter identity | `GET /kpi-reports?scope=mine` | `scope=mine` | table (reviewer column shows stored reviewer) | fetch on tab activation |
| 17 | View assigned Reports | `/kpi/reports` | Review Queue tab | stored reviewer identity | `GET /kpi-reports?scope=to-review` | `scope=to-review` | only PENDING where reviewer = me | fetch on tab activation |
| 18 | View Report evidence | `/kpi/reports` | Report detail modal (evidence preview) | submitter, stored reviewer, or `kpi_report:manage` | `GET /kpi-reports/{reportId}/evidence` | — | blob → object URL preview; `EVIDENCE_NOT_FOUND` mapped; **never surfaced from Activity or Approval screens** | revoke URL on close |
| 19 | Approve Report | `/kpi/reports` | detail modal / review dialog | stored reviewer (not submitter) | `PATCH /kpi-reports/{reportId}/approve` | no body | confirmation; `REPORT_ALREADY_PROCESSED`, `NOT_THE_REVIEWER`, `CANNOT_REVIEW_OWN_REPORT` mapped | refetch `scope=to-review` (+ `scope=mine` if visible) |
| 20 | Reject Report | `/kpi/reports` | detail modal / review dialog | stored reviewer (not submitter) | `PATCH /kpi-reports/{reportId}/reject` | body `{rejectionReason}` required | reason required ≤1000; same error handling as #19 | refetch `scope=to-review` |
| 21 | Administratively create/update Activity | `/kpi/activities` (admin tools, P5) | Admin tools | `kpi_activity:manage` | `POST /api/v1/admin/kpi-activities` / `PATCH /api/v1/admin/kpi-activities/{id}` | T10 body incl. `reason`; T11 body incl. `action`, `reason`, `expectedVersion` | audit reason required; `ACTIVITY_VERSION_CONFLICT` → reload + retry banner | refetch the affected scope list |
| 22 | Administratively reassign Activity approver | `/kpi/approvals` (admin tools, P5) | Admin tools | `kpi_activity:manage` | `PATCH /api/v1/admin/kpi-activity-requests/{id}/approver` | body `{newApproverUserId, reason}` (+ optional position context) | requester-never-approver + `APPROVER_NOT_ELIGIBLE` mapped; already-processed → banner + refetch | refetch `scope=to-review` |
| 23 | Administratively reassign Report reviewer | `/kpi/reports` (admin tools, P5) | Admin tools | `kpi_report:manage` | `PATCH /api/v1/admin/kpi-reports/{id}/reviewer` | body `{newReviewerUserId, reason}` (+ optional position context) | submitter-never-reviewer mapped; already-processed → banner + refetch | refetch `scope=to-review` |
| 24 | Handle already-processed / version-conflict responses | both pages | any mutation (T8/T9/T10/T11/T16/T17/T18) | — | — | — | **recoverable state**: banner "This request/report has already been processed — showing latest data" or "Activity was modified by another user — reload and retry", then refetch; never a generic toast | refetch current list/detail |

**Shared-surface rule:** `/kpi/activities` and `/kpi/approvals` reuse the same `activity-v1-api` client, `KpiActivityChangeRequestResponse` type, `KpiActivityDetailModal` (REQUEST mode) presentation, `mapActivityError`/`domain-errors` mapping, and refetch-after-mutation invalidation. No duplicated clients or detail rendering between the two pages.

## 9. Confirmed Reusable Code

Classification: **unchanged** = keep as-is; **adapt** = reuse with contract/call-site updates; **obsolete** = remove.

### 9.1 Reusable unchanged

| Asset | Files | Why |
|---|---|---|
| Shared axios client | `src/lib/axios.ts` | bearer auth, refresh interceptor, FormData handling all still correct |
| Error extraction | `src/types/api.ts` (`extractErrorMessage`, `ApiResponse<T>`) | generic; works for V1 responses |
| Permission hook | `src/hooks/use-permission.ts` | generic; no changes needed (only the constants it reads change) |
| Corporate KPI client | `src/modules/kpi/corporate/corporate-kpi-api.ts` (`getTreeByYear`) | unchanged surface; still the activity-form CK selector and overview data source |
| Page layout primitives | breadcrumbs + title/Chip/Refresh pattern in all KPI list pages | established convention; reused on both `/kpi/activities` and `/kpi/approvals` |
| Table render-state pattern | `renderEmptyState` loading/error/empty + Retry in `ActivityTable`, `RequestTable`, `ApprovalTable`, `ReportTable` | keep as the canonical pattern |
| Report submit multipart mechanics | `report-submit-modal.tsx` evidence validation/preview + `report-api.submitReport` | T12 contract identical |
| Report approve/reject mechanics | `report-review-dialog.tsx`, `report-api.approveReport/rejectReport`, `use-report-data` approve/reject | T16/T17 identical |

### 9.2 Reusable after adaptation

| Asset | Adaptation needed | Owner route(s) |
|---|---|---|
| `activity.types.ts` `KpiActivityResponse` | fields match the V1 DTO exactly — reuse as-is (no `version` on either side) | `/kpi/activities` |
| `activity.types.ts` `KpiActivityChangeRequestResponse` | add `approverUserId`/`approverUserName` (optional for safety); drop nothing | both pages (shared type) |
| `activity.types.ts` label/chip maps | `REQUEST_TYPE_*`, `REQUEST_STATUS_*` labels stay; the `*_VARIANT` Badge maps are obsolete (detail modal still renders `Badge`; the table components already use Chip maps — see §10.3) | both pages |
| `activity-api.ts` `getActivityById`, `getRequestById` | keep signatures in the V1 client; `getActivityById` gains optional `actingPositionId` query | both pages |
| `use-activity-data.ts` | refactor legacy fetch families into scoped fetches; add acting-Position state; mutations call the two new submission endpoints; refresh My Requests after submission | `/kpi/activities` |
| `use-approval-data.ts` | `approve`/`reject` collapse into `decideRequest`; pending fetch → `getRequests('to-review')`; refetch after decision | `/kpi/approvals` |
| `activity-table.tsx` | columns unchanged (Name/Parent/CK/Period/Target/Realized/Progress/Status); actions become context-aware per view; add assignee column where useful; drop the `canRequest` prop in favor of scope-based action wiring | `/kpi/activities` |
| `request-table.tsx` | add optional Approver column; status chips already correct | `/kpi/activities` (My Requests) |
| `approval-table.tsx` | add Approver column (stored approver identity is now explicit); keep Approve/Reject buttons; reused **on `/kpi/approvals` only** | `/kpi/approvals` |
| `approval-dialog.tsx` | APPROVE/REJECT modes stay; wire to unified `decideRequest`; already-processed handling per §8 #24; reused **on `/kpi/approvals` only** | `/kpi/approvals` |
| `activity-cancel-dialog.tsx` | payload becomes `CancelChangeRequest` (add `actingPositionId`, `requestType:'CANCEL'`); call `submitChangeRequest(activity.id, ...)` | `/kpi/activities` |
| `activity-form-modal.tsx` | unified create payload (discriminated `CreateActivityRequest` + `actingPositionId`); assignee list from `assignable-assignees`; UPDATE mode posts to `change-requests`; keep CK/year/month selector logic (root) and inherited-period read-only display (child) | `/kpi/activities` |
| `kpi-activity-detail-modal.tsx` | add approver info row; replace `Badge` variant maps with Chip maps; keep UPDATE current-vs-proposed comparison (via `getActivityById` on the request's `activityId`); **shared REQUEST mode between both pages** | both pages |
| `report.types.ts` `KpiReportResponse` | add `reviewerUserId`; make `reviewerUserPositionId`/`reviewerPositionName` nullable (backend omits them for positionless reviewers) | `/kpi/reports` |
| `report-table.tsx` | mode MY/TO_REVIEW already matches `scope=mine`/`to-review`; TO_REVIEW shows "Submitted By", MY shows "Reviewer" — keep; feed from scoped fetch | `/kpi/reports` |
| `report-detail-modal.tsx` | evidence fetch unchanged; ensure it renders only inside Report experience (Activity/Approval screens never open it) | `/kpi/reports` |
| `use-report-data.ts` | `fetchMyReports`/`fetchToReview` → `getReports('mine')`/`getReports('to-review')` | `/kpi/reports` |
| `overview/use-overview-data.ts` + `dashboard-content.tsx` | swap old endpoint calls for scoped ones; `managed`/`owned` groups become `mine` (+ `to-review` counts); subordinate metrics only once the acting-Position selector exists | `/kpi` |
| `sidebar.test.ts` | **rewritten** in P0 to assert `navigationConfig` (separate Activities and Activity Approvals entries, ungated Activities/Reports, approvals gated on `kpi_activity:approve`); the stale `kpiSidebar` import is removed | tests |

## 10. Confirmed Obsolete Code

### 10.1 Obsolete API surface (delete or rewrite in the listed phase)

| Phase | File | Items |
|---|---|---|
| P1 | `activity-api.ts` | `getMyActivities`, `getManagedActivities`, `getOwnedActivities` (replaced by `getActivities(scope)`) |
| P1 | `use-activity-data.ts` | `myActivities/managedActivities/ownedActivities` state families |
| P2 | `activity-api.ts` | `getAssignableUserPositionsForRoot`, `getAssignableUserPositionsForChild`, `submitRootCreate`, `submitChildCreate`, `submitUpdate`, `submitCancel` (replaced by `getAssignableAssignees`, `submitCreateRequest`, `submitChangeRequest`) |
| P2 | `activity.types.ts` | `CreateRootActivityPayload`, `CreateChildActivityPayload`, `UpdateKpiActivityPayload`, `CancelKpiActivityPayload`, `ActivityFormMode` legacy variants (replaced by discriminated `CreateActivityRequest` + `ChangeRequestRequest`) |
| P3 | `activity-api.ts` | `getPendingRequests`, `approveRequest`, `rejectRequest` (replaced by `getRequests('to-review')` + `decideRequest`) |
| P3 | `use-approval-data.ts` | legacy pending-queue fetch + separate approve/reject mutations (rewritten to `decideRequest`) |
| P4 | `report-api.ts` | `getMyReports`, `getReportsToReview` (replaced by `getReports(scope)`) |
| P5 | — | (new admin client functions added; nothing to delete) |
| P6 | `permissions.ts` | `KPI_ACTIVITY_READ`, `KPI_ACTIVITY_REQUEST`, `KPI_REPORT_READ`, `KPI_REPORT_SUBMIT`, `KPI_REPORT_REVIEW` constants |
| P6 | `navigation.ts` | any residual obsolete permission arrays (after P0 the KPI entries carry none) |

### 10.2 Obsolete DTOs / types matching deleted backend classes

- `CreateRootActivityPayload`, `CreateChildActivityPayload`, `UpdateKpiActivityPayload`, `CancelKpiActivityPayload` — the backend classes `CreateRootActivityRequest`, `CreateChildActivityRequest`, `UpdateKpiActivityRequest`, `CancelKpiActivityRequest` no longer exist.
- `AssignableUserPositionResponse` shape is unchanged (reused); `KpiActivityStatus/RequestType/RequestStatus` enums unchanged (reused).

### 10.3 Obsolete UI constructs

| Construct | Location | Replacement |
|---|---|---|
| **Approvals tab inside `/kpi/activities`** | `activities/page.tsx` (5th tab + `useApprovalData`/`ApprovalTable`/`ApprovalDialog` usage) | **removed in P0**; the approval queue renders only on the standalone `/kpi/approvals` page — never both surfaces (rule: "Do not render the same approval queue both as an Activities tab and as a standalone page") |
| My/Managed/Owned/My Requests tab design | `activities/page.tsx` | rebuilt on real scopes as view controls (`mine`/`subordinates`/`all`) + My Requests (`requests?scope=mine`) in P1–P2 |
| Badge variant maps `ACTIVITY_STATUS_VARIANT`, `REQUEST_TYPE_VARIANT`, `REQUEST_STATUS_VARIANT` | `activity.types.ts:142-157`, consumed by `kpi-activity-detail-modal.tsx` | Chip color maps (already used by the tables) |
| `kpi_activity:read`-gated "Create Child/Update/Cancel" row actions | `activity-table.tsx` + page wiring | scope-context actions (exact owner / direct superior via acting Position) |
| Reports `capability` compound gate over obsolete codes | `navigation.ts:45-48`, `kpi/sidebar.ts:39-42` | removed in P0; Reports entry ungated (responsibility-based) |
| **Stale duplicate sidebar implementation** `src/modules/kpi/sidebar.ts` | whole file (zero production callers; only `sidebar.test.ts:4` imports it) | **deleted in P0**; its obsolete test rewritten against `navigationConfig`. **The Activity Approvals navigation concept is not obsolete** — the stale file is; the entry itself moves into the canonical `navigationConfig` |
| `KPI_ANY_PERMISSION` | `constants.ts:34-44` | **deleted in P0** after ungating Dashboard/Activities/Reports and rewriting the sidebar test (zero remaining callers); the gate levels are documented separately per §6.0 |
| Permission gate on `/kpi`, `/kpi/activities`, `/kpi/reports` page guards | `kpi/page.tsx:12`, `activities/page.tsx:68-73`, `reports/page.tsx:25` | authenticated-only guards in P0 (see §12.9) |

## 11. Phased Roadmap P0–P6

Dependency chain: `P0 → P1 → P2 → P3 → P4 → P5 → P6`. Each phase ends with the repository-standard gates: lint, type-check, targeted tests, production build, manual smoke checklist (exact commands in §13.2).

### Route-level ownership (fixed from P0 onward)

- **`/kpi/activities`** owns: Activity lists via `mine`, `subordinates`, `all`; explicit acting-Position selection; Activity detail; root and child Activity requests; Activity UPDATE/CANCEL change requests; submitted-request history (`requests?scope=mine`). **Does not own:** requests assigned to the current user for approval; approve/reject actions.
- **`/kpi/approvals`** owns: `GET /kpi-activity-requests?scope=to-review`; approval request detail; unified APPROVE/REJECT decision; conditional rejection reason; stored-approver and maker–checker UX; already-processed recovery; refetch after decision. **Does not own:** submitted-request history; Activity lists; general Activity creation.
- Both pages reuse shared Activity-request types, the V1 client, detail presentation, error mapping, and invalidation utilities (§8 shared-surface rule).

### P0 — Contract and navigation foundation (detailed in §12)

Scope (smallest safe slice for the immediately following executable piece, P1):
- shared V1 contract foundations: explicit scope model, acting-Position model + selector contract, domain-error classification;
- `activity-v1.types.ts` — full normal-workflow V1 types **with precise discriminated unions** (§12.5), needed by P1 and locked early;
- `activity-v1-api.ts` — **read surface only** (`getActivities`, `getActivityById`, `getRequests`, `getRequestById` = T1/T2/T6/T7), exactly what P1 consumes; mutations and decision land with their phases (P2/P3) — no unused production abstractions mirroring all 18 endpoints;
- permission constants (add 3, deprecate 5); canonical navigation with **separate Activities and Activity Approvals sidebar entries**; authenticated-only guards for `/kpi`, `/kpi/activities`, `/kpi/reports`; `/kpi/approvals` keeps its `kpi_activity:approve` guard;
- **remove the Approvals tab from `/kpi/activities`** (visible P0 deliverable — navigation/page-shell changes are intentional and smoke-tested, resolving the old "no visible change" contradiction);
- delete the stale `src/modules/kpi/sidebar.ts` duplicate; rewrite `sidebar.test.ts` against `navigationConfig`; delete `KPI_ANY_PERMISSION`;
- record the two backend-contract blockers (§15) as P1/P2 and P5 preconditions.

Deliverables: `src/modules/kpi/shared/{scope.types,acting-position,domain-errors}.ts` (+ tests), `activity-v1.types.ts`, `activity-v1-api.ts` (reads), updated `permissions.ts`/`navigation.ts`/`constants.ts`, rewritten `sidebar.test.ts`, page-guard updates, Approvals-tab removal.
Exit criteria: the locked P0 acceptance list (§16); `npm run build` green; legacy UI still functional except the removed tab; legacy clients remain only where their phase has not yet replaced them.

### P1 — Activity read experience (`/kpi/activities`)

**Precondition: acting-Position source resolved (§15.1).** Scope: scoped Activity views (`mine` / `subordinates` / `all` as view controls — never sidebar entries); acting-Position selector live in the page shell; Activity detail with acting-Position-aware access; My Requests view (`requests?scope=mine`); exact assignee identity display (never coworker-merged); overview hook first pass (authenticated-only guard already in P0).
Deliverables: `use-activity-data` rewrite to scoped fetches; view-shell reconciliation; detail modal adaptation; request-table adaptation; acting-Position selector implementation.
Exit criteria: legacy `/my`, `/managed`, `/owned` calls removed from activity reads; `scope` always sent; acting Position required for `subordinates`; no implicit position selection.

### P2 — Activity request submission (`/kpi/activities`)

Scope: unified CREATE (root + child, discriminated payloads) via `POST /kpi-activity-requests`; unified UPDATE/CANCEL via `POST /kpi-activities/{id}/change-requests`; assignable-assignees flow with acting Position; request history/detail; acting Position required in every submission payload.
Deliverables: form-modal rewrite, cancel-dialog rewrite, `getAssignableAssignees`/`submitCreateRequest`/`submitChangeRequest` client functions, request detail adaptation.
Exit criteria: no `root-create`/`child-create`/`update`/`cancel` paths remain; every submission sends `actingPositionId`; discriminated unions serialize only permitted fields.

### P3 — Activity approval (`/kpi/approvals`)

Scope: adapt the **standalone** `/kpi/approvals` page to V1 — `requests?scope=to-review`; unified `PATCH /{id}/decision`; conditional rejection reason; maker–checker UX; already-processed recovery; refetch after decision; `useApprovalData` rewrite. The Approvals tab was already removed from `/kpi/activities` in P0 — there is no second surface.
Deliverables: `getRequests('to-review')`/`decideRequest` client functions, approval page adaptation, `approval-dialog` rewrite, `use-approval-data` rewrite, shared request-detail integration.
Exit criteria: zero references to `PATCH /{id}/approve` or `PATCH /{id}/reject` anywhere; `REQUEST_ALREADY_PROCESSED` surfaces a recoverable banner + refetch; `/kpi/approvals` reachable from the sidebar and guarded by `kpi_activity:approve`.

### P4 — Reporting (`/kpi/reports`)

Scope: report V1 types + client (**6 functions, T12–T17**) — `submitReport`, `getReports`, `getReportById`, `getEvidence`, `approveReport`, `rejectReport`; scoped listing (`mine`/`to-review`); detail + evidence (submitter/reviewer/`kpi_report:manage` visibility); Review Queue inside Reports; separate approve/reject preserved (rule 12); stored-reviewer UX; DTO corrections (`reviewerUserId`, nullable position context).
Deliverables: `report-v1.types.ts`, `report-v1-api.ts`, `use-report-data` rewrite, reports page guard/capability completion (guard already authenticated-only in P0).
Exit criteria: no `/my` or `/to-review` report paths; `kpi_report:read|submit|review` references gone from report flows; evidence never surfaced from Activity/Approval screens.

### P5 — Administrative tools

Scope: admin client (**4 functions, T9/T10/T11/T18**) — `adminReassignApprover`, `adminCreateActivity`, `adminUpdateActivity`, `adminReassignReportReviewer`; visibility strictly on `kpi_activity:manage` / `kpi_report:manage`; audit-friendly confirmation and error states; **`adminUpdateActivity` (T11) remains blocked on the `expectedVersion` contract decision (§15.2)** — do not present the admin update UI as implementable until resolved.
Deliverables: `kpi-admin-v1-api.ts`, admin dialogs/forms, admin entry points (action-level guards), conflict-recovery UX.
Exit criteria: all four admin calls exercised except T11 which is gated on §15.2; `ACTIVITY_VERSION_CONFLICT` path verified once unblocked.

### P6 — Legacy removal and release readiness

Scope: delete obsolete types, clients, hooks, dialogs, routes, guards, permission literals (§10); repository-wide forbidden-pattern audit; lint/type-check/build/test; manual UX smoke; BE–FE end-to-end verification; atomic release readiness checklist.
Forbidden-pattern audit (grep must return zero in `src/`): `/my`, `/managed`, `/owned`, `/pending` on kpi paths; `root-create`, `child-create`, `/update`, `/cancel` on kpi-request paths; separate `approve`/`reject` methods on kpi-request paths (unified decision only); the five obsolete permission literals; **Approvals tab inside the Activities page**; `kpi_task`; any import of the legacy `activity-api`/`report-api` clients (**zero-dual-client exit invariant**: each legacy client function is deleted in the phase that removes its last caller — P1/P2/P3/P4 — and P6 proves no legacy client import remains).
Deliverables: cleanup commit(s), audit report under `docs/testing/`, deployment checklist referencing B1–B3.
Exit criteria: zero obsolete references in `src/`; zero legacy-client imports; full Jest suite green; production build green; smoke checklist signed.

## 12. Detailed P0 Implementation Plan (file-and-task level)

### 12.0 Isolation, buildability, and dual-client strategy

P0 is **additive but deliberately small**: only the shared contract foundations, the Activity read client, and the navigation/page-shell change. Justification per file (no file is created "to mirror all 18 endpoints"):

| P0-created file | Why it exists in P0 | When the rest of its surface lands |
|---|---|---|
| `shared/scope.types.ts`, `shared/domain-errors.ts`, `shared/acting-position.ts` | P1 depends on scopes, acting Position, and error classification; locked early as contract foundations | — |
| `activity/activity-v1.types.ts` | P1 compiles against it; discriminated request types lock the contract now (§8 of the revision brief) | mutations used from P2 |
| `activity/activity-v1-api.ts` | **read surface only** (`getActivities`, `getActivityById`, `getRequests`, `getRequestById` — T1/T2/T6/T7) — exactly what P1 consumes | `getAssignableAssignees`/`submitCreateRequest`/`submitChangeRequest` (P2); `decideRequest` (P3) |
| report/report-v1 types+client | **deferred to P4** — report pages are untouched until then; no P1 compile dependency | P4 |
| admin client | **deferred to P5** — additionally blocked on §15.2 | P5 |

**Zero-dual-client exit invariant:** each legacy client function is deleted in the phase that removes its last caller — legacy activity reads deleted in P1, legacy activity mutations in P2, legacy `use-approval-data` pending/decision paths in P3, legacy `report-api` in P4 — and P6's forbidden-pattern audit proves zero imports of `activity-api`/`report-api` remain. The dual-client window is therefore bounded to at most one phase per surface, not the whole P0–P6 span.

**Visible-change contract (resolves the old contradiction):** P0 **does** change navigation and page shells — that is an intentional, visible deliverable, smoke-tested in §12.11 step 5. The claim "no visible application behavior change" is dropped; the claim is now "the only visible changes are the ones this section lists: sidebar entries, page guards, and removal of the Activities Approvals tab; all data behavior is unchanged until P1+".

**Rollback:** every P0 task touches distinct files; revert per file. No data migrations, no backend dependency, fully reversible. Do **not** add temporary backend endpoints; do **not** use obsolete permissions as active authorization fallbacks — the five obsolete literals remain defined only so legacy code compiles until its phase removes it, and no new code may reference them.

### 12.1 Permission constants

| Item | Detail |
|---|---|
| File to modify | `src/constants/permissions.ts` |
| Changes | Add `KPI_ACTIVITY_MANAGE: 'kpi_activity:manage'`, `KPI_ACTIVITY_READ_ALL: 'kpi_activity:read_all'`, `KPI_REPORT_MANAGE: 'kpi_report:manage'` under the KPI Activity / KPI Report groups. Add `@deprecated` JSDoc to `KPI_ACTIVITY_READ`, `KPI_ACTIVITY_REQUEST`, `KPI_REPORT_READ`, `KPI_REPORT_SUBMIT`, `KPI_REPORT_REVIEW` stating they are retired in V1 and removed in P6. |
| Responsibility | Single source of truth for permission codes; must match `erp-backend` `Permissions.java` (lines 45–51) |
| TS types affected | `PermissionCode` union grows automatically (derived from `typeof PERM`) |
| Permission helpers affected | none (hook is generic) |
| Route/page-shell impact | none in this task |
| Verification | `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"` |
| Acceptance criteria | Three new constants exist; five obsolete constants still compile with deprecation JSDoc; no new code references the deprecated ones |
| Rollback | revert file |

### 12.2 Explicit scope model

| Item | Detail |
|---|---|
| File to create | `src/modules/kpi/shared/scope.types.ts` |
| Contents | `export type KpiActivityScope = 'mine' \| 'subordinates' \| 'all';` `export type KpiRequestScope = 'mine' \| 'to-review';` `export type KpiReportScope = 'mine' \| 'to-review';` plus `export const ACTIVITY_SCOPES = [...] as const` and a guard `assertScope(value: string): value is KpiActivityScope` that throws a typed `MissingScopeError` when absent — the frontend must never call a scoped endpoint without an explicit scope (rule 13). |
| Responsibility | One place that defines and validates scopes; prevents accidental missing-scope 400s |
| TS types affected | new module types; no existing types |
| API functions affected | consumed by the P0.6 client |
| Verification | `npx tsc --noEmit` + `scope.types.test.ts` (valid values pass; missing/unknown values throw) |
| Acceptance criteria | Every V1 list client call site passes a typed scope literal; no default scope anywhere |

### 12.3 Acting-Position model and selector contract (blocker-aware)

| Item | Detail |
|---|---|
| File to create | `src/modules/kpi/shared/acting-position.ts` |
| Contents | `export interface ActingPosition { positionId: string; /* core_positions.id — THE identity */ positionName: string; userPositionId: string; userId: string; isPrimary: boolean; }` plus a pure helper `buildActingPositionPayload(pos: ActingPosition | null): string | undefined` returning the `positionId`, and the selector component contract `interface ActingPositionSelectorProps { positions: ActingPosition[]; value: string \| null; onChange: (positionId: string) => void; disabled?: boolean; }` (implementation deferred to P1; type + contract are P0). Document the `ActingPositionValidator` invariant: the value is a `core_positions.id` and the actor must hold an active assignment for it. |
| Responsibility | Model for the explicit-acting-Position rule (rules 1–3): never silently choose primary/first-active; required for `subordinates`, assignable-assignees, and every submission |
| TS types affected | new module types |
| **Blocker (elevated)** | Data source for the user's own active positions is **a P1/P2 precondition** — see §15.1. P0 ships the model + contract only; P1 resolves the source. |
| Verification | `npx tsc --noEmit` + `acting-position.test.ts` (identity is `positionId`, never `userPositionId`) |
| Acceptance criteria | Type-level guarantee that submission payloads receive `positionId`; no implicit-position code path exists |

### 12.4 Shared domain-error mapping

| Item | Detail |
|---|---|
| File to create | `src/modules/kpi/shared/domain-errors.ts` |
| Contents | `export type RecoverableErrorKind = 'already-processed' \| 'version-conflict' \| 'duplicate-pending' \| 'not-assigned-approver' \| 'not-reviewer' \| 'own-request' \| 'own-report' \| 'other';` `export function classifyActivityError(raw: string): RecoverableErrorKind` and `classifyReportError(raw: string)` matching the backend `MessageConstants` strings (§3.3): `REQUEST_ALREADY_PROCESSED`/`REPORT_ALREADY_PROCESSED` → `already-processed`; `ACTIVITY_VERSION_CONFLICT` → `version-conflict`; `DUPLICATE_PENDING_REQUEST`/`DUPLICATE_PENDING_REPORT` → `duplicate-pending`; `NOT_THE_ASSIGNED_APPROVER`/`NOT_THE_REVIEWER`; `CANNOT_APPROVE_OWN_REQUEST`/`CANNOT_REVIEW_OWN_REPORT`; plus `export interface RecoverableConflict { kind; message; refetch: boolean }` so hooks (both pages) render a banner + refetch (rule 14). |
| Responsibility | Single mapper so every mutation site — including `/kpi/approvals` decisions — treats already-processed/version-conflict as a recoverable state, never a generic toast |
| TS types affected | new module types |
| API functions affected | consumed by hooks in P1–P5; P0 tests the classification only |
| Verification | `npx tsc --noEmit` + `domain-errors.test.ts` asserting each backend string → expected kind |
| Acceptance criteria | Every `MessageConstants` string in §3.3 has a classification; unknown strings fall back to `other` |

### 12.5 V1 Activity types with discriminated request unions

| Item | Detail |
|---|---|
| File to create | `src/modules/kpi/activity/activity-v1.types.ts` |
| Contents | `KpiActivityResponse` (re-export from legacy `activity.types.ts` — fields verified identical), `KpiActivityChangeRequestResponse` (add optional `approverUserId?: string; approverUserName?: string`), and **precise discriminated request types** (never ordinary nullable properties for forbidden fields — TS `never` makes serializing a forbidden field a compile error): |
| Discriminated types | ```ts
interface CreateActivityBase {
  assignedToUserPositionId: string; // core_user_positions.id
  actingPositionId: string;         // core_positions.id (required)
  activityName: string;             // ≤255
  description?: string;
  unit: string;                     // ≤50
  targetValue: number;              // positive
}
export interface CreateRootActivityV1Request extends CreateActivityBase {
  parentId?: never;                 // root: forbidden on the wire
  corporateKpiId: string;           // root: required
  periodYear: number;               // root: required
  periodMonth: number;              // root: required
}
export interface CreateChildActivityV1Request extends CreateActivityBase {
  parentId: string;                 // child: required
  corporateKpiId?: never;           // child: forbidden (@Null on wire)
  periodYear?: never;
  periodMonth?: never;
}
export type CreateActivityRequest = CreateRootActivityV1Request | CreateChildActivityV1Request;

interface ChangeRequestBase { actingPositionId: string; }
export interface UpdateChangeRequest extends ChangeRequestBase {
  requestType: 'UPDATE';
  activityName: string;
  description: string | null;       // always sent: current, null (clear), or new text
  unit: string;
  targetValue: number;
  cancellationReason?: never;       // forbidden for UPDATE
}
export interface CancelChangeRequest extends ChangeRequestBase {
  requestType: 'CANCEL';
  cancellationReason: string;       // required, ≤1000
  activityName?: never;             // forbidden for CANCEL
  description?: never;
  unit?: never;
  targetValue?: never;
}
export type ChangeRequestRequest = UpdateChangeRequest | CancelChangeRequest;

export interface ApproveDecision { decision: 'APPROVE'; rejectionReason?: never; }
export interface RejectDecision { decision: 'REJECT'; rejectionReason: string; } // ≤1000, required
export type RequestDecisionRequest = ApproveDecision | RejectDecision;

export interface AdminCreateActivityRequest { /* T10 — same root/child rule as CreateActivityRequest */ reason: string; /* ≤1000, required */ }
export interface AdminUpdateActivityRequest { action: 'UPDATE' | 'REASSIGN' | 'CANCEL'; reason: string; expectedVersion: number; /* action-specific fields */ }
export interface AdminReassignApproverRequest { newApproverUserId: string; newApproverUserPositionId?: string; reason: string; }
export interface AdminReassignReviewerRequest { newReviewerUserId: string; newReviewerUserPositionId?: string; reason: string; }
``` |
| Responsibility | Exact DTO mirror of the final backend; the only types new code may import; discriminated unions make the §3.3 `@Null` omission discipline a compile-time guarantee (root vs child; UPDATE vs CANCEL; APPROVE vs REJECT) |
| TS types affected | new; legacy payload types (`CreateRootActivityPayload` etc.) remain only for legacy callers |
| API functions affected | none yet (types first) |
| Verification | `npx tsc --noEmit` |
| Acceptance criteria | Every field and nullability rule from §3.3 represented; forbidden fields are `never`-typed; `RequestDecisionRequest`/`ChangeRequestRequest`/`CreateActivityRequest` are exact discriminated unions |

### 12.6 V1 Activity client — read surface only

| Item | Detail |
|---|---|
| File to create | `src/modules/kpi/activity/activity-v1-api.ts` |
| Contents | `getActivities(scope: KpiActivityScope, actingPositionId?: string)` → `GET /kpi-activities?scope=` (+`&actingPositionId=` only for `subordinates`); `getActivityById(id, actingPositionId?)` → `GET /kpi-activities/{id}`; `getRequests(scope: KpiRequestScope)` → `GET /kpi-activity-requests?scope=`; `getRequestById(id)` → `GET /kpi-activity-requests/{id}`. All responses unwrapped via `ApiResponse<T>.data` (legacy pattern). Scope param is always sent; helper from P0.2 enforces it. **Mutations are NOT in this file yet** — they land in P2 (`getAssignableAssignees`, `submitCreateRequest`, `submitChangeRequest`) and P3 (`decideRequest`). |
| Responsibility | The shared read client used by `/kpi/activities` (P1) and later reused by `/kpi/approvals` (P3) — one client, two pages |
| TS types affected | `activity-v1.types.ts` |
| Permission helpers affected | none inside the client |
| Route/page-shell impact | none (additive) |
| Verification | `npx tsc --noEmit` + `activity-v1-api.test.ts` (read-path/query mapping per §5.1: `scope` always present, `actingPositionId` only for `subordinates`, detail query param optional) |
| Acceptance criteria | 4 read functions map exactly to T1/T2/T6/T7; **no** `approve`/`reject`/`decision` request paths exist anywhere in this file yet (rule 11: no separate approve/reject ever; unified decision arrives in P3) |
| Rollback | delete file; nothing consumes it yet |

### 12.7 Canonical sidebar and navigation lockstep

| Item | Detail |
|---|---|
| Files to modify | `src/config/navigation.ts`, `src/modules/kpi/constants.ts`; **delete** `src/modules/kpi/sidebar.ts`; **rewrite** `src/modules/kpi/__tests__/sidebar.test.ts` |
| Navigation changes (canonical `navigationConfig` KPI entries) | **Dashboard** `/kpi` — remove `permissions` (any authenticated user). **Corporate KPI** `/kpi/corporate` — unchanged (`corporate_kpi:read`). **Activities** `/kpi/activities` — remove `permissions` (any authenticated user; the four activity codes gate only their elevated actions/scopes). **Activity Approvals** `/kpi/approvals` — **new separate entry**, `permissions: [PERM.KPI_ACTIVITY_APPROVE]`, Phosphor `Checks` icon, KPI group. **Reports** `/kpi/reports` — remove the `capability` closure (any authenticated user; `kpi_report:manage` gates only admin tools). `KPI_ROUTES` already contains both `/kpi/activities` and `/kpi/approvals` — keep `KPI_ROUTES.approvals`. |
| Stale duplicate decision (deterministic) | `src/modules/kpi/sidebar.ts` is **deleted**. Evidence: zero production callers — only `src/modules/kpi/__tests__/sidebar.test.ts:4` imports `kpiSidebar`; the sidebar renderer `src/components/layout/sidebar.tsx` imports `navigationConfig` from `@/config/navigation`. Its obsolete test is rewritten (in place) to assert `navigationConfig`: separate Activities and Activity Approvals entries, Activities/Reports ungated, Activity Approvals gated on `kpi_activity:approve`, no duplicate KPI entries. |
| `KPI_ANY_PERMISSION` | **Deleted in this task** — after ungating the Dashboard item, deleting the stale sidebar, and rewriting the test, the constant has zero callers (`constants.ts`, `navigation.ts`, `kpi/sidebar.ts`, `/kpi/page.tsx` were its only consumers). Gate levels are documented separately (§6.0); no collapsed rule remains. |
| Responsibility | One canonical sidebar source (`navigationConfig`); sidebar gate must equal the page guard exactly (established convention) |
| Route/page-shell impact | `/kpi` sidebar visibility, Activities/Reports/Approvals entries |
| Verification | `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPatterns=sidebar --no-coverage"` then `npx tsc --noEmit` |
| Acceptance criteria | Sidebar shows Dashboard, Corporate KPI, Activities, Activity Approvals, Reports; Activity Approvals requires `kpi_activity:approve`; Activities/Reports require no permission; `src/modules/kpi/sidebar.ts` deleted; `sidebar.test.ts` passes against `navigationConfig`; `KPI_ANY_PERMISSION` gone |
| Rollback | restore the four files |

### 12.8 Page guards (authenticated-only where responsibility-based)

| Item | Detail |
|---|---|
| Files to modify | `src/app/(main)/kpi/page.tsx`, `src/app/(main)/kpi/activities/page.tsx`, `src/app/(main)/kpi/reports/page.tsx`; `/kpi/approvals` **unchanged** (keeps `kpi_activity:approve` guard — verified current code already enforces it) |
| Changes | `/kpi`: drop the `hasAnyPerm(...KPI_ANY_PERMISSION)` guard — render the page for any authenticated user (the `(main)` layout AuthGuard already enforces authentication). `/kpi/activities`: replace `canAccess = hasAnyPerm(READ, REQUEST, ROOT_REQUEST, APPROVE)` with authenticated-only (no permission gate). `/kpi/reports`: replace the `canAccess` capability triple with authenticated-only. Each page keeps its legacy data behavior in P0; users with no legacy codes see the page shell with empty views until P1 rebuilds the views on scopes. |
| Responsibility | An authenticated employee with assigned activities or Reports must never be blocked by the old permission catalog |
| Verification | `npx tsc --noEmit`; manual smoke (§12.11 step 5) with a plain employee account |
| Acceptance criteria | No page guard in `src/app/(main)/kpi/*` references obsolete codes except `/kpi/approvals` (approve, which is a V1 code); sidebar and page guards are lockstep |
| Rollback | revert the three files |

### 12.9 Remove the Approvals tab from `/kpi/activities` (visible deliverable)

| Item | Detail |
|---|---|
| File to modify | `src/app/(main)/kpi/activities/page.tsx` |
| Changes | Remove from the page: `'approvals'` from the `TabId` union; the `canApprove` capability and the approvals tab push in `tabs`; the `fetchPending` effect; `filteredPendingRequests`; the `'approvals'` case in `totalItems`; the `approvalDialog` state, `openApprove`/`openReject`/`closeApprovalDialog`; the `ApprovalTable`/`ApprovalDialog` render and their imports; the `useApprovalData` import and usage. The approval queue then renders **only** on `/kpi/approvals` (rule: never both surfaces). |
| Responsibility | Remove the duplicate queue surface; approval fetching, empty states, dialogs, mutation handling, and refetching all belong to `/kpi/approvals` (which keeps `useApprovalData`/`ApprovalTable`/`ApprovalDialog` — unchanged in P0, adapted in P3) |
| Route/page-shell impact | `/kpi/activities` loses its 5th tab; `/kpi/approvals` remains the sole approval surface |
| Verification | `npx tsc --noEmit`; `npm test -- --testPathPatterns=activity-page --no-coverage` (test updated to assert no Approvals tab); manual smoke |
| Acceptance criteria | No `approvals` tab id, no `useApprovalData`/`ApprovalTable`/`ApprovalDialog` references remain in the activities page; `/kpi/approvals` still renders the queue |
| Rollback | restore the page file |

### 12.10 New-surface tests (P0 scope)

| Item | Detail |
|---|---|
| Files to create/rewrite | `src/modules/kpi/shared/__tests__/scope.types.test.ts`, `…/domain-errors.test.ts`, `…/acting-position.test.ts`, `src/modules/kpi/activity/__tests__/activity-v1-api.test.ts` (reads), rewritten `src/modules/kpi/__tests__/sidebar.test.ts` |
| Responsibility | Risk-based contract tests (§13): scope enforcement, acting-Position identity, error classification, read path/query mapping, canonical navigation shape |
| Planned assertions | scope tests ~4; acting-position ~3; domain-errors ~8; activity-v1-api reads ~8; sidebar ~8 — **~8–10 meaningful tests total** (test-file claims in §13.1 match these numbers; report/admin client tests are deferred to P4/P5 with their clients) |
| Verification | `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPatterns=kpi --no-coverage"` |
| Acceptance criteria | All new tests green; no tests for CSS/icons/wording/DOM structure |

### 12.11 P0 verification and exit gates

1. `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"` — clean
2. `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run lint"` — no new findings in changed files (report pre-existing findings separately)
3. `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPatterns=kpi --no-coverage"` — all KPI suites green (legacy suites still pass: P0 touches only the listed files)
4. `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"` — production build green
5. **Manual smoke (required — P0 changes navigation visibly):** log in as admin → sidebar shows Dashboard, Corporate KPI, Activities, Activity Approvals, Reports; `/kpi/approvals` opens the queue; `/kpi/activities` has **no** Approvals tab. Log in as a plain employee with assigned activities (no activity codes) → Activities and Reports visible and openable; Activity Approvals hidden; `/kpi` Dashboard opens. Log in as an approver without `manage` → Activity Approvals visible; no admin tools. No console errors.

**P0 definition of done:** the locked acceptance list in §16; gates above green; one cohesive commit; §15 blockers recorded with evidence; the only visible changes are the ones §12.7–12.9 list.

## 13. Test and Manual-Smoke Strategy

### 13.1 Automated tests (risk-based, smaller than the backend suite)

Target **8–15 meaningful tests per implementation phase**. Only these behaviors get automated tests:

| Behavior | Where | Phase | Planned assertions |
|---|---|---|---|
| API method/path/query/body mapping (incl. `scope` always sent) | `activity-v1-api.test.ts` (reads), `report-v1-api.test.ts`, `kpi-admin-v1-api.test.ts` | P0 (reads), P4 (reports), P5 (admin) | P0 ~8; P4 ~8; P5 ~8 |
| Unified decision body: APPROVE without reason / REJECT with required reason (discriminated) | `activity-v1-api.test.ts` (P3 additions) + `domain-errors.test.ts` classification | P0 (classification) / P3 (body) | P3 ~6 |
| Required `scope` enforcement | `scope.types.test.ts` | P0 | ~4 |
| Acting-Position identity (`positionId` is `core_positions.id`, never `userPositionId`) | `acting-position.test.ts` | P0 | ~3 |
| Conditional Activity rejection reason | decision-body tests + approval dialog test | P3 | ~4 |
| Critical maker–checker visibility (requester never decides own request; stored approver identity) | `/kpi/approvals` page/table test | P3 | ~4 |
| Report evidence authorization visibility (evidence only inside Report experience; activity perms never expose it) | reports page + detail test | P4 | ~4 |
| Already-processed/version-conflict recovery (banner + refetch, not toast) | `domain-errors.test.ts` + one hook-level test per mutation family | P0 (classification) / P3/P4/P5 (recovery) | P3 ~3; P4 ~3; P5 ~3 |
| Canonical navigation shape: separate Activities and Activity Approvals entries; ungated Activities/Reports; approvals gated on `kpi_activity:approve`; no Approvals tab in activities page | rewritten `sidebar.test.ts` + `activity-page.test.tsx` | P0 | ~8 (sidebar) + ~4 (no-tab) |

Do **not** create tests for CSS classes, icons, wording, DOM structure, or trivial rendering. Visual layout and interaction polish go to manual smoke.

### 13.2 Repository-standard gates (every phase)

Commands run via Windows `cmd.exe /c` (WSL Node is too slow — established convention):

```bash
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint <changed-scope>"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPatterns=<phase> --no-coverage"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

Manual smoke checklist per phase: login (admin + one approver role + one plain employee), navigate each touched route, verify sidebar entries per role, verify tabs/empty states/error states, verify no console errors. Full-project ESLint findings are reported separately at final verification; pre-existing unrelated findings do not block a phase.

### 13.3 Manual smoke and BE–FE verification

- P0: navigation smoke per §12.11 step 5 (visible-change verification is mandatory).
- P1–P5: browser smoke per phase checklist (login, navigation, guard consistency, form validation paths).
- P6: full manual UX smoke + **BE–FE end-to-end verification** against the backend at `d06ff13` (scoped lists, root/child create, change request, unified decision, report submit/review, admin reassign) using real seeded accounts (`admin@erp.com`, `dirut@erp.com`, `manager_hr@erp.com`, `staff_hr@erp.com` — credentials via env var only). Verification reports go under `docs/testing/` **only during P6**; none are produced in this planning session.

## 14. Risks and Mitigations

| # | Risk | Evidence | Mitigation |
|---|---|---|---|
| 1 | **Legacy UI is already broken against the deployed V1 backend** — every legacy list/mutation call 404s or 400s once the backend is released | every path in `activity-api.ts`/`report-api.ts` targets deleted routes (§5.1) | B3 (atomic release) is mandatory; P1–P4 land with or before the backend release; until then the frontend runs against the old backend or in dev |
| 2 | Dual-client drift (legacy + v1) during P0–P5 | §12.0 additive strategy | Surface is deliberately small (foundations + activity reads in P0); hard rule: new code imports only `*-v1-*` clients; **zero-dual-client exit invariant** — each legacy function is deleted in the phase that removes its last caller (P1/P2/P3/P4), and P6's audit proves zero legacy imports |
| 3 | Acting-Position UX is new; multi-position users may mis-select | `ActingPositionValidator` requires explicit valid assignment; frontend has no position data today (§15.1) | Explicit selector with position names, never defaulting; empty state when no active assignment; **P1/P2 are preconditioned on the §15.1 source decision** |
| 4 | Navigation regressions from the P0 sidebar/guard change (visible deliverable) | §12.7–12.9 | Lockstep task (sidebar = page guard); rewritten `sidebar.test.ts` asserts the exact entry/gate matrix; §12.11 step 5 smoke with three roles |
| 5 | T11 `expectedVersion` cannot be obtained by any UI | `KpiActivityResponse`/`KpiActivityChangeRequestResponse` expose no `version`; `AdminUpdateActivityRequest.expectedVersion` is `@NotNull` (§15.2) | P5 `adminUpdateActivity` (T11) **blocked**; not presented as implementable until the minimal contract decision; no fabricated version source |
| 6 | Already-processed/version-conflict handled as generic toasts today | `use-approval-data.ts` `toast.danger` on all failures | P0 domain-error classification + recoverable banner/refetch pattern (§8 #24); enforced per mutation family on both pages |
| 7 | Test churn: 7 KPI test files assert obsolete contracts | `activity-api.test.ts:370-393` asserts `PATCH /approve` and `/reject` | Rewrites scheduled with their phases; P0 tests are new files; legacy tests untouched until their phase |
| 8 | Sidebar/page-guard drift reintroduced during P0 | historical pattern documented in `kpi-frontend` skill | Lockstep task P0.7/P0.8 in one commit; rewritten sidebar test asserts the gate matrix |

## 15. Unresolved Questions — Two Elevated Backend-Contract Blockers

Both blockers are **preconditions recorded in this plan**, not late-phase questions. Neither is implementable in the frontend without a backend contract decision; neither is fabricated around.

### 15.1 BLOCKER — Acting-Position source for the authenticated user (blocks P1 and P2)

**Problem:** hierarchy flows require `actingPositionId` (`core_positions.id`) on `subordinates` reads, assignable-assignees, and every create/change submission. The frontend has no responsibility-based source for the authenticated user's active positions.

**Verified evidence (re-checked this revision):**
- `AuthResponse` (backend `com/erp/auth/dto/response/AuthResponse.java`) exposes only `accessToken, refreshToken, username, email, roles, permissions` — no user `id`, no positions; frontend `src/types/auth.ts` mirrors this (no `id`, no positions).
- `GET /users/{id}/positions` (backend `UserController.java:135-141`) is `@PreAuthorize("hasAuthority('user:read')")` — **not usable by ordinary employees**, and requires a user id the client does not hold.
- `GET /users` list and `GET /positions` tree also require `user:read` / `position:read` — not usable as a general source.
- The 18-endpoint V1 contract contains **no self-accessible "my active positions" endpoint**.
- The June 2026 multi-position audit (`FRONTEND_MULTIPOSITION_AUDIT.md`) documents that the frontend never had a positions model.

**Forbidden approaches (locked):** do not use an endpoint requiring `user:read`; do not derive identity by searching users by email; do not use seeded or hard-coded position data; do not guess the primary or first active position.

**Minimal backend contract needed (recorded, not implemented):** a self-accessible endpoint returning the current user's active positions with `positionId` (`core_positions.id`), `positionName`, `userPositionId` (`core_user_positions.id`), `userId`, `isPrimary` — e.g. `GET /api/v1/users/me/positions` (no `user:read`), or the same payload appended to the login/refresh response. **P1 and P2 are preconditioned on this decision; until it exists, `/kpi/activities` ships `mine` scope and My Requests only.**

### 15.2 BLOCKER — Optimistic-lock `version` exposure (blocks P5 T11 admin update)

**Problem:** T11 `PATCH /api/v1/admin/kpi-activities/{id}` requires `expectedVersion` (`@NotNull`), but no response DTO exposes a version.

**Verified evidence:** `AdminUpdateActivityRequest.java` (`@NotNull Long expectedVersion`); `KpiActivityResponse.java` has no `version` field; `KpiActivityChangeRequestResponse.java` comment states "version field is omitted — @Version is internal and never exposed in responses"; `mapToActivityResponse` never sets a version; only the entity `@Version` and the audit snapshot carry it.

**Locked behavior:** P5 keeps `adminUpdateActivity` (T11) **blocked**; do not fabricate a version; do not read version from timestamps or local counters; do not present the admin-update UI as implementable until resolved.

**Minimal backend contract decision required:** expose `version` on `KpiActivityResponse` (or a dedicated admin detail DTO) so the UI can read it from the current activity detail before submitting T11. T9/T10/T18 are unaffected (they require no version).

## 16. P0 Definition of Done (locked acceptance criteria)

P0 must explicitly prove:

1. Canonical route constants contain both `/kpi/activities` and `/kpi/approvals` (`KPI_ROUTES` — `approvals` already present, kept).
2. Canonical sidebar (`src/config/navigation.ts`) contains **separate Activities and Activity Approvals entries**; the stale `src/modules/kpi/sidebar.ts` duplicate is deleted; `sidebar.test.ts` passes against `navigationConfig`.
3. Activity Approvals is guarded by `kpi_activity:approve` (sidebar entry + `/kpi/approvals` page guard).
4. Activities is not hidden from ordinary authenticated assignees (ungated sidebar entry + authenticated-only page guard).
5. Reports is not hidden from ordinary authenticated submitters/reviewers (ungated sidebar entry, `capability` removed; authenticated-only page guard).
6. `/kpi/activities` has **no Approval/To Review tab** in the target architecture (removed in P0; asserted by the updated `activity-page.test.tsx`).
7. `/kpi/approvals` is **not** marked for deletion, redirect, or tab conversion — it is the real standalone approval page, kept and adapted in P3.
8. Shared API/client code is reused by the two pages (`activity-v1-api.ts` read client + shared request-detail modal + shared domain-error/invalidation utilities; no duplicated clients).
9. No separate Activity approve/reject client methods are introduced (unified `PATCH /{id}/decision` only; mutations arrive in P2/P3).
10. All scoped calls always provide `scope` (`scope.types.ts` guard; tested).
11. No implicit acting-Position selection exists (model + selector contract; tested; source blocker §15.1 recorded as P1/P2 precondition).
12. The two backend-contract blockers are clearly represented (§15.1, §15.2).
13. Gates from §12.11 green: `tsc --noEmit`, `eslint` (changed scope), `npm test -- --testPathPatterns=kpi --no-coverage`, `npm run build`, and the three-role navigation smoke.
14. One cohesive commit; no backend, migration, deployment, or dependency changes; the only visible changes are §12.7–12.9.

## 17. Later Deployment Prerequisites (outside frontend implementation)

- **B1 — Resolve or safely assign real legacy PENDING requests/reports.** Pre-V1 `kpi_activity_change_requests`/`kpi_activity_reports` rows that are still PENDING have no valid V1 approver/reviewer identity (`approver_user_id` was introduced by V1) and no acting-position context. They must be reviewed/reassigned (T9/T18) or closed before release, or they will block on `NOT_THE_ASSIGNED_APPROVER`/`NOT_THE_REVIEWER` forever.
- **B2 — Provision real `ACTIVITY_APPROVER` and `ROOT_REPORT_REVIEWER` identities.** `KpiAdminAssignmentType` rows (table `kpi_admin_assignments`, V22) must exist with a valid user for both types; otherwise `resolveApprover`/`resolveReviewer` fail with `ADMIN_APPROVER_NOT_CONFIGURED`/`ADMIN_REVIEWER_NOT_CONFIGURED` on every root flow that exhausts the hierarchy.
- **B3 — Release compatible backend and frontend atomically.** The current frontend (HEAD `6631cad`) calls only deleted endpoints; the V1 frontend calls only V1 endpoints. Any mixed deployment breaks one side. Backend `refactor/kpi-activity-reporting-v1` (`d06ff13`) and the completed cutover must ship together.

---

*End of plan (Revision 2). Prepared from repository evidence only; no application source, backend, commit, push, or deployment was performed in this planning session.*
