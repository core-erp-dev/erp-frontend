# KPI Frontend P4 — Overview Page Implementation Plan

> **Status:** READY FOR REVIEW
> **Phase:** P4 (KPI Overview)
> **Predecessors:** P1 (Corporate KPI), P2 (Activity + Approval), P3 (Reports) — all complete

---

## 1. Objective and Exclusions

### Objective

Implement the KPI Overview page at `/hr/kpi` — a role-aware dashboard summarizing existing KPI data from Corporate KPI, Activities, Activity Requests, and Reports. The page provides at-a-glance metrics with links to full detail pages.

**This is NOT the application's main dashboard `/`.** It is the KPI module's landing page.

### Exclusions

- No backend changes
- No new API endpoints
- No new dependencies (React Query, chart libraries, drag-and-drop)
- No advanced analytics, charts, or configurable widgets
- No custom date-range systems, financial calculations, or remuneration
- No real-time updates, global KPI state, or cross-module integration
- No duplicating full tables already available on other KPI pages

---

## 2. Current Route and Placeholder State

**File:** `src/app/(main)/hr/kpi/page.tsx`

**Current state:** Placeholder with a `Surface` card showing a `ChartBar` icon and text:
> "Overview will be available after Corporate KPI, Activities, and Reports data is integrated."

**Sidebar:** Overview item already visible via `KPI_ANY_PERMISSION` (any one of 12 KPI permissions).

**Constants:** `KPI_ROUTES.overview = '/hr/kpi'`, `KPI_LABELS.overview = 'Overview'`, `KPI_DESCRIPTIONS.overview = 'Organization KPI performance summary.'`

---

## 3. Existing Endpoints Reused

All data comes from existing backend endpoints. No new endpoints needed.

| # | Method | Path | Permission | Returns | Used For |
|---|---|---|---|---|---|
| 1 | GET | `/api/v1/kpi-activities/my` | `kpi_activity:read` | `KpiActivityResponse[]` (ACTIVE only) | My Activities summary |
| 2 | GET | `/api/v1/kpi-activities/managed` | `kpi_activity:read` | `KpiActivityResponse[]` (ACTIVE only) | Managed Activities summary |
| 3 | GET | `/api/v1/kpi-activities/owned` | `kpi_activity:request` or `kpi_activity:root_request` | `KpiActivityResponse[]` (all statuses) | Owned Activities summary |
| 4 | GET | `/api/v1/kpi-activity-requests/pending` | `kpi_activity:approve` | `KpiActivityChangeRequestResponse[]` (PENDING only) | Pending Activity Approvals count |
| 5 | GET | `/api/v1/kpi-reports/my` | `kpi_report:read` | `KpiReportResponse[]` (DESC by createdAt) | My Recent Reports |
| 6 | GET | `/api/v1/kpi-reports/to-review` | `kpi_report:review` | `KpiReportResponse[]` (ASC by createdAt) | Pending Report Reviews count |
| 7 | GET | `/api/v1/corporate-kpis/tree?year={currentYear}` | `corporate_kpi:read` | `CorporateKpiNode[]` (tree) | Corporate KPI Indicator count |

### Key Response Fields Available

**KpiActivityResponse** (endpoints 1–3):
- `activityName`, `status` ("ACTIVE" | "CANCELLED")
- `realizedValue` (BigDecimal — SUM of approved reports, 0 when none)
- `progressPercent` (BigDecimal — derived, capped at 100)
- `targetValue`, `unit`, `periodYear`, `periodMonth`
- `assignedToUserName`, `assignedToPositionName`
- `corporateKpiName`, `corporateKpiCode`

**KpiActivityChangeRequestResponse** (endpoint 4):
- `id`, `requestType` (CREATE | UPDATE | CANCEL), `status` (PENDING | APPROVED | REJECTED)
- `activityName`, `requestedByUserName`

**KpiReportResponse** (endpoints 5–6):
- `id`, `activityName`, `status` (PENDING | APPROVED | REJECTED)
- `submittedByUserName`, `reviewerUserName`, `realizedValue`, `reportDate`

