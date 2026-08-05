# KPI Frontend P4 — Overview Verification

> **Status:** IMPLEMENTATION COMPLETE
> **Phase:** P4 (KPI Overview)
> **Date:** 2026-07-27
> **Commit P4.1:** `37d7c5e` — `feat(kpi): implement P4 KPI overview`
> **Commit P4.2:** *(after verification document)*

---

## 1. Final Overview Groups

| Group | Description |
|---|---|
| **Activities** | Compact card with My/Managed/Owned activity metric blocks (permission-aware) |
| **Pending Actions** | Pending Activity Requests + Pending Report Reviews (count badges) |
| **Recent Reports** | 5 most recent reports with status and realized value |
| **Corporate KPI** | Active INDICATOR count (current year) |

---

## 2. Endpoints Reused

| Group | Endpoint | Permission |
|---|---|---|
| Activities (My) | `GET /api/v1/kpi-activities/my` | `kpi_activity:read` |
| Activities (Managed) | `GET /api/v1/kpi-activities/managed` | `kpi_activity:read` |
| Activities (Owned) | `GET /api/v1/kpi-activities/owned` | `kpi_activity:request` or `kpi_activity:root_request` |
| Pending Actions (Requests) | `GET /api/v1/kpi-activity-requests/pending` | `kpi_activity:approve` |
| Pending Actions (Reviews) | `GET /api/v1/kpi-reports/to-review` | `kpi_report:review` |
| Recent Reports | `GET /api/v1/kpi-reports/my` | `kpi_report:read` |
| Corporate KPI | `GET /api/v1/corporate-kpis/tree?year=N` | `corporate_kpi:read` |

All reused from existing API clients (`activityApi`, `reportApi`, `corporateKpiApi`). No new endpoints.

---

## 3. Permission Behavior

### Page Guard

- `/hr/kpi` page uses `hasAnyPerm(...KPI_ANY_PERMISSION)` (13 permissions) matching the sidebar
- Access Denied shown if user lacks all KPI permissions
- `KPI_ANY_PERMISSION` was updated to include `kpi_activity:root_request` (was missing previously)

### Group Visibility

| Group | Permission Gate |
|---|---|
| Activities | `kpi_activity:read` OR `kpi_activity:request` OR `kpi_activity:root_request` |
| Pending Actions | `kpi_activity:approve` OR `kpi_report:review` |
| Recent Reports | `kpi_report:read` |
| Corporate KPI | `corporate_kpi:read` |

Sub-endpoints within Activities are further gated: My/Managed requires `kpi_activity:read`; Owned requires `kpi_activity:request` or `kpi_activity:root_request`.

---

## 4. Metrics and Calculation Rules

All metrics computed **client-side** from response arrays.

| Group | Metrics | Formula |
|---|---|---|
| My Activities | Total, Average Progress, Target Reached | `data.length`, `avg(progressPercent)`, `count(progressPercent >= 100)` |
| Managed Activities | Total, Average Progress, Target Reached | Same |
| Owned Activities | Total, Active, Cancelled, Target Reached | `data.length`, `count(status === 'ACTIVE')`, `count(status === 'CANCELLED')`, `count(ACTIVE && progressPercent >= 100)` |
| Pending Actions | Pending Request count, Pending Review count | `data.length` |
| Recent Reports | Total Reports count | `data.length` |
| Corporate KPI | Active Indicators | Recursive count of INDICATOR + ACTIVE nodes |

### Excluded Metrics

| Metric | Reason |
|---|---|
| Corporate KPI realization/progress | `CorporateKpiResponse` has no `realizedValue` field |
| "Below 50%"/"Low Progress" | Arbitrary threshold, not a domain business rule |
| Report approval rate | Requires historical aggregation |
| Time-based trends | No date-range parameter on list endpoints |

---

## 5. Partial-Failure Behavior

- All permitted fetches fire in parallel via `Promise.allSettled()`
- One page-level loading indicator while any endpoint is in-flight
- Failed groups show a small inline error: "Could not load this section."
- Other groups render unaffected
- No toast for Overview-level failures
- No retry-per-section

---

## 6. Focused Test Results

**File:** `src/modules/hr/kpi/__tests__/overview-page.test.tsx`
**Tests:** 13 total (5 categories)

