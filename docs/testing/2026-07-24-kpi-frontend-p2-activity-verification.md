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
| P2.4 | Initial verification | `529397c` |
| **P2R.1** | **Strict-cascading remediation** | **`8fa30ca`** |
| **P2R.2** | **Final reverification** | **(this document)** |

---

## 2. P2 Commits

```
35472c7 feat(kpi): add activity and request read-only views
75f926d feat(kpi): add activity request workflows
4b03788 feat(kpi): add activity approval workflow
529397c test(kpi): finalize activity frontend verification
8fa30ca fix(kpi)-activity-strict-cascading
```

---

## 3. Production Files

### Created (14)

```
src/modules/hr/kpi/activity/
├── activity.types.ts              # DTOs, enums, label/variant mappings, request payloads
├── activity-api.ts                # All API methods (9 reads, 4 mutations, 2 assignable, 3 approval)
├── activity-error-mapper.ts       # Known error → English message mapper (21 codes)
├── use-activity-data.ts           # Main data hook (reads, mutations, assignable positions)
├── use-approval-data.ts           # Approval hook (pending queue, approve, reject)
├── activity-table.tsx             # My/Managed/Owned Activities table with action buttons
├── request-table.tsx              # My Requests table
├── activity-form-modal.tsx        # Mode-driven form modal (CREATE_ROOT, CREATE_CHILD, UPDATE)
├── activity-cancel-dialog.tsx     # Cancel confirmation with reason
├── approval-table.tsx             # Pending approval queue table
├── approval-dialog.tsx            # Approve confirmation + reject reason dialog
├── kpi-activity-detail-modal.tsx  # Shared detail modal (activity, request, UPDATE comparison)
├── __tests__/activity-api.test.ts # API contract tests
└── __tests__/activity-page.test.tsx # Permission behavior tests
```

### Modified (5)

```
src/app/(main)/hr/kpi/activities/page.tsx    # P2.1 read-only + P2.2 mutations + P2R.1 strict cascading
src/app/(main)/hr/kpi/approvals/page.tsx     # P2.3 approval page (replaced placeholder)
src/modules/hr/kpi/sidebar.ts                # Added root_request to Activities sidebar
src/modules/hr/kpi/__tests__/sidebar.test.ts # Updated sidebar permission test for root_request
src/modules/hr/kpi/__tests__/page-shells.test.tsx # Updated for implemented pages
```

### Constants

```
src/constants/permissions.ts                  # Added KPI_ACTIVITY_ROOT_REQUEST
```

---

## 4. Routes Implemented

| Route | Purpose |
|---|---|
| `/hr/kpi/activities` | My Activities, Managed Activities, Owned Activities, My Requests (tabs) |
| `/hr/kpi/approvals` | Pending approval queue + approve/reject |

---

## 5. Endpoint Matrix

### Read Endpoints

| Method | Path | Frontend Screen |
|---|---|---|
| GET | `/api/v1/kpi-activities/my` | My Activities tab |
| GET | `/api/v1/kpi-activities/managed` | Managed Activities tab |
| GET | `/api/v1/kpi-activities/owned` | Owned Activities tab |
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

## 6. Permission Matrix (with Strict-Cascading Changes)

| Feature | Required Permission |
|---|---|
| Activities sidebar & page | `kpi_activity:read` **OR** `kpi_activity:request` **OR** `kpi_activity:root_request` |
| Approvals sidebar & page | `kpi_activity:approve` |
| My Activities tab | `kpi_activity:read` |
| Managed Activities tab | `kpi_activity:read` |
| Owned Activities tab | `kpi_activity:root_request` **OR** `kpi_activity:request` |
| My Requests tab | `kpi_activity:request` **OR** `kpi_activity:root_request` |
| Create Activity button | `kpi_activity:root_request` **AND** `corporate_kpi:read` |
| My Activities actions (Create Child) | `kpi_activity:request` (ACTIVE rows only) |
| Owned Activities actions (Update/Cancel) | `kpi_activity:request` (ACTIVE rows only) |
| Approve/Reject | `kpi_activity:approve` |
| Activity detail modal (`GET /{id}`) | `kpi_activity:read` **OR** `kpi_activity:approve` |
| Request detail modal (`GET /requests/{id}`) | `kpi_activity:request` **OR** `kpi_activity:approve` |

---

## 7. Activity Read Behavior (Strict-Cascading)

### My Activities

Activities **assigned** to the current user's active UserPositions. ACTIVE status only.