**CorporateKpiNode** (endpoint 7):
- `code`, `name`, `nodeType` (ASPECT | INDICATOR), `status` (DRAFT | ACTIVE | INACTIVE)
- `targetValue`, `year`, `children: CorporateKpiNode[]`
- ⚠️ **NO `realizedValue` or `progressPercent`** — Corporate KPI has no realization aggregation

### Existing API Clients Reused

All data fetching uses existing API client methods — no new API clients needed:

| Existing Client | Methods Used |
|---|---|
| `activityApi` (from `src/modules/hr/kpi/activity/activity-api.ts`) | `getMyActivities()`, `getManagedActivities()`, `getOwnedActivities()`, `getPendingRequests()` |
| `reportApi` (from `src/modules/hr/kpi/report/report-api.ts`) | `getMyReports()`, `getReportsToReview()` |
| `corporateKpiApi` (from `src/modules/hr/kpi/corporate/corporate-kpi-api.ts`) | `getTreeByYear(year)` |

All return types (`KpiActivityResponse`, `KpiActivityChangeRequestResponse`, `KpiReportResponse`, `CorporateKpiNode`) are already defined and imported from their respective `.types.ts` files.

---

## 4. Permission Matrix

### Sidebar Visibility

Overview is visible when user has **any** KPI permission — already implemented via `KPI_ANY_PERMISSION`.

### Page Guard

The page renders for any user who passes the sidebar gate. Within the page, groups are conditionally shown based on permissions.

### Group Visibility by Permission

| Group | Required Permission(s) | Endpoint(s) Used |
|---|---|---|
| **Activities** | `kpi_activity:read` OR `kpi_activity:request` OR `kpi_activity:root_request` | `GET /my`, `GET /managed`, `GET /owned` |
| **Pending Actions** | `kpi_activity:approve` OR `kpi_report:review` | `GET /pending`, `GET /to-review` |
| **Recent Reports** | `kpi_report:read` | `GET /my` |
| **Corporate KPI** | `corporate_kpi:read` | `GET /tree?year={currentYear}` |

The Activities group loads sub-endpoints based on specific permission: `kpi_activity:read` enables `/my` and `/managed`; `kpi_activity:request`/`kpi_activity:root_request` enables `/owned`. Each sub-endpoint result is displayed as a compact summary block within the group.

### Permission Bundle Examples

| Role | Permissions | Visible Groups |
|---|---|---|
| ADMIN (admin@erp.com) | All 13 KPI perms | All 4 groups |
| Direktur Utama (dirut@erp.com) | `kpi_activity:read`, `kpi_activity:request`, `kpi_activity:approve`, `kpi_report:read`, `kpi_report:review`, `kpi_report:submit`, `corporate_kpi:read` | All 4 groups |
| Manager HR (manager_hr@erp.com) | `kpi_activity:read`, `kpi_report:read`, `kpi_report:submit`, `kpi_report:review` | Activities, Recent Reports, Pending Actions (review only) |
| Staff HR (staff_hr@erp.com) | `kpi_activity:read`, `kpi_report:read`, `kpi_report:submit` | Activities, Recent Reports |

---

## 5. Final Overview Groups

### 5.1 Activities

**Permission:** Any of `kpi_activity:read`, `kpi_activity:request`, `kpi_activity:root_request`
**Endpoints:** `GET /my` (if `kpi_activity:read`), `GET /managed` (if `kpi_activity:read`), `GET /owned` (if `kpi_activity:request` or `kpi_activity:root_request`)

A compact card area showing three permission-aware summary blocks as a list of metrics:

| Sub-section | Permission | Metrics | Link |
|---|---|---|---|
| **My Activities** | `kpi_activity:read` | total count, average progress %, target reached count | `Open Activities` |
| **Managed Activities** | `kpi_activity:read` | total count, average progress %, target reached count | `Open Activities` |
| **Owned Activities** | `kpi_activity:request` or `kpi_activity:root_request` | total count, active count, cancelled count, target reached count | `Open Activities` |

Each block shows 3–4 metric chips (e.g. "8 Active · Avg 62% · 3 Target Reached"). An empty block shows "—".

**Target Reached** = `progressPercent >= 100` — a neutral description of observed progress, not a lifecycle judgment.

**"Open Activities"** links to `/hr/kpi/activities`. No query parameter to pre-select a tab — existing pages do not support tab query params.

