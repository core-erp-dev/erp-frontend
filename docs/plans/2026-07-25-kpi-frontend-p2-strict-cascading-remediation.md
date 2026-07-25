# P2R — KPI Activity Frontend Strict-Cascading Remediation Plan

> **Status:** `READY FOR REVIEW`
>
> Both backend blockers from the previous revision are now resolved:
> 1. **Owned Activities endpoint exists**: `GET /api/v1/kpi-activities/owned` — ADMIN Creators can list their owned roots.
> 2. **Capability booleans are NOT required** — tab semantics ARE the capability discriminator. `/my` = assignee → Create Child. `/owned` = owner → Update/Cancel.

---

## 0. Revision History

| Revision | Date | Key Change |
|---|---|---|
| v1 | 2026-07-25 | Initial plan — BLOCKED status |
| v2 | 2026-07-25 | Unblocked: `/owned` endpoint confirmed; tab semantics = capability discriminator |
| v3 (this) | 2026-07-25 | Corrected: overlap semantics, detail permissions, root-create gate, owner display, smoke-test actors, CMD commands |

---

## 1. Objective

Remediate the KPI Activity frontend (P2) after the backend strict-cascading change. The old flexible assignment flow is obsolete. The new model enforces:

- **Root**: ADMIN-only creation (`kpi_activity:root_request`), assignee must occupy a top-level position (`parent == null`), creator self-exclusion, another ADMIN approves.
- **Child**: Only exact parent assignee creates, assignee must be direct subordinate, no peer/self/skip-level, Corporate KPI/year/month inherited.
- **Ownership**: Root owner = exact ADMIN Creator UserPosition (from approved CREATE request's `requestedByUserPosition`). Child owner = exact parent activity's `assignedToUserPosition`. Owner ≠ assignee in all cases.
- **Update/Cancel**: Exact owner only. Assignee does NOT automatically have Update/Cancel.
- **Maker-checker**: All mutations remain PENDING request → ADMIN approval.

---

## 2. Backend Source Inspected (Current)

All findings derived from current backend source, verified at revision time.

| File | Lines | Key Content |
|---|---|---|
| `KpiActivityController.java` | 91 | **6 endpoints**: `/my`, `/managed`, **`/owned` (NEW)**, `/{id}`, `/assignable-user-positions`, `/{parentId}/assignable-user-positions` |
| `KpiActivityChangeRequestController.java` | 140 | 9 endpoints: root-create, child-create, update, cancel, my-requests, get-by-id, pending, approve, reject |
| `KpiActivityResponse.java` | 44 | 19 fields — NO ownership/capability fields (unchanged) |
| `KpiActivityChangeRequestResponse.java` | 49 | `requestedByUser`/`requestedByUserName` present (unchanged) |
| `AssignableUserPositionResponse.java` | 28 | `isSelf` field present but always `false` in root/child results |
| `KpiActivityRepository.java` | 73 | `findByOwnedByUserPositionId` — root via EXISTS on APPROVED CREATE, child via parent.assignedToUserPosition |
| `KpiActivityServiceImpl.java` | 1185 | Full ownership/capability/validation logic |
| `Permissions.java` | 58 | New: `KPI_ACTIVITY_ROOT_REQUEST = "kpi_activity:root_request"` |
| `MessageConstants.java` | ~190 | New error codes confirmed |

---

## 3. Confirmed Business Contract (Revised)

### 3.1 Permission Matrix

| Permission Code | Who Gets It | Used For |
|---|---|---|
| `kpi_activity:root_request` | ADMIN only | Root create, root assignable endpoint, owned-activities read, **Activities page access** |
| `kpi_activity:request` | Non-ADMIN requesters | Child create, update, cancel, child assignable, owned-activities read, my-requests read, **Activities page access** |
| `kpi_activity:read` | All Activity users | My Activities, Managed Activities, activity detail, **Activities page access** |
| `kpi_activity:approve` | ADMIN approvers | Pending queue, approve, reject |

### 3.2 Endpoint Matrix (Complete)

| Method | Path | Permission | Response | Screen |
|---|---|---|---|---|
| GET | `/my` | `kpi_activity:read` | `List<KpiActivityResponse>` (ACTIVE only, assigned to current user) | My Activities tab |
| GET | `/managed` | `kpi_activity:read` | `List<KpiActivityResponse>` (ACTIVE only, strict descendant positions) | Managed Activities tab |
| **GET** | **`/owned`** | **`kpi_activity:root_request` OR `kpi_activity:request`** | **`List<KpiActivityResponse>` (ALL statuses, exact-owner)** | **Owned Activities tab** |
| GET | `/{id}` | `kpi_activity:read` OR `kpi_activity:approve` | `KpiActivityResponse` | Detail modal |
| GET | `/assignable-user-positions` | `kpi_activity:root_request` | `List<AssignableUserPositionResponse>` (top-level only, no self) | Root create form |
| GET | `/{parentId}/assignable-user-positions` | `kpi_activity:request` | `List<AssignableUserPositionResponse>` (direct children only, no self) | Child create form |
| POST | `/root-create` | `kpi_activity:root_request` | 201 `KpiActivityChangeRequestResponse` | Root create form |
| POST | `/child-create` | `kpi_activity:request` | 201 `KpiActivityChangeRequestResponse` | Child create form |
| POST | `/update` | `kpi_activity:request` OR `kpi_activity:root_request` | 201 `KpiActivityChangeRequestResponse` | Update form |
| POST | `/cancel` | `kpi_activity:request` OR `kpi_activity:root_request` | 201 `KpiActivityChangeRequestResponse` | Cancel dialog |
| GET | `/requests/my` | `kpi_activity:request` OR `kpi_activity:root_request` | `List<KpiActivityChangeRequestResponse>` | My Requests tab |
| GET | `/requests/{id}` | `kpi_activity:request` OR `kpi_activity:approve` | `KpiActivityChangeRequestResponse` | Request detail |
| GET | `/requests/pending` | `kpi_activity:approve` | `List<KpiActivityChangeRequestResponse>` | Approvals page |
| PATCH | `/requests/{id}/approve` | `kpi_activity:approve` | `KpiActivityChangeRequestResponse` | Approve dialog |
| PATCH | `/requests/{id}/reject` | `kpi_activity:approve` | `KpiActivityChangeRequestResponse` | Reject dialog |

### 3.3 List Semantics (Authoritative)

| Endpoint | Meaning | Status Filter | Self in Results |
|---|---|---|---|
| `GET /my` | Activities **assigned** to current user's active UserPositions | ACTIVE only | Yes — user IS the assignee |
| `GET /managed` | Activities assigned to positions that are **strict descendants** of current user's position | ACTIVE only | No — excludes user's own position's activities |
| `GET /owned` | Activities **owned** by current user (via acting UserPosition) | **ALL statuses** (ACTIVE + CANCELLED) | Yes — user IS the owner |

**Key semantics:**
- `/my` returns only ACTIVE assigned activities. CANCELLED assigned activities do NOT appear.
- `/owned` returns ALL statuses — owner sees both ACTIVE and CANCELLED activities they own.
- `/owned` root resolution: finds the APPROVED CREATE change request's `requestedByUserPosition.id`. ADMIN Creator with `kpi_activity:root_request` sees root activities they created (even though another admin approved them).
- `/owned` child resolution: `parent.assignedToUserPosition.id` matches current user's acting UserPosition.
- Overlap between `/owned` and `/managed`: an activity owned by the current user may also appear in Managed if the assignee is the user's subordinate. This is valid — each tab serves a distinct purpose. No deduplication needed.
- **My Activities and Owned Activities do NOT overlap**: under strict cascading, owner and assignee are always different. Root creator cannot self-assign. Child creator (parent assignee) assigns to a different direct subordinate.

### 3.4 Ownership Model (Backend Logic)

```text
Root:  owner = exact ADMIN Creator UserPosition (from approved CREATE request's requestedByUserPosition)
Child: owner = exact parent activity's assignedToUserPosition
```

`resolveOwnerPosition()` in `KpiActivityServiceImpl` (lines 593-606):
- Root: queries `requestRepository.findByActivityIdAndRequestTypeAndStatus(activityId, CREATE, APPROVED)` → returns `request.getRequestedByUserPosition()`.
- Child: returns `activity.getParent().getAssignedToUserPosition()`.

### 3.5 Capability Gating — Tab Semantics Approach

**No capability booleans exist in `KpiActivityResponse`** (and none are required).

The tab semantics themselves provide the capability distinction:

| Tab | Dataset Guarantee | Safe Actions |
|---|---|---|
| **My Activities** | All rows = assigned to current user = current user IS the parent assignee for any child | **Create Child** on ACTIVE rows (backend validates ownership at submit) |
| **Owned Activities** | All rows = owned by current user = current user IS the owner | **Update, Cancel** on ACTIVE rows (backend validates ownership at submit) |
| **Managed Activities** | Rows under descendant positions — user is NOT assignee, NOT owner | **Read-only** — no mutations |

**Why this works:**
- Create Child: backend checks `parent.getAssignedToUserPosition().getCoreUser().getId().equals(userId)` (line 140-141). In `/my`, every ACTIVE row IS the current user's assignment → eligible. Backend rejects if wrong.
- Update/Cancel: backend calls `resolveOwnerPosition()` and checks `owner.getCoreUser().getId().equals(userId)` (lines 219-221, 306-308). In `/owned`, every row IS owned by current user → eligible. Backend rejects if wrong.
- No fragile client-side heuristics — backend is always authoritative.

### 3.6 Assignable Positions — Root

- `GET /assignable-user-positions` — permission: `kpi_activity:root_request`
- Returns active UserPositions occupying absolute top-level Positions (`parent == null`)
- Excludes the requester's own CoreUser
- `isSelf` is always `false`
- Empty list is valid (no top-level occupants)

### 3.7 Assignable Positions — Child

- `GET /{parentActivityId}/assignable-user-positions` — permission: `kpi_activity:request`
- Returns active UserPositions in Positions that are **direct children** of the parent assignee's Position
- Excludes the parent assignee's own CoreUser
- `isSelf` is always `false`
- `200 []` is a valid response (staff with no subordinates)

### 3.8 New Error Codes

| Constant | Raw Message | User-Facing |
|---|---|---|
| `ROOT_ACTIVITY_REQUIRES_TOP_LEVEL_POSITION` | "Root activity target must occupy an absolute top-level position" | Assignee must hold a top-level organizational position |
| `ACTIVITY_TARGET_NOT_DIRECT_SUBORDINATE` | "Activity target is not a direct subordinate" | Assignee must be a direct subordinate of your position |
| `CANNOT_ASSIGN_ACTIVITY_TO_SELF` | "Cannot assign activity to yourself" | You cannot assign an activity to yourself |
| `ACTIVITY_HAS_NO_OWNER` | "Activity has no approved CREATE owner record" | This activity has no ownership record |
| `NOT_SUBORDINATE` | "User is not your subordinate" | ⚠️ OBSOLETE for activity child create — replaced by `ACTIVITY_TARGET_NOT_DIRECT_SUBORDINATE`. Keep mapping for other endpoints. |

---

## 4. Old Frontend Assumptions (Now Invalid)

### 4.1 Root Create Authorization

**Old** (line 135, `page.tsx`): `const canCreateRoot = canRequest && canReadCorporateKpi;`
**Now**: Must use `kpi_activity:root_request` AND `corporate_kpi:read`. The `root_request` permission is ADMIN-only. `kpi_activity:request` alone is insufficient. `corporate_kpi:read` is required to load the CK selector. Both are needed for the button to appear.

### 4.2 Root Assignable Endpoint Call

**Old**: Called by any user with `kpi_activity:request`.
**Now**: Endpoint requires `kpi_activity:root_request`. Non-ADMIN users get 403.

### 4.3 Assignee Selector — Self-Assignment

**Old**: Root assignable positions included `isSelf = true`; frontend showed "(You)" label.
**Now**: Backend filters self. `isSelf` always `false`. "(You)" label is dead code.

### 4.4 Child Assignee — Direct Subordinate Only

**Old**: Described as "strict descendant" (verification doc §18.19). `NOT_SUBORDINATE` error mapped.
**Now**: Direct subordinate only. `NOT_SUBORDINATE` is obsolete for child create. New error: `ACTIVITY_TARGET_NOT_DIRECT_SUBORDINATE`.

### 4.5 Action Placement — My vs Owned

**Old**: All 3 mutation buttons (Create Child, Update, Cancel) on every ACTIVE My Activities row if `kpi_activity:request`.
**Now**:
- **My Activities**: Create Child only (user is assignee = parent assignee for children).
- **Owned Activities** (NEW tab): Update + Cancel only (user is exact owner).
- **Managed Activities**: Read-only (unchanged).

### 4.6 Update/Cancel Inferred from Assignee

**Old**: Verification doc §7: "My Activities actions: … Update, Cancel (gated by `kpi_activity:request`)."
**Now**: User is assignee, not owner. Update/Cancel must only appear in Owned Activities tab.

### 4.7 Smoke Test — Manager Creates Root for Self

**Old**: Manager/Andi creates root and self-assigns.
**Now**: Backend enforces `CANNOT_ASSIGN_ACTIVITY_TO_SELF`. Root creator ≠ root assignee.

### 4.8 No Owned Activities Tab

**Old**: No way for ADMIN Creator to list owned roots.
**Now**: `GET /owned` endpoint exists. "Owned Activities" tab must be added.

### 4.9 Detail Access for Root-Only Creator

**Old assumption**: ADMIN Creator with only `kpi_activity:root_request` can open activity/request detail modals.
**Backend reality**: 
- `GET /api/v1/kpi-activities/{id}` requires `kpi_activity:read` or `kpi_activity:approve` — **not** `root_request`.
- `GET /api/v1/kpi-activity-requests/{id}` requires `kpi_activity:request` or `kpi_activity:approve` — **not** `root_request`.

In practice, the seeded ADMIN role includes all KPI permissions (`read`, `request`, `root_request`, `approve`, `corporate_kpi:read`), so a seeded ADMIN user always has full detail access. A hypothetical root-only account (only `root_request`) would see the Activities page and Owned Activities tab but could not open detail modals — this is an accepted backend limitation, not a frontend problem.

---

## 5. Affected P2 Phases

| Phase | Commit | Impact |
|---|---|---|
| P2.1 Read-only views | `35472c7` | Add Owned Activities tab; update tab structure |
| P2.2 Request workflows | `75f926d` | **PRIMARY remediation area** — Root authorization, child semantics, action placement, error mapping |
| P2.3 Approval workflow | `4b03788` | Minimal — verify request detail shows submitter context; new error codes in approval flow |
| P2.4 Verification | `529397c` | Smoke test and verification doc must be rewritten |

---

## 6. Minimal Frontend Information Architecture

### 6.1 Tab Structure

```
Activities Page (/hr/kpi/activities)
├── My Activities      (permission: kpi_activity:read)
├── Managed Activities  (permission: kpi_activity:read)
├── Owned Activities    (permission: kpi_activity:root_request OR kpi_activity:request)
└── My Requests         (permission: kpi_activity:request OR kpi_activity:root_request)
```

Tab order reflects priority. The first tab for which the user has permission becomes the default active tab. For `root_request`-only users, `owned-activities` is the first visible tab.

### 6.2 Action Placement

| Tab | Actions per Row | Condition |
|---|---|---|
| **My Activities** | View Detail (↓), Create Child | View Detail: `kpi_activity:read` required. Create Child on ACTIVE rows. |
| **Owned Activities** | View Detail (↓), Update, Cancel | View Detail: `kpi_activity:read` required. Update/Cancel on ACTIVE rows. |
| **Managed Activities** | View Detail (↓) only | View Detail: `kpi_activity:read` required. Read-only. |
| **My Requests** | View Detail (†) only | View Detail: `kpi_activity:request` OR `kpi_activity:approve` required. Read-only. |

> ↓ `GET /api/v1/kpi-activities/{id}` requires `kpi_activity:read` OR `kpi_activity:approve`. A user with only `kpi_activity:root_request` (no `kpi_activity:read`) cannot open activity detail.
>
> † `GET /api/v1/kpi-activity-requests/{id}` requires `kpi_activity:request` OR `kpi_activity:approve`. A user with only `kpi_activity:root_request` (no `kpi_activity:request`) cannot open request detail.
>
> In practice, the seeded ADMIN role includes all four permissions (`read`, `request`, `root_request`, `approve`). The theoretical `root_request`-only account is not supported for detail access (see §4.9, §22).

### 6.3 Create Activity Button (Page-Level)

- Gated on `kpi_activity:root_request` AND `corporate_kpi:read` (see §7.1)
- Opens Root Create form modal
- Previously gated on `kpi_activity:request && corporate_kpi:read` — this is obsolete
- `kpi_activity:request` alone does NOT qualify

### 6.4 Overlap Handling

My Activities and Owned Activities do NOT overlap: under strict cascading, owner and assignee are always different. Root creator cannot self-assign. Child creator (parent assignee) assigns to a different direct subordinate.

Owned Activities and Managed Activities MAY overlap: an activity owned by the current user may appear in Managed if the assignee is the user's subordinate. Example: Dira creates an activity for Andi → Dira owns it in Owned Activities, Andi is Dira's subordinate → activity appears in Dira's Managed Activities. This is valid — each tab serves a distinct purpose. No deduplication needed.

---

## 7. Corrected Root Create UX

### 7.1 Authorization

```typescript
// page.tsx
const canCreateRoot = hasPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST) && hasPerm(PERM.CORPORATE_KPI_READ);
```

`kpi_activity:root_request` authorizes the root workflow. `corporate_kpi:read` is required to load the Corporate KPI Indicator selector. Both permissions are needed for the button to appear. `kpi_activity:request` does NOT qualify.

In practice, the seeded ADMIN role always includes both permissions. If a future role has `root_request` without `corporate_kpi:read`, the button is correctly hidden — the form modal cannot load the CK selector without it.

### 7.2 Assignee Selector

- Shows top-level organizational positions only (backend returns these)
- No self in list (backend filters)
- Remove `isSelf`-based "(You)" label
- Add helper text: "Assignees are leaders of top-level organizational positions."

### 7.3 Form Flow

Year-first selection → CK tree for that year → ACTIVE INDICATOR → Month → Assignee → Name/Description/Unit/Target. No changes needed.

### 7.4 ADMIN Eligibility Determination

Frontend uses `usePermission()` hook. `kpi_activity:root_request` will only be present for ADMIN users. No display-name guessing.

---

## 8. Corrected Child Create UX

### 8.1 Entry Point

**Only from My Activities tab**, on ACTIVE rows. The parent activity row comes from `/my`, which guarantees the user is the assignee. Backend validates ownership at submit.

### 8.2 Inherited Fields

Corporate KPI, year, and month are already read-only and omitted from payload. **No change needed.**

### 8.3 Assignee Selector

- Backend returns only direct subordinates of parent assignee's position
- Excludes parent assignee's CoreUser
- `isSelf` always `false` — remove "(You)" label from child selector
- Remove any client-side depth filtering

### 8.4 Empty Subordinate State

`200 []` is valid. Display: `"No direct subordinates are available."`

---

## 9. Corrected Update/Cancel UX

### 9.1 Entry Point

**Only from Owned Activities tab**, on ACTIVE rows. All rows in `/owned` are guaranteed to be owned by the current user. Backend validates ownership at submit.

### 9.2 Removal from My Activities

Update/Cancel callbacks must be removed from My Activities table usage in `page.tsx`. The `ActivityTable` component already accepts `onUpdate`/`onCancel` as optional props — simply don't pass them for My Activities.

### 9.3 Where Owners See Their Activities

In the new "Owned Activities" tab. ADMIN Creator with `kpi_activity:root_request` sees their owned roots here. Child owners see their owned children.

### 9.4 Update Form & Cancel Dialog

Form and dialog logic unchanged. Payloads remain correct (immutable fields omitted).

---

## 10. P2.3 Impact (Approvals)

### 10.1 What Remains Valid

- Pending ADMIN queue — unchanged
- Approve/reject endpoints — unchanged
- Maker-checker (requester cannot approve own) — unchanged
- Lazy UPDATE comparison — unchanged
- Self-approval safe error mapping — unchanged

### 10.2 Changes Needed

| Change | Reason |
|---|---|
| Request detail modal: add submitter context | Approvers should see who submitted the request |
| New error codes in approval error mapper | `ROOT_ACTIVITY_REQUIRES_TOP_LEVEL_POSITION`, `ACTIVITY_TARGET_NOT_DIRECT_SUBORDINATE`, etc. may appear during approval revalidation |

### 10.3 Request Detail Display

- CREATE with no parent → "Root Activity"
- CREATE with parent → "Parent: {parentActivityName}"
- Already partially handled in `kpi-activity-detail-modal.tsx` — verify completeness.
- The `requestedByUserName` field is available in the request DTO and should be displayed alongside the request type/status.
- Activity detail modal shows confirmed fields only: assignee (name + position), parent activity, Corporate KPI, period, status, realized value, progress. No owner fields — `KpiActivityResponse` has no owner data.

---

## 11. Error Mapping

### 11.1 Current Mapper (`activity-error-mapper.ts`)

16 known error keys. All remain valid except `NOT_SUBORDINATE` which must be supplemented (not removed — it may still appear from other endpoints).

### 11.2 New Mappings to Add

```typescript
'Root activity target must occupy an absolute top-level position':
  'Assignee must hold a top-level organizational position.',
'Activity target is not a direct subordinate':
  'Assignee must be a direct subordinate of your organizational unit.',
'Cannot assign activity to yourself':
  'You cannot assign an activity to yourself.',
'Activity has no approved CREATE owner record':
  'This activity has no ownership record.',
```

### 11.3 Updated Mapping

```typescript
// OLD — replaces NOT_SUBORDINATE entirely
'User is not your subordinate': 'The selected user is not in your direct reporting line.',
```

Keep `NOT_SUBORDINATE` in the mapper — it may be produced by other endpoints. Just add `ACTIVITY_TARGET_NOT_DIRECT_SUBORDINATE` as a more specific mapping.

---

## 12. Sidebar and Page Guard Update

### 12.1 Current Gate (sidebar + page.tsx)

Both the sidebar item and the `page.tsx` guard use:

```typescript
// sidebar.ts
permissions: [PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST],

// page.tsx
const canAccess = hasAnyPerm(PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST);
```

### 12.2 Required Gate

Both must be updated to include `root_request`:

```typescript
// sidebar.ts
permissions: [PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST],

// page.tsx
const canAccess = hasAnyPerm(PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST);
```

An ADMIN Creator with only `kpi_activity:root_request` must be able to access the Activities page to see Owned Activities, My Requests, and the Create Activity button.

### 12.3 First Accessible Tab

The first tab in `canAccess`-filtered tab list becomes the default. For a `root_request`-only user, `my-activities` and `managed-activities` are hidden (require `kpi_activity:read`), so `owned-activities` becomes the first visible tab.

---

## 13. Exact Files

### 13.1 CREATE

| File | Reason |
|---|---|
| This plan — already exists | Revision in place |

### 13.2 MODIFY

| File | Classification | Changes |
|---|---|---|
| `src/constants/permissions.ts` | MODIFY | Add `KPI_ACTIVITY_ROOT_REQUEST: 'kpi_activity:root_request'` |
| `src/modules/hr/kpi/sidebar.ts` | MODIFY | Add `PERM.KPI_ACTIVITY_ROOT_REQUEST` to Activities sidebar gate |
| `src/modules/hr/kpi/activity/activity-api.ts` | MODIFY | Add `getOwnedActivities()` calling `GET /api/v1/kpi-activities/owned` |
| `src/modules/hr/kpi/activity/activity.types.ts` | MODIFY | No DTO changes — `KpiActivityResponse` unchanged. Remove `isSelf` field from `AssignableUserPositionResponse` usage docs only (type can keep it) |
| `src/modules/hr/kpi/activity/activity-error-mapper.ts` | MODIFY | Add 4 new error codes; update `NOT_SUBORDINATE`/`ACTIVITY_TARGET_NOT_DIRECT_SUBORDINATE` |
| `src/modules/hr/kpi/activity/use-activity-data.ts` | MODIFY | Add `ownedActivities` state, `fetchOwnedActivities`, `isLoadingOwned`, `ownedError` |
| `src/modules/hr/kpi/activity/activity-table.tsx` | MODIFY | Accept optional `showCreateChild` / `showUpdateCancel` mode prop (or just use existing optional callback props — already designed for this) |
| `src/modules/hr/kpi/activity/activity-form-modal.tsx` | MODIFY | Remove `isSelf` "(You)" label; add empty subordinate message; add root assignee helper text |
| `src/app/(main)/hr/kpi/activities/page.tsx` | MODIFY | Root Create → `root_request AND corporate_kpi:read`; page guard add `root_request`; add Owned Activities tab; split My Activities callbacks (Create Child only) vs Owned Activities callbacks (Update/Cancel only) |
| `src/modules/hr/kpi/activity/kpi-activity-detail-modal.tsx` | MODIFY | Display `requestedByUserName` in request detail; activity detail unchanged (no owner fields) |
| `src/modules/hr/kpi/activity/__tests__/activity-api.test.ts` | MODIFY | Add test for `/owned` endpoint |
| `src/modules/hr/kpi/activity/__tests__/activity-page.test.tsx` | MODIFY | Update permission tests for `kpi_activity:root_request`; add Owned Activities tab test |
| `docs/testing/2026-07-24-kpi-frontend-p2-activity-verification.md` | MODIFY | Update all sections per §14 |

### 13.3 KEEP (Unchanged)

| File | Reason |
|---|---|
| `activity-cancel-dialog.tsx` | Dialog logic unchanged |
| `request-table.tsx` | Read-only request display unchanged |
| `approval-table.tsx` | Approval queue unchanged |
| `approval-dialog.tsx` | Approve/reject dialogs unchanged |
| `use-approval-data.ts` | Approval logic unchanged |

### 13.4 REMOVE

| Code | Reason |
|---|---|
| `isSelf` "(You)" label in `activity-form-modal.tsx` | Backend always filters self; `isSelf` always `false` |
| Update/Cancel callbacks from My Activities tab in `page.tsx` | User is assignee, not owner |
| Obsolete `canCreateRoot = canRequest && canReadCorporateKpi` gate in `page.tsx` | Replaced by `kpi_activity:root_request` |

### 13.5 DEFER

| Feature | Reason |
|---|---|
| P3 Reports (all in `src/modules/hr/kpi/report/`) | P3 scope |
| KPI Overview page | Out of scope |
| Dashboard widgets | Out of scope |

---

## 14. Verification Document Impact

`docs/testing/2026-07-24-kpi-frontend-p2-activity-verification.md` requires updates:

| Section | Change |
|---|---|
| §5 Endpoint Matrix | Add `/owned` to read endpoints |
| §6 Permission Matrix | Add `kpi_activity:root_request`; update Create Activity button gate; update My Activities actions |
| §7 Activity Read Behavior | Add Owned Activities tab description; My Activities → Create Child only; remove Update/Cancel from My Activities |
| §8 Request Submission Behavior | Update Root Create: ADMIN-only, top-level assignee only |
| §17 Known Limitations | Remove "Managed Activities read-only" limitation (now by-design); remove "no owned endpoint" limitation (resolved) |
| §18 Smoke Test | Complete rewrite — see §15 |

---

## 15. Smoke Test Replacement

Old scenarios (manager creates root for self, arbitrary descendants) are **obsolete**. New actors:

| Actor | Role | Permissions | Description |
|---|---|---|---|
| Rina | ADMIN Creator | `kpi_activity:root_request`, `kpi_activity:read`, `kpi_activity:request`, `corporate_kpi:read` | Creates root activities |
| Bayu | ADMIN Approver | `kpi_activity:approve`, `kpi_activity:read` | Approves/rejects requests |
| Dira | Top-level Director | `kpi_activity:request`, `kpi_activity:read` | Root assignee; creates children |
| Andi | Direct Manager under Dira | `kpi_activity:request`, `kpi_activity:read` | Child assignee/owner; creates further children |
| Siti | Staff under Andi | `kpi_activity:request`, `kpi_activity:read` | Leaf assignee; empty direct-subordinate list |

### Expected Flow

```text
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

### Smoke Checklist

**Root Create (ADMIN-only)**
- [ ] 1. Non-ADMIN user with `kpi_activity:request` does NOT see Create Activity button.
- [ ] 2. Rina (ADMIN Creator) with `kpi_activity:root_request` AND `corporate_kpi:read` sees the button.
- [ ] 3. Root assignee options contain only top-level position occupants (Dira, not Andi or Siti).
- [ ] 4. Root assignee options exclude Rina's own CoreUser (self does NOT appear in selector).
- [ ] 5. Submit root create for Dira → appears in My Requests as Pending.

**Approval (different ADMIN)**
- [ ] 6. Bayu sees pending root create request.
- [ ] 7. Rina cannot approve own request.
- [ ] 8. Bayu approves → activity appears in Dira's My Activities.
- [ ] 9. Rina sees root in **Owned Activities** (not My Activities).

**Child Create (parent assignee only)**
- [ ] 10. Dira sees Create Child on root row in My Activities.
- [ ] 11. Child assignee options contain only direct subordinates of Dira's position (Andi, not Siti or Dira herself).
- [ ] 12. No peers, self, skip-level, or unrelated branch occupants appear.
- [ ] 13. Corporate KPI and Period read-only/inherited.
- [ ] 14. Andi sees Create Child on child row in My Activities.
- [ ] 15. Child assignee options contain only direct subordinates of Andi (Siti, not beyond).

**Empty Direct Subordinates**
- [ ] 16. Siti opening Create Child sees "No direct subordinates are available."

**Update/Cancel (owner only)**
- [ ] 17. Dira (assignee) does NOT see Update/Cancel in My Activities.
- [ ] 18. Rina sees Update/Cancel on root in Owned Activities.
- [ ] 19. Dira sees Update/Cancel on child in Owned Activities (Dira is child owner).
- [ ] 20. Andi (assignee) does NOT see Update/Cancel in My Activities for their child.
- [ ] 21. Andi sees Update/Cancel on their child in Owned Activities (Andi created it for Siti).

**Maker-Checker**
- [ ] 22. All mutations submit PENDING requests.
- [ ] 23. Official data unchanged until approval.
- [ ] 24. Requester cannot approve own request.

> **Status:** `PENDING USER EXECUTION` (after P2R implementation)

---

## 16. Deferred P3 Reviewer Rules

> ⚠️ **Do not implement.** Recorded for future P3.

```text
Root report reviewer  = exact ADMIN Creator UserPosition
Child report reviewer = exact parent activity assignee
```

The reviewer maps to the owner model:
- Root: ADMIN Creator (same as root owner)
- Child: Parent assignee (same as child owner)

P3 Reports must use the same ownership resolution as P2 Update/Cancel.

---

## 17. Thin Test Plan

Target: **4–8 new or updated tests**.

### 17.1 Contract Tests (`activity-api.test.ts`)

| Test | What It Verifies |
|---|---|
| `getOwnedActivities` uses correct path and unwrapping | `GET /api/v1/kpi-activities/owned` |
| Error mapper returns safe message for `ROOT_ACTIVITY_REQUIRES_TOP_LEVEL_POSITION` | New error code mapped |
| Error mapper returns safe message for `ACTIVITY_TARGET_NOT_DIRECT_SUBORDINATE` | New error code mapped |
| Error mapper returns safe message for `CANNOT_ASSIGN_ACTIVITY_TO_SELF` | New error code mapped |

### 17.2 Page/Permission Tests (`activity-page.test.tsx`)

| Test | What It Verifies |
|---|---|
| User with only `kpi_activity:request` does NOT see Create Activity button | `root_request` + `corporate_kpi:read` gating |
| User with `kpi_activity:root_request` AND `corporate_kpi:read` sees Create Activity button | ADMIN-only access |
| Owned Activities tab renders when user has `kpi_activity:root_request` or `kpi_activity:request` | Tab visibility |

### 17.3 Not Planned

- Layout, icon, CSS, animation tests
- Every role/every hierarchy case — backend-tested
- Modal DOM tests
- Exact wording tests

---

## 18. Remediation Phases

### P2R.1 — Strict-Cascading Activity Correction

1. Add `KPI_ACTIVITY_ROOT_REQUEST` to `src/constants/permissions.ts`
2. Add `kpi_activity:root_request` to Activities sidebar gate in `sidebar.ts`
3. Add `kpi_activity:root_request` to the Activities page guard (`page.tsx`: `hasAnyPerm(PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST)`)
4. Add `getOwnedActivities()` to `activity-api.ts`
5. Add `ownedActivities`/`fetchOwnedActivities`/`isLoadingOwned`/`ownedError` to `use-activity-data.ts`
6. Add "Owned Activities" tab to `page.tsx`
7. Fix Root Create button gate: `hasPerm('kpi_activity:root_request') && hasPerm('corporate_kpi:read')`
8. Split My Activities callbacks: pass `onCreateChild` only (remove `onUpdate`/`onCancel`)
9. Pass `onUpdate`/`onCancel` to Owned Activities tab's ActivityTable
10. Remove `isSelf` "(You)" label from `activity-form-modal.tsx`
11. Add empty direct-subordinate message to `activity-form-modal.tsx`
12. Add root assignee helper text to `activity-form-modal.tsx`
13. Add 4 new error codes to `activity-error-mapper.ts`
14. Add `ACTIVITY_TARGET_NOT_DIRECT_SUBORDINATE` mapping; keep `NOT_SUBORDINATE` for other endpoints
15. Display `requestedByUserName` in request detail modal (activity detail unchanged — no owner data)
16. Run focused tests (4–8 tests)
17. TypeScript: `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"`
18. Changed-file ESLint: `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"src/modules/hr/kpi/activity\" \"src/app/(main)/hr/kpi/activities\" \"src/modules/hr/kpi/sidebar.ts\""`

### P2R.2 — Final Reverification

1. Run focused tests: `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPatterns=activity --no-coverage"`
2. Run full Jest: `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --no-coverage"`
3. Changed-file ESLint (all modified files)
4. Full lint: `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."`
5. Production build: `cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"`
6. Update `docs/testing/2026-07-24-kpi-frontend-p2-activity-verification.md`
7. Replace smoke-test checklist with §15 checklist
8. Mark smoke checklist `PENDING USER EXECUTION`

### No P2R.3

The two-phase structure covers all changes. No additional phase needed.

---

## 19. Risks

### 19.1 RESOLVED — No Owned-Activities Endpoint ✓

`GET /api/v1/kpi-activities/owned` exists. ADMIN Creators can list owned roots.

### 19.2 RESOLVED — No Capability Fields in KpiActivityResponse ✓

Capability booleans are not required. Tab semantics (My = assignee, Owned = owner) provide the capability distinction. Backend is always authoritative.

### 19.3 Non-Blocking — isSelf Always False

**Impact**: `isSelf` field is dead data. Remove UI usage; keep type field.

### 19.4 Non-Blocking — Sidebar Gate Update

**Impact**: If left unchanged, ADMIN Creators with only `kpi_activity:root_request` cannot access the Activities page. Add to sidebar gate.

### 19.5 Non-Blocking — Detail Access Gap for Root-Only Account

If ADMIN Creator has only `kpi_activity:root_request` (not `kpi_activity:read` or `kpi_activity:request`), they can see Owned Activities and My Requests lists, but cannot open activity detail (`GET /{id}` requires `kpi_activity:read` or `kpi_activity:approve`) or request detail (`GET /requests/{id}` requires `kpi_activity:request` or `kpi_activity:approve`). In practice, the seeded ADMIN role always includes all KPI permissions, so this is a theoretical edge case. No frontend workaround needed — document as accepted backend limitation.

### 19.6 Confirmed Backend Contracts (No Risk)

- Endpoint paths and methods — unchanged
- Request DTO fields — unchanged (except permission annotations)
- Approval flow — unchanged
- Maker-checker — unchanged
- Response DTO shape — unchanged (no new fields)

---

## 20. Verification Commands (Windows CMD)

```bash
# TypeScript
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"

# Focused contract tests (P2R.1)
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPatterns=activity --no-coverage"

# Full Jest (P2R.2 only)
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --no-coverage"

# Changed-file ESLint
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"src/modules/hr/kpi/activity\" \"src/app/(main)/hr/kpi/activities\" \"src/modules/hr/kpi/sidebar.ts\""

# Full lint
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."

# Production build
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
```

---

## 21. Definition of Done

### P2R.1

- [ ] `KPI_ACTIVITY_ROOT_REQUEST` in `permissions.ts`
- [ ] Sidebar gate includes `kpi_activity:root_request`
- [ ] Page guard (`page.tsx`) includes `kpi_activity:root_request`
- [ ] `getOwnedActivities()` in `activity-api.ts`
- [ ] `ownedActivities` in hook + `page.tsx`
- [ ] Owned Activities tab in `page.tsx`
- [ ] Root Create button gated on `kpi_activity:root_request` AND `corporate_kpi:read`
- [ ] My Activities: Create Child only (no Update/Cancel)
- [ ] Owned Activities: Update + Cancel on ACTIVE rows
- [ ] 4 new error codes mapped in `activity-error-mapper.ts`
- [ ] `isSelf` "(You)" label removed
- [ ] Empty direct-subordinate message added
- [ ] Root assignee helper text added
- [ ] TypeScript: zero errors
- [ ] Focused contract tests pass (4–8 tests)
- [ ] Changed-file ESLint: zero new errors
### P2R.2

- [ ] Full Jest: all tests pass
- [ ] Full lint: zero new errors
- [ ] Production build succeeds
- [ ] Verification document updated
- [ ] New smoke checklist marked `PENDING USER EXECUTION`

### Plan Status

**`READY FOR REVIEW`**

All previous blockers are resolved:
1. `GET /api/v1/kpi-activities/owned` — endpoint exists, returns exact-owner activities, root-owner and child-owner both covered.
2. Capability booleans not required — tab semantics (`/my` = assignee → Create Child, `/owned` = owner → Update/Cancel) are the capability discriminator.

---

## 22. Tab Access for Root-Only ADMIN Creator

| Screen | Required Permission | Has it? | Result |
|---|---|---|---|
| Activities sidebar | `kpi_activity:read` OR `kpi_activity:request` OR `kpi_activity:root_request` | ✅ `root_request` | **Visible** (after sidebar update) |
| My Activities tab | `kpi_activity:read` | Only if ADMIN has all perms | For root-only ADMIN: tab hidden or empty |
| Managed Activities tab | `kpi_activity:read` | Only if ADMIN has all perms | For root-only ADMIN: tab hidden or empty |
| Owned Activities tab | `kpi_activity:root_request` OR `kpi_activity:request` | ✅ `root_request` | **Visible** — shows owned roots |
| My Requests tab | `kpi_activity:request` OR `kpi_activity:root_request` | ✅ `root_request` | **Visible** |
| Create Activity button | `kpi_activity:root_request` AND `corporate_kpi:read` | ✅ Both (seeded ADMIN) | **Visible** |
| Activity detail modal (`GET /{id}`) | `kpi_activity:read` OR `kpi_activity:approve` | ❌ Neither | **NOT accessible** with `root_request` alone |
| Request detail modal (`GET /requests/{id}`) | `kpi_activity:request` OR `kpi_activity:approve` | ❌ Neither | **NOT accessible** with `root_request` alone |

In practice, the seeded ADMIN role includes ALL KPI permissions (`read`, `request`, `root_request`, `approve`, `corporate_kpi:read`), so a seeded ADMIN user always has full detail access. The `root_request`-only scenario is a theoretical edge case that the backend does not support for detail access.

---

## 23. Exclusions

This remediation plan explicitly excludes:

- P3 Reports implementation
- Evidence upload / report review
- KPI Overview enhancements
- Dashboard widgets
- Backend code changes (backend is complete and authoritative)
- Organization hierarchy changes
- New npm dependencies
- React Query migration
- Global state management
- Generic workflow engine
- Speculative tests beyond §17
- Smoke test execution (planning only)
- Commit creation (planning only — STOP after writing this document)
