# P2 — KPI Activity Frontend Verification

> **Status:** Verification complete. Ready for user smoke testing.
> **Manual smoke status:** `PENDING USER EXECUTION`

---

## 1. Objective and Scope

Verify the complete KPI Activity frontend (P2) across four phases:

| Phase | Scope | Commit |
|---|---|---|
| P2.1 | Read-only Activity views: My Activities, Managed Activities, My Requests, detail modals | `35472c7` |
| P2.2 | Activity request submission: root/child create, update, cancel | `75f926d` |
| P2.3 | Administrative approval: pending queue, approve, reject | `4b03788` |
| P2.4 | Final verification (this document) | Pending |

---

## 2. P2 Commits

```
35472c7 feat(kpi): add activity and request read-only views
75f926d feat(kpi): add activity request workflows
4b03788 feat(kpi): add activity approval workflow
```

---

## 3. Production Files

### Created (14)

```
src/modules/hr/kpi/activity/
├── activity.types.ts              # DTOs, enums, label/variant mappings, request payloads
├── activity-api.ts                # All API methods (8 reads, 4 mutations, 2 assignable, 3 approval)
├── activity-error-mapper.ts       # Known error → English message mapper
├── use-activity-data.ts           # Main data hook (reads, mutations, assignable positions)
├── use-approval-data.ts           # Approval hook (pending queue, approve, reject)
├── activity-table.tsx             # My/Managed Activities table with action buttons
├── request-table.tsx              # My Requests table
├── activity-form-modal.tsx        # Mode-driven form modal (CREATE_ROOT, CREATE_CHILD, UPDATE)
├── activity-cancel-dialog.tsx     # Cancel confirmation with reason
├── approval-table.tsx             # Pending approval queue table
├── approval-dialog.tsx            # Approve confirmation + reject reason dialog
├── kpi-activity-detail-modal.tsx  # Shared detail modal (activity, request, UPDATE comparison)
├── __tests__/activity-api.test.ts # API contract tests
└── __tests__/activity-page.test.tsx # Permission behavior tests
```

### Modified (4)

```
src/app/(main)/hr/kpi/activities/page.tsx    # P2.1 read-only + P2.2 mutations
src/app/(main)/hr/kpi/approvals/page.tsx     # P2.3 approval page (replaced placeholder)
src/modules/hr/kpi/sidebar.ts                # Removed kpi_activity:approve from Activities
src/modules/hr/kpi/__tests__/sidebar.test.ts # Updated sidebar permission test
src/modules/hr/kpi/__tests__/page-shells.test.tsx # Updated for implemented pages
```

---

## 4. Routes Implemented

| Route | Purpose |
|---|---|
| `/hr/kpi/activities` | My Activities, Managed Activities, My Requests (tabs) |
| `/hr/kpi/approvals` | Pending approval queue + approve/reject |

---

## 5. Endpoint Matrix

### Read Endpoints

| Method | Path | Frontend Screen |
|---|---|---|
| GET | `/api/v1/kpi-activities/my` | My Activities tab |
| GET | `/api/v1/kpi-activities/managed` | Managed Activities tab |
| GET | `/api/v1/kpi-activities/{id}` | Activity detail modal |
| GET | `/api/v1/kpi-activity-requests/my` | My Requests tab |
| GET | `/api/v1/kpi-activity-requests/{id}` | Request detail modal |
| GET | `/api/v1/kpi-activity-requests/pending` | Approvals page |
| GET | `/api/v1/kpi-activities/assignable-user-positions` | Root create form |
| GET | `/api/v1/kpi-activities/{parentId}/assignable-user-positions` | Child create form |

### Mutation Endpoints