### 5.2 Pending Actions

**Permission:** `kpi_activity:approve` OR `kpi_report:review`
**Endpoints:** `GET /pending` (if `kpi_activity:approve`), `GET /to-review` (if `kpi_report:review`)

| Sub-section | Permission | Metrics | Link |
|---|---|---|---|
| **Pending Activity Requests** | `kpi_activity:approve` | pending count | `Open Approvals` |
| **Pending Report Reviews** | `kpi_report:review` | pending count | `Open Reports` |

Each shows a count badge next to the label. When count is 0, the text reads "No pending items."

### 5.3 Recent Reports

**Permission:** `kpi_report:read`
**Endpoint:** `GET /my`

**Metrics:** total report count
**Display:** Small list of the 5 most recent reports (activity name, status badge, realized value, report date).
**Link:** `Open Reports`

### 5.4 Corporate KPI

**Permission:** `corporate_kpi:read`
**Endpoint:** `GET /tree?year={currentYear}`

**Metrics:** Active INDICATOR count (recursive through children), total nodes count
**Link:** `Open Corporate KPI`

⚠️ **No realization or progress data** — `CorporateKpiResponse` has no `realizedValue` field. Only node counts.

**Excluded metric:** Corporate KPI realization/progress. The `CorporateKpiResponse` DTO has no `realizedValue` or aggregation. This is not a gap — it reflects the current domain model where realization is tracked at the Activity level, not the Corporate KPI level.

---

## 6. Metrics and Calculation Rules

All metrics are computed **client-side** from response arrays. No server-side aggregation endpoints are required.

| Group | Metric | Source | Formula | Edge Cases |
|---|---|---|---|---|
| Activities (My) | Total Activities | `GET /my` | `data.length` | — |
| | Average Progress | `GET /my` | `sum(progressPercent) / data.length` | Empty → "—" |
| | Target Reached | `GET /my` | `filter(progressPercent >= 100).length` | — |
| Activities (Managed) | Total Managed | `GET /managed` | `data.length` | — |
| | Average Progress | `GET /managed` | `sum(progressPercent) / data.length` | Empty → "—" |
| | Target Reached | `GET /managed` | `filter(progressPercent >= 100).length` | — |
| Activities (Owned) | Total Owned | `GET /owned` | `data.length` | — |
| | Active | `GET /owned` | `filter(status === 'ACTIVE').length` | — |
| | Cancelled | `GET /owned` | `filter(status === 'CANCELLED').length` | — |
| | Target Reached (Active) | `GET /owned` | `filter(status === 'ACTIVE' && progressPercent >= 100).length` | — |
| Pending Actions | Pending Activity Requests | `GET /pending` | `data.length` | — |
| | Pending Report Reviews | `GET /to-review` | `data.length` | — |
| Recent Reports | Total Recent Reports | `GET /my` | `data.length` | — |
| Corporate KPI | Active Indicators | `GET /tree?year=N` | Recursive count: INDICATOR + ACTIVE | Empty tree → 0 |

### Metrics Unsupported (Excluded)

| Metric | Reason |
|---|---|
| Corporate KPI realization/progress | `CorporateKpiResponse` has no `realizedValue` field |
| Corporate KPI target vs actual | No realization aggregation at corporate level |
| Activity realization sum | Available but not meaningful as standalone metric — progress % is more useful |
| Report approval rate | Requires historical aggregation across statuses |
| Time-based trends | No date-range parameter on list endpoints |
| "Below 50%" / "Low Progress" | Removed — relies on an arbitrary threshold, not a domain business rule |

---

## 7. Loading, Empty, and Partial-Error Behavior

### 7.1 Strategy

One simple page-level loading state:

1. On mount, the hook builds an array of permitted endpoint configs based on current user permissions
2. All permitted fetches fire in parallel via `Promise.allSettled()`
3. While any fetch is in progress: a single page-level loading indicator (e.g., spinner or skeleton) replaces all groups
4. Once all settled: each group independently resolves — data renders, errors show inline

### 7.2 Loading State

- One page-level loading indicator while any endpoint is in-flight
- No per-section spinner
- No staggered loading (each section does not appear independently as its endpoint finishes)

### 7.3 Partial Failure Handling