| Action | Availability |
|---|---|
| View Detail | ✅ (`kpi_activity:read` or `kpi_activity:approve` required) |
| Create Child | ✅ ACTIVE rows, `kpi_activity:request` required |
| Update | ❌ — not owner, only assignee |
| Cancel | ❌ — not owner, only assignee |

### Managed Activities

Activities assigned within the current user's **subordinate branch** (strict descendant positions). ACTIVE status only. **Read-only** — no mutation actions.

### Owned Activities

Activities whose definition is **owned** by the current user's acting UserPosition. ALL statuses (ACTIVE + CANCELLED).

| Action | Availability |
|---|---|
| View Detail | ✅ (`kpi_activity:read` or `kpi_activity:approve` required) |
| Create Child | ❌ — not assignee, only owner |
| Update | ✅ ACTIVE rows, `kpi_activity:request` required |
| Cancel | ✅ ACTIVE rows, `kpi_activity:request` required |

**Ownership rules:**
- Root: owner = ADMIN Creator who submitted the APPROVED CREATE request
- Child: owner = parent activity's `assignedToUserPosition`
- Owner and assignee are always different (self-assignment forbidden)

### My Requests

All requests submitted by the current user. All statuses. Read-only — no Cancel Pending action.

---

## 8. Strict-Cascading Remediation Summary

### Backend Rule Changes

| Old (Flexible) | New (Strict Cascading) |
|---|---|
| Root Create available to `kpi_activity:request` users | Root Create requires `kpi_activity:root_request` (ADMIN-only) |
| Root assignee could be any descendant or self | Root assignee must be top-level position occupant; self excluded |
| Child assignee could be any strict descendant | Child assignee must be direct subordinate only |
| Assignee could Update/Cancel | Only owner can Update/Cancel |
| No Owned Activities endpoint | `GET /owned` — exact-owner activities |
| `NOT_SUBORDINATE` error for child create | `ACTIVITY_TARGET_NOT_DIRECT_SUBORDINATE` for direct-subordinate check |

### Files Changed by P2R.1

| File | Change |
|---|---|
| `src/constants/permissions.ts` | Added `KPI_ACTIVITY_ROOT_REQUEST` |
| `src/modules/hr/kpi/sidebar.ts` | Added `root_request` to Activities sidebar gate |
| `src/modules/hr/kpi/activity/activity-api.ts` | Added `getOwnedActivities()` |
| `src/modules/hr/kpi/activity/use-activity-data.ts` | Added `ownedActivities`, `fetchOwnedActivities` |
| `src/app/(main)/hr/kpi/activities/page.tsx` | Page guard includes `root_request`; owned-activities tab; Root Create gated on `root_request AND corporate_kpi:read`; My Activities shows Create Child only; Owned shows Update/Cancel only |
| `src/modules/hr/kpi/activity/activity-error-mapper.ts` | 4 new strict-cascading error codes |
| `src/modules/hr/kpi/activity/activity-form-modal.tsx` | Removed `isSelf` "(You)" label; empty subordinate/root-assignee states; root helper text |
| `src/modules/hr/kpi/activity/__tests__/activity-api.test.ts` | 3 new `getOwnedActivities` contract tests |
| `src/modules/hr/kpi/activity/__tests__/activity-page.test.tsx` | Updated for `root_request` gating |
| `src/modules/hr/kpi/__tests__/sidebar.test.ts` | Updated sidebar permission test |

### Strict-Cascading Error Mappings

| Backend Error | User-Facing Message |
|---|---|
| `Root activity target must occupy an absolute top-level position` | Root activities can only be assigned to top-level positions. |
| `Activity target is not a direct subordinate` | The selected assignee must be a direct subordinate. |
| `Cannot assign activity to yourself` | You cannot assign an activity to yourself. |
| `Activity has no approved CREATE owner record` | The activity owner could not be determined. |

---

## 9. Request Submission Behavior

| Operation | Creates | Fields Sent | Refresh After |
|---|---|---|---|
| Root Create | PENDING CREATE request | CK, assignee (top-level only), name, unit, target, year, month, optional description | My Requests |
| Child Create | PENDING CREATE request | Parent ID, assignee (direct subordinate only), name, unit, target, optional description | My Requests |
| Update | PENDING UPDATE request | Activity ID, name, description (always), unit, target | My Requests |
| Cancel | PENDING CANCEL request | Activity ID, cancellation reason | My Requests |

All submission is year-first for root create: select year → fetch CK tree → select ACTIVE INDICATOR → month → assignee → fields.

---

## 10. Approval and Maker-Checker Behavior