| # | Test | Result |
|---|---|---|
| 1a | Permission-aware: no permissions → Access Denied | ✅ |
| 1b | Permission-aware: read → Activities visible | ✅ |
| 1c | Permission-aware: approve → Pending Actions visible | ✅ |
| 1d | Permission-aware: without approve → Pending Actions hidden | ✅ |
| 1e | Permission-aware: report read → Recent Reports visible | ✅ |
| 1f | Permission-aware: corp kpi read → Corporate KPI visible | ✅ |
| 2a | No unauthorized fetches: only activity endpoints called | ✅ |
| 2b | No unauthorized fetches: only owned endpoint with root_request | ✅ |
| 2c | No unauthorized fetches: approve+review endpoints with matching perms | ✅ |
| 3 | Metric calculation: average progress displays correctly | ✅ |
| 4 | Metric calculation: Target Reached count | ✅ |
| 5 | Partial failure: inline error, other sections render | ✅ |
| 6 | Empty state: appropriate empty messages | ✅ |

---

## 7. Full Jest Results

```
Test Suites: 12 passed, 12 total
Tests:       198 passed, 198 total
```

---

## 8. TypeScript Result

```
npx tsc --noEmit → exit 0 (no errors)
```

---

## 9. ESLint Results

### P4 Changed-Scope Lint

```
npx eslint src/modules/hr/kpi/overview src/modules/hr/kpi/__tests__/overview-page.test.tsx src/modules/hr/kpi/constants.ts
→ exit 0 (0 errors, 0 warnings)
```

### Full-Project Lint

```
npx eslint .
→ exit 0 (1 pre-existing error, 27 pre-existing warnings)
```

Pre-existing error: `set-state-in-effect` in `employee-form.tsx:127` (unrelated to KPI P4).

---

## 10. Production Build

```
npm run build → exit 0
```

Page `/hr/kpi` listed as `○ (Static)` — client-side rendering with pre-rendered shell.

---

## 11. Files Created/Modified

### New Files

| File | Purpose |
|---|---|
| `src/modules/hr/kpi/overview/use-overview-data.ts` | Permission-gated parallel fetch hook with allSettled |
| `src/modules/hr/kpi/overview/overview-section.tsx` | Section wrapper + MetricBlock/MetricChip components |
| `src/modules/hr/kpi/__tests__/overview-page.test.tsx` | 13 focused tests |
| `docs/plans/2026-07-27-kpi-frontend-p4-overview.md` | Implementation plan (revised) |

### Modified Files

| File | Change |
|---|---|
| `src/app/(main)/hr/kpi/page.tsx` | Replaced placeholder with 4-group Overview page |
| `src/modules/hr/kpi/constants.ts` | Added `KPI_ACTIVITY_ROOT_REQUEST` to `KPI_ANY_PERMISSION` |
| `src/modules/hr/kpi/__tests__/sidebar.test.ts` | Updated count from 12→13, added root_request test |
| `src/modules/hr/kpi/__tests__/page-shells.test.tsx` | Updated Overview shell test, added overview hook mock |

---

## 12. Manual Smoke-Test Checklist

To be executed manually after deployment:

| # | Step | Expected | Result |
|---|---|---|---|
| 1 | Login as `admin@erp.com` → navigate to `/hr/kpi` | All 4 groups visible with data |
| 2 | Verify Activities group shows My/Managed/Owned blocks with metric chips | Counts, average progress %, Target Reached visible |
| 3 | Verify Pending Actions shows request count (if any) | Count badge or "No pending items." |
| 4 | Verify Recent Reports shows 5 most recent entries | Report name, status, value, date |
| 5 | Verify Corporate KPI shows Active Indicators count | Number > 0 |
| 6 | Click "Open Activities" link | Navigates to `/hr/kpi/activities` |
| 7 | Click "Open Approvals" link | Navigates to `/hr/kpi/approvals` |
| 8 | Click "Open Reports" link | Navigates to `/hr/kpi/reports` |
| 9 | Click "Open Corporate KPI" link | Navigates to `/hr/kpi/corporate` |
| 10 | Login as `staff_hr@erp.com` → navigate to `/hr/kpi` | Only Activities and Recent Reports visible (no Pending Actions, no Corporate KPI) |
| 11 | Login as user with only `kpi_activity:read` → navigate to `/hr/kpi` | Only Activities group visible (My + Managed blocks) |
| 12 | Simulate a backend outage for one endpoint | Inline error in affected group only; other groups render |
| 13 | Navigate to `/hr/kpi` with no data | Empty messages shown per group |

---

## 13. Known Limitations

- **Corporate KPI progress**: No realization/progress data — `CorporateKpiResponse` has no `realizedValue`. Only active indicator count is shown.
- **Tab deep-linking**: Activities/Reports links do not pre-select a tab. Existing pages do not support query-parameter tab selection.
- **Loading state**: One page-level indicator while all fetches settle. No staggered loading per section.
- **No refresh button**: Page reloads from fresh navigation. The feature request for a refresh button is outside scope.