| Method | Path | Payload | Screen |
|---|---|---|---|
| POST | `/api/v1/kpi-activity-requests/root-create` | `CreateRootActivityPayload` (no parentActivityId) | Root create form |
| POST | `/api/v1/kpi-activity-requests/child-create` | `CreateChildActivityPayload` (no inherited fields) | Child create form |
| POST | `/api/v1/kpi-activity-requests/update` | `UpdateKpiActivityPayload` (no immutable fields) | Update form |
| POST | `/api/v1/kpi-activity-requests/cancel` | `{ activityId, cancellationReason }` | Cancel dialog |
| PATCH | `/api/v1/kpi-activity-requests/{id}/approve` | No body | Approve dialog |
| PATCH | `/api/v1/kpi-activity-requests/{id}/reject` | `{ rejectionReason }` | Reject dialog |

---

## 6. Permission Matrix

| Feature | Required Permission |
|---|---|
| Activities sidebar & page | `kpi_activity:read` **OR** `kpi_activity:request` |
| Approvals sidebar & page | `kpi_activity:approve` |
| My Activities tab | `kpi_activity:read` |
| Managed Activities tab | `kpi_activity:read` |
| My Requests tab | `kpi_activity:request` |
| Create Activity button | `kpi_activity:request` **AND** `corporate_kpi:read` |
| My Activities actions (Child/Update/Cancel) | `kpi_activity:request` |
| Approve/Reject | `kpi_activity:approve` |

---

## 7. Activity Read Behavior

- **My Activities:** Activities assigned to the current user. Table shows name, parent, CK, period, target, realized, progress bar, status badge. Actions: View Detail, Create Child, Update, Cancel (gated by `kpi_activity:request`).
- **Managed Activities:** Subordinate activities. **Read-only** — no mutation actions. Shows assignee, position, hierarchy, KPI, target, progress, status.
- **My Requests:** All requests submitted by the user. Table shows type badge, name, status badge, created/reviewed dates, rejection reason. View Detail only — no Cancel Pending action (no backend endpoint).

---

## 8. Request Submission Behavior

| Operation | Creates | Fields Sent | Refresh After |
|---|---|---|---|
| Root Create | PENDING CREATE request | CK, assignee, name, unit, target, year, month, optional description | My Requests |
| Child Create | PENDING CREATE request | Parent ID, assignee, name, unit, target, optional description | My Requests |
| Update | PENDING UPDATE request | Activity ID, name, description (always), unit, target | My Requests |
| Cancel | PENDING CANCEL request | Activity ID, cancellation reason | My Requests |

All submission is year-first for root create: select year → fetch CK tree → select ACTIVE INDICATOR → month → assignee → fields.

---

## 9. Approval and Maker-Checker Behavior

- All PENDING requests visible including own
- Backend enforces self-approval prevention; error mapped safely: "You cannot approve or reject your own request."
- Approve: confirmation dialog → PATCH with no body → success toast → refresh queue
- Reject: reason dialog → PATCH with `{ rejectionReason }` → success toast → refresh queue
- UPDATE detail: lazy-fetches current activity for current-vs-proposed comparison

---

## 10. Refresh Behavior

| Action | Refresh |
|---|---|
| Activate My Activities tab | Fetch My Activities |
| Activate Managed Activities tab | Fetch Managed Activities |
| Activate My Requests tab | Fetch My Requests |
| Open Approvals page | Fetch Pending Approvals |
| Submit any request | Fetch My Requests only |
| Approve/Reject | Fetch Pending Approvals only |
| Manual refresh button | Re-fetch current tab's dataset |

---

## 11. Safe Error Handling

- Error mapper covers 16+ known backend error messages with user-facing English
- Unknown technical errors use safe generic fallback
- No SQL, Java classes, stack traces, or constraint names exposed

---

## 12. Focused Contract Test Summary

| Suite | Tests | Coverage |
|---|---|---|
| `activity-api.test.ts` | 30 | All 14 API methods: exact paths, payloads, unwrapping, error propagation |
| `activity-page.test.tsx` | 4 | Permission logic: access denied, read-only, request-only, approve-only, read+request |
| **Total** | **34** | |

---

## 13. Final Full Jest Result

```
Test Suites: 9 passed, 9 total
Tests:       159 passed, 159 total
Time:        10.21 s
```

---

## 14. TypeScript Result

`npx tsc --noEmit` → **Zero errors**

---