- All PENDING requests visible including own
- Backend enforces self-approval prevention; error mapped safely: "You cannot approve or reject your own request."
- Approve: confirmation dialog → PATCH with no body → success toast → refresh queue
- Reject: reason dialog → PATCH with `{ rejectionReason }` → success toast → refresh queue
- UPDATE detail: lazy-fetches current activity for current-vs-proposed comparison

---

## 11. Refresh Behavior

| Action | Refresh |
|---|---|
| Activate My Activities tab | Fetch My Activities |
| Activate Managed Activities tab | Fetch Managed Activities |
| Activate Owned Activities tab | Fetch Owned Activities |
| Activate My Requests tab | Fetch My Requests |
| Open Approvals page | Fetch Pending Approvals |
| Submit any request | Fetch My Requests only |
| Approve/Reject | Fetch Pending Approvals only |
| Manual refresh button | Re-fetch current tab's dataset |

---

## 12. Safe Error Handling

- Error mapper covers 21 known backend error messages with user-facing English
- Unknown technical errors use safe generic fallback
- No SQL, Java classes, stack traces, or constraint names exposed

---

## 13. Focused Contract Test Summary

| Suite | Tests | Coverage |
|---|---|---|
| `activity-api.test.ts` | 33 | All 15 API methods: exact paths, payloads, unwrapping, error propagation |
| `activity-page.test.tsx` | 11 | Permission logic: access denied, read-only, request-only, approve-only, root_request-only, root-create gate, tabs |
| **Total** | **44** | |

---

## 14. Final Full Jest Result

```
Test Suites: 9 passed, 9 total
Tests:       165 passed, 165 total
Time:        6.06 s
```

---

## 15. TypeScript Result

`npx tsc --noEmit` → **Zero errors**

---

## 16. Full Lint Result

```
✖ 1 error, 14 warnings
```

The single error (`set-state-in-effect` in `employee-form.tsx`) and all warnings are **pre-existing Organization/Settings issues**, not caused by P2 or P2R.1. All P2/P2R files have zero lint errors and warnings.

---

## 17. Production Build Result

`npm run build` → **Succeeds**. Routes `/hr/kpi/activities` and `/hr/kpi/approvals` render as dynamic server-rendered pages.

---

## 18. Known Limitations

| Limitation | Rationale |
|---|---|
| Activity DTO does not expose owner information | The Owned dataset itself is the ownership context. No owner fields in `KpiActivityResponse`. |
| Root-only users (`kpi_activity:root_request` without `read` or `request`) have limited detail access | Activity detail (`GET /{id}`) requires `kpi_activity:read`; request detail (`GET /requests/{id}`) requires `kpi_activity:request`. Seeded ADMIN role includes all permissions. |
| Self-approval not disabled client-side | The `User` model (`types/auth.ts`) has no `id` field. Frontend cannot reliably compare `requestedByUser` (UUID) against current user. Backend enforces maker-checker; error mapped safely. |
| Backend remains authoritative | Ownership, hierarchy, and maker-checker validation are enforced server-side. Frontend shows actions contextually but never bypasses backend rejection. |
| UI refinement deferred | Column order, icon selection, and detailed visual polish are design decisions to be validated during manual smoke testing. |
| Reports reviewer behavior deferred to P3 | Root report reviewer = ADMIN Creator UserPosition. Child report reviewer = parent activity assignee. ADMIN activity approver is not automatically report reviewer. |

---

## 19. Replacement Manual Smoke-Test Checklist (Strict-Cascading)

> **Status:** `PENDING USER EXECUTION`

### Actors

| Actor | Role | Permissions | Description |
|---|---|---|---|
| Rina | ADMIN Creator | `kpi_activity:root_request`, `kpi_activity:read`, `kpi_activity:request`, `corporate_kpi:read` | Creates root activities |
| Bayu | ADMIN Approver | `kpi_activity:approve`, `kpi_activity:read` | Approves/rejects requests |
| Dira | Top-level Director | `kpi_activity:request`, `kpi_activity:read` | Root assignee; creates children |
| Andi | Direct Manager under Dira | `kpi_activity:request`, `kpi_activity:read` | Child assignee/owner; creates further children |
| Siti | Staff under Andi | `kpi_activity:request`, `kpi_activity:read` | Leaf assignee; empty direct-subordinate list |

### Expected Flow

```
Rina creates root for Dira  →  Bayu approves
Dira sees root in My Activities
Rina sees root in Owned Activities

Dira creates child for Andi  →  Bayu approves
Andi sees child in My Activities
Dira sees child in Owned Activities

Andi creates child for Siti  →  Bayu approves
Siti sees child in My Activities
Andi sees child in Owned Activities
```