- Failed sections show a small inline error message: a muted text line like "Could not load this section."
- Other sections render unaffected
- No retry button per section — the page loads from a fresh mount on navigation
- No toast for Overview-level failures

### 7.4 Empty State

- Each group shows a simple empty message when its data array has no items:
  - **Activities:** "No activities found."
  - **Pending Actions:** "No pending items."
  - **Recent Reports:** "No reports found."
  - **Corporate KPI:** "No active Corporate KPI indicators for {year}."

### 7.5 No Page-Level Empty

Section-level empty states are sufficient. No extra "All sections empty" fallback.

---

## 8. Exact Files to Create/Modify

### New Files

| File | Purpose |
|---|---|
| `src/modules/hr/kpi/overview/use-overview-data.ts` | Data hook: parallel fetch, permission-gated, allSettled error handling |
| `src/modules/hr/kpi/overview/overview-section.tsx` | Reusable section wrapper: title, loading/error/empty states, link footer |
| `src/modules/hr/kpi/__tests__/overview-page.test.tsx` | Thin tests (4–8) |

### Modified Files

| File | Change |
|---|---|
| `src/app/(main)/hr/kpi/page.tsx` | Replace placeholder with Overview page component that uses `useOverviewData()` + `overview-section.tsx` |

### No Changes To

- `src/modules/hr/kpi/constants.ts` — no new routes, labels, or permission groups
- `src/modules/hr/kpi/sidebar.ts` — Overview already present
- All `*-api.ts` files — reuse existing API clients
- All `*.types.ts` files — reuse existing DTO types
- Backend — no changes
- `package.json` — no new dependencies

### File Structure (Post-P4.1)

```
src/modules/hr/kpi/
├── constants.ts
├── sidebar.ts
├── overview/                         # ← NEW
│   ├── use-overview-data.ts
│   └── overview-section.tsx
├── corporate/
├── activity/
├── report/
└── __tests__/
    ├── sidebar.test.ts               # existing
    └── overview-page.test.tsx        # ← NEW
```

---

## 9. Thin Testing Plan

**Total: approximately 5 focused tests.** No tests for CSS, icons, spinner details, every card, or every permission combination.

### Test File: `src/modules/hr/kpi/__tests__/overview-page.test.tsx`

| # | Test | What It Verifies |
|---|---|---|
| 1 | **Permission-aware section visibility** | User with `kpi_activity:approve` sees Pending Actions; user without it does not |
| 2 | **Unauthorized endpoints are not called** | Mock all APIs; verify only permitted endpoints fire for a given permission set |
| 3 | **Representative metric calculation** | Provide mock `KpiActivityResponse[]` with known progress values; assert average progress displays correctly |
| 4 | **Partial endpoint failure** | Mock one endpoint to reject; verify its section shows inline error but other sections render |
| 5 | **Empty state** | Mock all endpoints to return `[]`; verify empty messages appear |

### Test Commands

```bash
# Changed-file test
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPatterns=overview --no-coverage"

# Full Jest (P4.2)
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --no-coverage"
```

---

## 10. P4.1 and P4.2 Steps

### P4.1 — KPI Overview Implementation

| Step | Action | Verification |
|---|---|---|
| 1 | Create `src/modules/hr/kpi/overview/use-overview-data.ts` — permission-gated parallel fetch hook with `Promise.allSettled` | TypeScript check: `npx tsc --noEmit` |
| 2 | Create `src/modules/hr/kpi/overview/overview-section.tsx` — reusable section wrapper component | Visual inspection of component API |
| 3 | Modify `src/app/(main)/hr/kpi/page.tsx` — replace placeholder with Overview page using hook + sections | Navigate to `/hr/kpi` in dev mode |
| 4 | Write `src/modules/hr/kpi/__tests__/overview-page.test.tsx` (4–8 tests) | `npm test -- --testPathPatterns=overview --no-coverage` |
| 5 | Changed-file lint | `npx eslint src/modules/hr/kpi/overview src/app/\(main\)/hr/kpi/page.tsx src/modules/hr/kpi/__tests__/overview-page.test.tsx` |
| 6 | TypeScript check | `npx tsc --noEmit` |
| 7 | Production build | `npm run build` |