## 15. Full Lint Result

```
✖ 1 error, 14 warnings
```

The single error (`set-state-in-effect` in `employee-form.tsx`) and all warnings are **pre-existing Organization/Settings issues**, not caused by P2. All P2 files have zero lint errors and warnings.

---

## 16. Production Build Result

`npm run build` → **Succeeds**. Routes `/hr/kpi/activities` and `/hr/kpi/approvals` render as dynamic server-rendered pages.

---

## 17. Known Limitations

| Limitation | Rationale |
|---|---|
| Managed Activities is read-only | The `KpiActivityResponse` DTO has no `canMutate`, `isExactOwner`, or ownership field. Frontend cannot reliably determine mutation eligibility. Intentional v1 safety decision. |
| Self-approval not disabled client-side | The `User` model (`types/auth.ts`) has no `id` field. Frontend cannot reliably compare `requestedByUser` (UUID) against current user. Backend enforces maker-checker; error mapped safely. |
| Backend remains authoritative | Ownership, hierarchy, and maker-checker validation are enforced server-side. Frontend shows actions optimistically but never bypasses backend rejection. |
| UI refinement deferred | Column order, icon selection, and detailed visual polish are design decisions to be validated during manual smoke testing. |

---

## 18. Manual Smoke-Test Checklist

> **Status:** `PENDING USER EXECUTION`

### Permissions

- [ ] 1. Read-only user sees My Activities and Managed Activities.
- [ ] 2. Request-only user sees My Requests.
- [ ] 3. Request user without `corporate_kpi:read` cannot start Root Create.
- [ ] 4. Approve-only user sees Approvals but not Activities.
- [ ] 5. User without Activity permissions gets Access Denied.

### Root Create

- [ ] 6. Select Period Year first.
- [ ] 7. Corporate KPI tree loads for that year.
- [ ] 8. Only ACTIVE INDICATOR nodes are selectable.
- [ ] 9. Select an assignable UserPosition.
- [ ] 10. Submit Root Create request.
- [ ] 11. Request appears in My Requests as Pending.
- [ ] 12. Official activity does not appear before approval.

### Approval

- [ ] 13. Approver sees the pending request.
- [ ] 14. Requester's own request remains visible.
- [ ] 15. Self-approval is rejected safely ("You cannot approve or reject your own request.").
- [ ] 16. Another approver approves the request.
- [ ] 17. Returning to My Activities fetches and shows the official activity.

### Child Create

- [ ] 18. Owner opens Create Child from My Activities.
- [ ] 19. Only strict-descendant assignees are available.
- [ ] 20. Corporate KPI and period remain inherited/read-only.
- [ ] 21. Child request is approved.
- [ ] 22. Child appears in the activity hierarchy and Managed Activities.

### Update

- [ ] 23. Owner submits an Update request.
- [ ] 24. Official values remain unchanged while Pending.
- [ ] 25. Approver opens Current versus Proposed comparison.
- [ ] 26. Reject one update and confirm official values remain unchanged.
- [ ] 27. Approve another update and confirm official values change.

### Cancellation

- [ ] 28. Submit parent cancellation while an active child exists and confirm rejection.
- [ ] 29. Submit and approve child cancellation.
- [ ] 30. Submit and approve parent cancellation.
- [ ] 31. Confirm both activities show Cancelled status.

### Safety

- [ ] 32. Confirm Managed Activities remains read-only.
- [ ] 33. Confirm unknown backend errors do not expose SQL, Java classes, or stack traces.

---

## 19. Readiness

| Gate | Status |
|---|---|
| TypeScript | ✅ Zero errors |
| Full Jest | ✅ 159/159 passed |
| Full lint (P2 files) | ✅ Zero errors and warnings |
| Full lint (global) | ⚠️ 1 pre-existing Organization error, 14 pre-existing warnings — not P2 regressions |
| Production build | ✅ Succeeds |
| Manual smoke | ⏳ `PENDING USER EXECUTION` |

**P2 is ready for user smoke testing. P3 Reports may begin after smoke testing completes successfully.**