### A. Permission and navigation

- [ ] 1. Rina can open Activities.
- [ ] 2. Rina can see Owned Activities and My Requests.
- [ ] 3. Rina sees Create Root Activity only with `kpi_activity:root_request` AND `corporate_kpi:read`.
- [ ] 4. Bayu can open Approvals.
- [ ] 5. Approve-only Bayu does not see Activities unless separately permitted.
- [ ] 6. Dira, Andi, and Siti see tabs allowed by their exact permissions.

### B. Root Create

- [ ] 7. Rina starts Root Create.
- [ ] 8. Period Year is selected before Corporate KPI.
- [ ] 9. Only ACTIVE Corporate KPI Indicators from the selected year appear.
- [ ] 10. Root assignee selector shows only top-level positions.
- [ ] 11. Rina's own UserPosition does not appear.
- [ ] 12. Andi and Siti do not appear because they are not top-level.
- [ ] 13. Rina assigns the root to Dira.
- [ ] 14. Submission creates a Pending request.
- [ ] 15. Official root activity does not exist before approval.

### C. Root approval and ownership

- [ ] 16. Bayu sees the Pending root request.
- [ ] 17. Bayu approves it.
- [ ] 18. Dira sees the root in My Activities.
- [ ] 19. Rina sees the same root in Owned Activities.
- [ ] 20. Dira does not receive Update/Cancel merely because Dira is assignee.
- [ ] 21. Rina receives Update/Cancel because Rina is owner.

### D. First child

- [ ] 22. Dira opens Create Child from the root in My Activities.
- [ ] 23. Parent, Corporate KPI, year, and month are inherited/read-only.
- [ ] 24. Assignee selector shows Andi only as the direct subordinate.
- [ ] 25. Siti is not available as a skip-level target.
- [ ] 26. Dira submits the child request.
- [ ] 27. Bayu approves it.
- [ ] 28. Andi sees the child in My Activities.
- [ ] 29. Dira sees the child in Owned Activities.
- [ ] 30. Dira can Update/Cancel that child as owner.
- [ ] 31. Andi cannot Update/Cancel merely as assignee.

### E. Second child

- [ ] 32. Andi opens Create Child from their assigned activity.
- [ ] 33. Assignee selector shows Siti.
- [ ] 34. Peer, self, unrelated branch, and skip-level users are absent.
- [ ] 35. Bayu approves the child request.
- [ ] 36. Siti sees the activity in My Activities.
- [ ] 37. Andi sees it in Owned Activities.

### F. Staff empty state

- [ ] 38. Siti opens Create Child.
- [ ] 39. Backend returns `200 []`.
- [ ] 40. Frontend shows: "No direct subordinates are available."
- [ ] 41. This is not displayed as an error.

### G. Update ownership

- [ ] 42. Rina submits an Update request for the root from Owned Activities.
- [ ] 43. Official values remain unchanged while Pending.
- [ ] 44. Bayu approves.
- [ ] 45. Updated official values appear after the relevant Activity tab reloads.
- [ ] 46. Immutable fields remain unchanged.

### H. Cancellation ownership

- [ ] 47. Dira cannot cancel the root merely as assignee.
- [ ] 48. Rina can submit cancellation for the root as owner.
- [ ] 49. Active-child constraints remain enforced.
- [ ] 50. Cancel activities from leaf to parent where required.
- [ ] 51. Official status changes only after ADMIN approval.

### I. Maker-checker

- [ ] 52. A requester's own request remains visible.
- [ ] 53. Requester cannot approve or reject their own request.
- [ ] 54. Another ADMIN can process the request.

### J. Error safety

- [ ] 55. Known strict-cascading failures show specific English messages.
- [ ] 56. Unknown technical failures do not expose SQL, Java classes, stack traces, or constraint names.

---

## 20. Readiness

| Gate | Status |
|---|---|
| TypeScript | ✅ Zero errors |
| Full Jest | ✅ 165/165 passed |
| Full lint (P2/P2R files) | ✅ Zero errors and warnings |
| Full lint (global) | ⚠️ 1 pre-existing Organization error, 14 pre-existing warnings — not P2/P2R regressions |
| Production build | ✅ Succeeds |
| Manual smoke | ⏳ `PENDING USER EXECUTION` |

**P2 strict-cascading remediation is ready for user smoke testing. P3 Reports may begin after smoke testing completes successfully.**