### P4.2 — Final KPI Frontend Verification

| Step | Action | Verification |
|---|---|---|
| 1 | Full Jest run | `npm test -- --no-coverage` |
| 2 | P4 changed-scope ESLint | `npx eslint src/modules/hr/kpi/overview src/modules/hr/kpi/__tests__/overview-page.test.tsx src/app/\(main\)/hr/kpi/page.tsx` |
| 3 | Full-project ESLint (separate, reported independently) | `npx eslint .` — pre-existing unrelated findings do not block P4 |
| 4 | TypeScript check | `npx tsc --noEmit` |
| 5 | Production build | `npm run build` |
| 6 | Manual browser smoke test | Login → navigate to `/hr/kpi` → verify groups render per role → verify links navigate |
| 7 | Write verification document | `docs/testing/2026-07-27-kpi-frontend-p4-overview-verification.md` |

---

## 11. Risks and Backend Gaps

### No Backend Gaps (All Metrics Supported)

All planned sections are supported by existing endpoints. No backend changes are required.

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Corporate KPI tree endpoint returns large payloads for many years/kpis** | Low — current year only, tree depth ≤ 2, typical node count < 100 | Request only current year. Tree flattening is client-side and negligible. |
| **`allSettled` returns resolved promises for 403 errors** | Low — the backend returns 403 (not 200 with error body) for unauthorized access, and we permission-gate before calling | The permission gate prevents calling unauthorized endpoints. If a race condition occurs, 403 is caught in the catch block as a standard Axios error. |
| **Overview page performance with 7 parallel fetches** | Low — all endpoints are fast list queries with simple joins | Parallel fetches via `Promise.allSettled` minimize total load time. No waterfall. |
| **Year rollover — Corporate KPI uses `new Date().getFullYear()`** | Low — identical pattern used in P1 Corporate KPI page filter default | Acceptable; Overview is a snapshot, not historical analytics. |

### Not a Gap: Corporate KPI Realization

The `CorporateKpiResponse` DTO has no `realizedValue` or `progressPercent` field. This is by design — realization is tracked at the **Activity** level, not the Corporate KPI level. Attempting to aggregate Activity realization up to Corporate KPI would require a new backend endpoint and business logic. The plan excludes this metric rather than inventing one.

---

## 12. Definition of Done

### P4.1 Complete When

- [ ] `use-overview-data.ts` fires permitted fetches in parallel via `Promise.allSettled`
- [ ] Page shows one loading state while any fetch is in-flight
- [ ] All 4 groups render with correct metrics from response data
- [ ] Each group has a neutral link (`Open Activities`, `Open Reports`, `Open Approvals`, `Open Corporate KPI`)
- [ ] Failed groups show small inline error, other groups unaffected
- [ ] Empty groups show simple empty messages
- [ ] Approximately 5 tests pass with `--testPathPatterns=overview`
- [ ] Changed-file ESLint passes
- [ ] TypeScript check passes (`npx tsc --noEmit`)
- [ ] Production build succeeds (`npm run build`)

### P4.2 Complete When

- [ ] Full Jest passes
- [ ] P4 changed-scope ESLint passes
- [ ] Full-project ESLint reported separately (pre-existing findings noted, do not block P4)
- [ ] TypeScript check passes
- [ ] Production build succeeds
- [ ] Manual browser smoke test: Overview loads, 4 groups render per role, links navigate correctly
- [ ] Verification document written

---

## Summary

| Item | Value |
|---|---|
| **Plan path** | `docs/plans/2026-07-27-kpi-frontend-p4-overview.md` |
| **Proposed groups** | 4: Activities, Pending Actions, Recent Reports, Corporate KPI |
| **Endpoints reused** | 7 existing (3 activity, 1 request, 2 report, 1 corporate KPI) |
| **Metrics supported** | 13: total/active/cancelled counts, average progress, target reached, pending counts, report count, active indicators |
| **Metrics excluded** | 4: Corporate KPI realization, threshold-based warnings, report approval rate, time-based trends |
| **Backend gaps** | None — all planned metrics are supported by existing endpoints |
| **Phases** | 2: P4.1 (implementation + ~5 tests), P4.2 (full verification + manual smoke test) |
| **Status** | READY FOR REVIEW |
