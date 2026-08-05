# KPI Frontend P3 — Activity Reports + Review Implementation Plan

> **Status:** READY FOR IMPLEMENTATION
> **Phase:** P3 (Activity Reports + Report Review)
> **Predecessor:** P2 — KPI Activity + Approval (complete)

---

## 1. Objective and P3 Boundaries

Complete `/hr/kpi/reports` (placeholder shell) with:

- **Submit Report** — multipart form creating a PENDING execution report with exactly one required photo evidence for an ACTIVE activity assigned to the current user.
- **My Reports** — list of reports submitted by the current user, with detail modal and authenticated evidence preview.
- **Review Queue** — list of PENDING reports whose designated reviewer is the current user, with approve/reject.

**Canonical terms:** Reports, Execution Reports, Review Queue, Activities, Corporate KPI.
**Forbidden:** `KpiTask`, `Kinerja Tim`, `Kinerja Individu`, `Admin KPI`.

---

## 2. Source-Verified Backend Contracts

### 2.1 Endpoint Matrix

| # | Method | Path | Permission | Request | Response | Success |
|---|---|---|---|---|---|---|
| 1 | POST | `/api/v1/kpi-reports` | `kpi_report:submit` | multipart: `report` (JSON Blob) + `evidence` (file) | `ApiResponse<KpiReportResponse>` | 201 |
| 2 | GET | `/api/v1/kpi-reports/my` | `kpi_report:read` | — | `ApiResponse<KpiReportResponse[]>` (ORDER BY createdAt DESC) | 200 |
| 3 | GET | `/api/v1/kpi-reports/to-review` | `kpi_report:review` | — | `ApiResponse<KpiReportResponse[]>` (ORDER BY createdAt ASC) | 200 |
| 4 | GET | `/api/v1/kpi-reports/{id}` | `kpi_report:read` **or** `kpi_report:review` | — | `ApiResponse<KpiReportResponse>` | 200 |
| 5 | GET | `/api/v1/kpi-reports/{id}/evidence` | `kpi_report:read` **or** `kpi_report:review` | — | Binary (inline Content-Disposition) | 200 |
| 6 | PATCH | `/api/v1/kpi-reports/{id}/approve` | `kpi_report:review` | No body | `ApiResponse<KpiReportResponse>` | 200 |
| 7 | PATCH | `/api/v1/kpi-reports/{id}/reject` | `kpi_report:review` | `{ rejectionReason }` (max 1000 chars) | `ApiResponse<KpiReportResponse>` | 200 |

### 2.2 Key Fields (KpiReportResponse)

| Field | Source | Display |
|---|---|---|
| `reviewerUserName` | reviewer's `CoreUser.fullName` | **Reviewer** column — always populated (designated reviewer) |
| `submittedByUserName` | submitter's `CoreUser.fullName` | **Submitted By** column |
| `reviewedBy` | UUID only | Do **not** display |
| `realizedValue` | BigDecimal (incremental) | Report value |
| `activityTargetValue` | BigDecimal | Activity target |

No `progressPercent` in report DTO. No `reviewedByUserName`.

### 2.3 Business Rules

- **Duplicate PENDING**: `idx_unique_pending_report WHERE status = 'PENDING'` — only one PENDING per activity. After REJECTED or APPROVED, new PENDING can be submitted.
- **Evidence**: Exactly one file; MIME must be `image/jpeg`, `image/png`, `image/webp`; max 5 MB.
- **Realized value**: Incremental. Backend sums approved reports for Activity `realizedValue`.
- **Reviewer resolution** (`KpiReportServiceImpl.resolveReviewer()`):
  - Root: reviewer = ADMIN Creator UserPosition from APPROVED CREATE request
  - Child: reviewer = parent Activity assignee
  - Grandchild: reviewer = grandparent (Child) Activity assignee

### 2.4 Auth Contract

Login: `POST /api/v1/auth/login` with `{ login: <email>, password }`.
Response: `{ data: { accessToken, refreshToken, username, email, roles, permissions } }`.
No `fullName` or user `id` in auth response.
Refresh: `POST /api/v1/auth/refresh` with `{ refreshToken }` returns same shape.
Storage: `refreshToken` in `localStorage` key `refreshToken`. `accessToken` in Zustand memory.
Bootstrap: `initAuth()` reads localStorage → calls refresh → populates Zustand.

Current-user identity (`fullName`, `id`): obtained via `GET /api/v1/users?email=<account email>` (requires `user:read`). Admin accounts have this permission.

---

## 3. Final Reports Capability Rules (Sidebar + Page)

### 3.1 Capability Definitions

Three independent capabilities:

```typescript
const canReadMyReports = perms.includes('kpi_report:read');
const canReviewReports = perms.includes('kpi_report:review');
const canSubmitReport = perms.includes('kpi_report:submit') && perms.includes('kpi_activity:read');
```

**Reports is usable when any of the three is true.**

### 3.2 Sidebar Implementation

The `SidebarItem` interface is extended with an optional `capability?: (permissions: string[]) => boolean` callback in `src/modules/hr/sidebar.ts`. When present, it overrides the `permissions` array check. When absent, the existing `permissions.some()` behavior applies unchanged.

```typescript
// src/modules/hr/kpi/sidebar.ts
{
  title: 'Reports',
  href: KPI_ROUTES.reports,
  icon: Article,
  module: 'hr',
  group: 'KPI',
  capability: (perms: string[]) =>
    perms.includes('kpi_report:read') ||
    perms.includes('kpi_report:review') ||
    (perms.includes('kpi_report:submit') && perms.includes('kpi_activity:read')),
}
```

This is a single-item extension — not a generic authorization framework.

### 3.3 Page Guard (same rule)

The page component calculates the same three booleans from `usePermission()` and:
- If none → Access Denied (Alert)
- If at least one → render page content

### 3.4 Tab and Action Visibility

| Element | Gate |
|---|---|
| My Reports tab | `canReadMyReports` |
| Review Queue tab | `canReviewReports` |
| Submit Report button | `canSubmitReport` |

### 3.5 Default Tab

First existing tab in order: My Reports → Review Queue. If neither tab exists but `canSubmitReport` is true → render submit-focused page with Submit button, no tabs, no endpoint calls for My Reports or Review Queue.

### 3.6 Post-Submit Refresh

```typescript
if (canReadMyReports) {
  await fetchMyReports();  // refresh tab
} else {
  // close modal, show success toast, do NOT call GET /kpi-reports/my
}
```

---

## 4. Test Accounts and Permission Preflight

All six accounts authenticated via `ERP_E2E_PASSWORD`. Emails may be documented; password, tokens, cookies never in source, artifacts, logs, or Git history.

| Account | Required Permission Subset | Used For |
|---|---|---|
| `admin@erp.com` | `kpi_activity:root_request`, `kpi_activity:read`, `kpi_activity:request`, `kpi_activity:approve`, `corporate_kpi:read`, `corporate_kpi:create`, `corporate_kpi:update`, `kpi_report:read`, `kpi_report:submit`, `kpi_report:review`, `user:read` | Fixture creation, Root reviewer, CK creation, user lookup |
| `admin_2@erp.com` | `kpi_activity:approve`, `kpi_activity:read`, `kpi_report:review` | Activity approver; Negative reviewer control (has review perm, not the Root creator) |
| `dirut@erp.com` | `kpi_activity:read`, `kpi_activity:request`, `kpi_report:submit`, `kpi_report:read`, `kpi_report:review` | Root assignee, Child reviewer |
| `manager_hr@erp.com` | `kpi_activity:read`, `kpi_activity:request`, `kpi_report:submit`, `kpi_report:read`, `kpi_report:review` | Child assignee, Grandchild reviewer |
| `staff_hr@erp.com` | `kpi_activity:read`, `kpi_report:submit`, `kpi_report:read` | Grandchild assignee |
| `manager_hr_2@erp.com` | `kpi_activity:read`, `kpi_report:read`, `kpi_report:review` | Negative control (has review perm, no fixture reports in queue). Does NOT need `kpi_report:submit` or `corporate_kpi:read` — Submit and Activity selector scenarios are not tested with this account. |

P3.0 checks each account's `permissions` array contains at least the listed subset. Additional permissions are allowed.

**No zero-permission runtime account exists.** The Access Denied scenario for a user with no report capabilities is covered by `report-page.test.tsx` unit test only.

---

## 5. Concrete Playwright Auth Strategy

**Strategy: UI login.** Exact steps verified against source.

### 5.1 Login Contract (Source: `login/page.tsx`)

- Route: `/login`
- Email field: `<Input name="username">` (placeholder "Enter email or NIP")
- Password field: `<Input type="password">`
- Submit: `<Button type="submit">Sign In</Button>`
- On success: navigates to `/` (router.push('/'))

### 5.2 Bootstrap (Source: `auth-store.ts`, `token-service.ts`)

On navigating to `/`, `AuthGuard` component calls `initAuth()`. This reads `localStorage['refreshToken']` → calls `POST /api/v1/auth/refresh` with `{ refreshToken }` → response sets `accessToken` in Zustand memory → user is authenticated.

### 5.3 Current-User Identity (fullName, id)

No `/me` or `/profile` endpoint. Use `GET /api/v1/users?email=<email>` (requires `user:read`) to obtain user `id` and `fullName`. Admin accounts have this permission. The preflight fetches this for all 6 accounts.

Alternative for non-admin accounts: Use `GET /api/v1/kpi-activities/my` or other endpoints that include `assignedToUserName` in responses — but the user listing approach is simpler and works for all.

### 5.4 Storage State Generation (`e2e/auth.setup.ts`)

```typescript
import { chromium, test as setup } from '@playwright/test';
import { loginAs } from './helpers/login-helper';

const ACCOUNTS = [
  'admin', 'admin-2', 'dirut', 'manager-hr', 'manager-hr-2', 'staff-hr',
];

setup('authenticate all accounts', async () => {
  const browser = await chromium.launch();
  for (const slug of ACCOUNTS) {
    const email = slugToEmail(slug);  // slug → email mapping
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await page.fill('[name="username"]', email);
    await page.fill('[name="password"]', process.env.ERP_E2E_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('**');  // navigates away from /login
    await context.storageState({ path: `e2e/.auth/${slug}.json` });
    await context.close();
  }
  await browser.close();
});
```

Storage state files: `e2e/.auth/{admin,admin-2,dirut,manager-hr,manager-hr-2,staff-hr}.json`
- Generated at runtime by Playwright global setup
- Gitignored (`e2e/.auth/`)
- Never committed
- Overwritten every run
- Never logged or referenced in docs

### 5.5 Multi-User Scenarios

Use `browser.newContext({ storageState })` to switch accounts within a test.

```typescript
test('Root approval scenario', async ({ browser }) => {
  const dirut = await browser.newContext({ storageState: 'e2e/.auth/dirut.json' });
  const dirutPage = await dirut.newPage();
  // ... dirut submits ...
  await dirut.close();

  const admin = await browser.newContext({ storageState: 'e2e/.auth/admin.json' });
  const adminPage = await admin.newPage();
  // ... admin reviews ...
  await admin.close();
});
```

### 5.6 Artifact Safety

- `screenshot: only-on-failure`
- `video: off`
- `trace: off`
- Gitignore: `playwright-report/`, `test-results/`, `e2e/.auth/`, `*.zip`
- Local debug traces: delete before commit

---

## 6. Fixture Isolation and Strict Cascading

### 6.1 Activity Chain (3 independent roots)

Using prefix `E2E-P3-<ts>-<rand>`:

```
Root A (→ dirut)   Root B (→ dirut)   Root C (→ dirut)
   │                     │                    │
Child A (→ mgr_hr)   Child B (→ mgr_hr)   Child C (→ mgr_hr)
   │                     │                    │
Gndchld A (→ staff)   Gndchld B (→ staff)  Gndchld C (→ staff)
```

Each created via P2 API requests. All requests approved by `admin_2@erp.com`. Strict cascading enforced — no self, no peer, no skip-level, no back-to-creator assignments.

### 6.2 Scenario-to-Fixture Mapping

| Scenario | Activity | Lifecycle |
|---|---|---|
| B. Root approval | Root A | submit → PENDING → approve → APPROVED |
| C. Child rejection | Child A | submit → PENDING → reject → REJECTED |
| D. Post-rejection | Child A (same) | REJECTED existing → submit new → PENDING → approve → APPROVED |
| E. Grandchild approval | Grandchild A | submit → PENDING → approve → APPROVED |
| F. Negative branch | Root B | submit as dirut → manager_hr_2 checks queue (absent) |
| G. Evidence valid | Child B | submit → verify evidence loads |
| G. Evidence invalid | Child C | submit fails client-side validation |
| G. Evidence oversized | Root C | submit fails client-side validation |
| H. Duplicate PENDING | Grandchild B | submit → success; re-submit → failure |

### 6.3 Corporate KPI

**Strategy A (preferred):** `GET /api/v1/corporate-kpis/tree?year=<current>` — find existing ACTIVE INDICATOR.

**Strategy B (backup):** Create via `POST /api/v1/corporate-kpis` (confirmed contract from `corporate-kpi-api.ts:27-33`) with `{ code, name, nodeType: 'ASPECT', year, parentId: null }` → record ID → `POST /api/v1/corporate-kpis` with `{ ..., nodeType: 'INDICATOR', parentId: <aspectId>, targetValue: 100 }` → `PATCH /api/v1/corporate-kpis/{id}/status` with `{ status: 'ACTIVE' }`.

All requests as `admin@erp.com`. If both fail: `BLOCKED — NO ELIGIBLE CORPORATE KPI INDICATOR`.

### 6.4 Hierarchy Preflight

- `dirut.position.parent == null` (top-level) — verified. If not: `BLOCKED`.
- `manager_hr.position.parent == dirut.position.id` — verified.
- `staff_hr.position.parent == manager_hr.position.id` — verified.
- `manager_hr_2.position` is NOT in the above chain.
- `admin@erp.com` and `admin_2@erp.com` — no parent relationship needed; reviewer ownership comes from CREATE request.

### 6.5 Fixture-Scoped Assertions

All assertions use fixture-specific identifiers (Activity ID, report ID, prefix string `E2E-P3-*`), not global counts.

Correct: "The fixture report (ID: <...>) is absent from admin_2's Review Queue."
Incorrect: "The Review Queue is empty."

Negative checks assert absence of the specific fixture report, not the entire dataset.

---

## 7. Reviewer Chain (Source-Verified)

```
Root report:   dirut@erp.com submits  →  admin@erp.com reviews
Child report:  manager_hr@erp.com submits  →  dirut@erp.com reviews
Grandchild:    staff_hr@erp.com submits  →  manager_hr@erp.com reviews
```

`admin_2@erp.com` approves Activity requests but is NOT automatically the Root report reviewer. Verified by `resolveReviewer()` which uses the ADMIN Creator's UserPosition, not the approver's.

---

## 8. Page UX Design

```
/hr/kpi/reports
├── Header: "Execution Reports" + description
├── Submit Report button (canSubmitReport)
├── Tabs (if any):
│   ├── My Reports (canReadMyReports) — default
│   └── Review Queue (canReviewReports)
│   (if no tab → submit-focused page with Submit button, no endpoint calls)
```

### My Reports tab

Table: Activity Name, Report Date, Realized Value + Unit, Reviewer (`reviewerUserName`), Status (badge), Submitted, Detail (Eye).
Detail modal: activity context, report fields, rejection reason (when REJECTED), evidence blob preview.

### Review Queue tab

Table: Activity Name, Submitted By (`submittedByUserName`), Report Date, Realized Value + Unit, Status (PENDING), Submitted, Detail.
Review detail: activity context + target/unit, evidence preview, Approve (confirmation → PATCH), Reject (required reason max 1000 → PATCH).

---

## 9. Submission Workflow

### Activity Selector

- Source: `GET /api/v1/kpi-activities/my` (requires `kpi_activity:read`)
- Client-side filter: `status === 'ACTIVE'`

### Multipart Construction

```typescript
const fd = new FormData();
fd.append('report', new Blob([JSON.stringify(payload)], {type:'application/json'}));
fd.append('evidence', evidenceFile);
await api.post('/api/v1/kpi-reports', fd);
```

No manual `Content-Type`. Browser + axios interceptor handle boundary.

### Form Validation (Zod)

```typescript
z.object({
  activityId: z.string().uuid(), reportDate: z.string().min(1),
  executionDescription: z.string().min(1).max(2000),
  realizedValue: z.number().positive(),
  note: z.string().max(1000).optional(),
  evidenceFile: z.instanceof(File).refine(f=>['image/jpeg','image/png','image/webp'].includes(f.type))
    .refine(f=>f.size <= 5*1024*1024),
});
```

---

## 10. Evidence Preview

Via Axios blob fetch — no raw `<img src="/api/...">`.

```typescript
const resp = await api.get(`/api/v1/kpi-reports/${reportId}/evidence`, {responseType:'blob'});
const url = URL.createObjectURL(resp.data);
// <img src={url} /> — revoke on unmount
```

---

## 11. Complete File Inventory

### CREATE (19 files)

```
playwright.config.ts

e2e/
├── auth.setup.ts                       # Global Playwright setup — all 6 accounts
├── helpers/
│   ├── accounts.ts                     # Account email/slug/display-name definitions
│   ├── api-client.ts                   # Authenticated API request helper
│   ├── environment-guard.ts            # Environment safety check
│   └── login-helper.ts                 # UI login interaction
├── fixtures/
│   └── p3-fixture-factory.ts           # CK lookup/create, Activity chain creation
├── preflight/
│   └── p3-preflight.spec.ts            # P3.0 preflight E2E spec
└── reports/
    └── p3-reports.spec.ts              # All P3 E2E scenarios

src/modules/hr/kpi/report/
├── report.types.ts
├── report-api.ts
├── report-error-mapper.ts
├── use-report-data.ts
├── report-submit-modal.tsx
├── report-table.tsx
├── report-detail-modal.tsx
├── report-review-dialog.tsx
└── __tests__/
    ├── report-api.test.ts
    └── report-page.test.tsx

docs/testing/<date>-kpi-frontend-p3-reports-verification.md
```

### MODIFY (6 files)

```
src/app/(main)/hr/kpi/reports/page.tsx          # Replace placeholder
src/modules/hr/kpi/sidebar.ts                    # Add capability callback to Reports item
src/modules/hr/sidebar.ts                        # Add optional capability to SidebarItem
src/modules/hr/kpi/__tests__/page-shells.test.tsx
src/modules/hr/kpi/__tests__/sidebar.test.ts     # Update for new capability field
package.json                                     # Add Playwright scripts
package-lock.json                                # Regenerated by npm install
.gitignore                                       # Add E2E artifact patterns
```

### REMOVE

None.

### DEFER

None.

---

## 12. Implementation Phases

### P3.0 — Automated preflight and fixture tooling

**Files:** All E2E infrastructure: `playwright.config.ts`, `e2e/auth.setup.ts`, `e2e/helpers/*`, `e2e/fixtures/p3-fixture-factory.ts`, `e2e/preflight/p3-preflight.spec.ts`. Also `package.json`, `package-lock.json`, `.gitignore`.

**Scope:**
- Playwright installation, root config, gitignore, npm scripts
- Login helper, environment guard, accounts definitions, API client helper
- Fixture factory: log in all 6, verify permissions, verify hierarchy, find/create CK, create/approve A/B/C chains
- Preflight spec: runs all checks, creates fixtures, reports result
- Sidebar `SidebarItem` interface extension + Reports `capability`

**Changed-file lint:**
```
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"playwright.config.ts\" \"e2e\" \"src/modules/hr/sidebar.ts\" \"src/modules/hr/kpi/sidebar.ts\""
```

**Executable preflight command:**
```
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run test:e2e:preflight"
```

This command actually:
1. Validates environment guard (localhost/127.0.0.1 or `ERP_E2E_ALLOW_REMOTE_TEST=true`)
2. Verifies frontend + API reachability
3. Authenticates all 6 accounts
4. Inspects permissions, UserPositions, hierarchy
5. Verifies `dirut.position.parent == null`
6. Verifies negative-reviewer accounts can access Review Queue
7. Locates or creates Corporate KPI Indicator
8. Creates + approves Root A, Child A, Grandchild A (verifies ownership)
9. Creates + approves Root B/C, Child B/C, Grandchild B/C
10. Verifies `/my`, `/owned`, and reviewer semantics

**Outcome:** `READY — AUTOMATED FIXTURES VERIFIED` or `BLOCKED — <reason>`.

**Commit:** `feat(kpi): add P3 automated preflight and fixture tooling`

### P3.1 — Report read views

**Files:** `report.types.ts`, `report-api.ts`, `report-error-mapper.ts`, `use-report-data.ts`

**Tests:** `report-api.test.ts`

**Changed-file lint:**
```
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"src/modules/hr/kpi/report\""
```

**Verification:** TypeScript + focused Jest + ESLint.

**Commit:** `feat(kpi): add P3 report types, API, error mapper, data hook`

### P3.2 — Report submission

**Files:** `report-submit-modal.tsx`

**Scope:** Activity selector, RHF+Zod, multipart FormData, evidence validation, post-submit refresh logic.

**Changed-file lint:** Same as P3.1.

**Verification:** Same as P3.1.

**Commit:** `feat(kpi): add P3 report submission modal`

### P3.3 — Report review

**Files:** `report-table.tsx`, `report-detail-modal.tsx`, `report-review-dialog.tsx`

**Scope:** Shared table (MY|TO_REVIEW), detail + evidence (MY|REVIEW), approve/reject (APPROVE|REJECT).

**Changed-file lint:** Same as P3.1.

**Verification:** TypeScript + focused Jest + ESLint + production build.

**Commit:** `feat(kpi): add P3 report tables, detail modal, review dialog`

### P3.4 — Page integration + E2E + final verification

**Files:** `page.tsx`, `page-shells.test.tsx`, `e2e/reports/p3-reports.spec.ts`, verification doc

**Scope:**
- Replace reports placeholder with capability-aware tabs + submit page
- Page guard (same capability rule as sidebar)
- Post-submit conditional refresh
- All E2E scenarios (B–H)

**Tests:** `report-page.test.tsx`, `e2e/reports/p3-reports.spec.ts`

**Changed-scope lint (separate from full lint):**
```
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"src/modules/hr/kpi/report\" \"src/app/(main)/hr/kpi/reports\" \"src/modules/hr/kpi/sidebar.ts\" \"src/modules/hr/sidebar.ts\" \"playwright.config.ts\" \"e2e\""
```

**Final gates (run once):**
```
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --no-coverage"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run test:e2e:reports"
```

**Lint reporting:**
- P3 changed scope: zero new errors and warnings.
- Full project (`npx eslint .`): pre-existing unrelated issues documented separately — not P3 regressions.

**Commit:** `feat(kpi): integrate P3 reports page with E2E acceptance`

---

## 13. Thin Frontend Tests

### `report-api.test.ts` (8 tests)

| # | Test |
|---|---|
| 1 | `POST /api/v1/kpi-reports` — URL, FormData: parts `report`+`evidence`, no manual Content-Type |
| 2 | `GET /api/v1/kpi-reports/my` — URL, ApiResponse unwrap |
| 3 | `GET /api/v1/kpi-reports/to-review` — URL, ApiResponse unwrap |
| 4 | `GET /api/v1/kpi-reports/{id}` — URL with UUID, unwrap |
| 5 | `GET /api/v1/kpi-reports/{id}/evidence` — URL, `responseType:'blob'` |
| 6 | `PATCH /api/v1/kpi-reports/{id}/approve` — URL, no body |
| 7 | `PATCH /api/v1/kpi-reports/{id}/reject` — URL, `{ rejectionReason }` payload |
| 8 | Error propagation — each method throws on axios rejection |

### `report-page.test.tsx` (6 tests)

| # | Test |
|---|---|
| 1 | No report permissions → Access Denied |
| 2 | `kpi_report:read` only → My Reports visible, Review Queue + Submit hidden |
| 3 | `kpi_report:review` only → Review Queue visible, My Reports + Submit hidden |
| 4 | `canSubmitReport` (submit+activity:read) only → Submit button visible, no tabs, no endpoint calls |
| 5 | All three → both tabs + Submit visible |
| 6 | Default tab is first permitted tab |

---

## 14. Playwright Scripts (`package.json`)

```json
{
  "test:e2e": "playwright test",
  "test:e2e:preflight": "playwright test e2e/preflight --project=chromium",
  "test:e2e:reports": "playwright test e2e/reports --project=chromium"
}
```

Config at root `playwright.config.ts` — normal Playwright commands resolve without `--config`.

---

## 15. Error Mapping (Known Backend → English)

| Backend | User-Facing |
|---|---|
| `Activity not found` | The selected activity could not be found or is no longer available. |
| `Activity is not active` | The selected activity is no longer active. |
| `FORBIDDEN` (not assignee) | You can only submit reports for activities assigned to you. |
| `Report date must be within the activity period` | The report date must be within the activity's assigned period. |
| `A pending report already exists` | A pending report already exists for this activity. |
| `Photo evidence is required` | Photo evidence is required. |
| `Evidence must be an image (JPEG, PNG, or WebP)` | Evidence must be a JPEG, PNG, or WebP image. |
| `Report not found` | The report could not be found. |
| `Report has already been processed` | This report has already been processed. |
| `Cannot review your own report` | You cannot review your own report. |
| `Not the designated reviewer` | You are not the designated reviewer for this report. |
| `Evidence file not found` | The evidence file could not be found on the server. |
| *(other)* | An unexpected error occurred. Please try again. |

No SQL, Java class names, stack traces, or constraint names exposed.

---

## 16. Definition of Done

- [ ] P3.0 preflight (`npm run test:e2e:preflight`) passes — all 6 accounts authenticated, permissions verified, hierarchy verified, fresh Activity chain created
- [ ] API contracts match backend (methods, paths, part names, payloads)
- [ ] Multipart: `report` (JSON Blob) + `evidence` (file), no manual Content-Type
- [ ] Exactly one evidence image enforced (client-side + backend)
- [ ] File type (JPEG/PNG/WebP) and size (5MB) validated client-side
- [ ] Reviewer chain matches strict cascading
- [ ] My Reports shows only current user's submitted reports
- [ ] Review Queue shows only reports where current user is designated reviewer
- [ ] `admin_2@erp.com` does NOT receive fixture reports (proves Activity approver ≠ report reviewer)
- [ ] `manager_hr_2@erp.com` sees zero fixture reports from other branches
- [ ] Official Activity `realizedValue` changes only after report approval
- [ ] Rejection leaves `realizedValue` unchanged
- [ ] New PENDING report can be submitted after rejection
- [ ] All E2E scenarios pass
- [ ] TypeScript: zero errors
- [ ] Contract tests (report-api): all pass
- [ ] Page tests (report-page): all pass
- [ ] Full Jest: no regressions
- [ ] P3 changed scope: ESLint-clean (zero new errors/warnings)
- [ ] Full ESLint: pre-existing issues documented separately, no P3 regressions
- [ ] Production build: succeeds
- [ ] No passwords, tokens, or credentials committed
- [ ] Verification document: no password/token exposure
- [ ] No backend code or migrations changed

---

## 17. Windows Commands

```bash
# P3.0 preflight (requires running frontend + backend)
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run test:e2e:preflight"

# TypeScript
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx tsc --noEmit"

# Focused contract tests
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --testPathPatterns=report --no-coverage"

# Full Jest
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm test -- --no-coverage"

# P3 changed-scope ESLint
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint \"src/modules/hr/kpi/report\" \"src/app/(main)/hr/kpi/reports\" \"src/modules/hr/kpi/sidebar.ts\" \"src/modules/hr/sidebar.ts\" \"playwright.config.ts\" \"e2e\""

# Full ESLint
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npx eslint ."

# Production build
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run build"

# Full E2E
cmd.exe /c "cd /d C:\Project\erp-new\erp-frontend && npm run test:e2e:reports"
```

Environment variables supplied externally without echoing secrets.

---

## 18. Verification Document

**File:** `docs/testing/<date>-kpi-frontend-p3-reports-verification.md`

**Contents:** commits, endpoints, permissions, runtime account mapping, verified hierarchy, reviewer-chain matrix, multipart contract, fixture isolation strategy, contract-test results, E2E scenario results and artifact references, TypeScript/lint/build results, known limitations, credential-security confirmation. No password, token, cookie, or storage-state content.

---

## 19. Strict Exclusions

- Production E2E. Manual data preparation. Manual smoke test.
- Visual snapshots, pixel comparisons.
- `reviewedBy` UUID displayed (use `reviewerUserName`).
- Current progress in report detail (not in DTO).
- Generic upload framework, workflow engine, global state.
- KPI Overview, dashboard, Activity redesign.
- Report edit, delete, cancel, withdraw, amendment.
- Multi-photo evidence. Backend changes.
- Error-mapper unit test; evidence-lifecycle unit test; submit-modal unit test.
- Separate approve/reject dialog files (merged into report-review-dialog.tsx with mode).
- Zero-permission runtime E2E account (covered by unit test).
- `manager_hr_2` testing Submit Report (no submit permission required).

---

## 20. Plan Verification Against Source

| Claim | Source |
|---|---|
| `reviewerUserName` available | `KpiReportResponse.java:34` |
| `reviewedBy` UUID only, no userName | `KpiReportResponse.java:41` + comment |
| `kpi_activity:read` for `GET /my` | `KpiActivityController.java:26` |
| Duplicate PENDING-only index | `V10__kpi_activity_report.sql:63-65` |
| `resolveReviewer` logic | `KpiReportServiceImpl.java:338-363` |
| Evidence inline Content-Disposition | `KpiReportController.java:100` |
| File size 5 MB | `LocalFileStorageService.java:124` |
| CK create endpoint | `corporate-kpi-api.ts:27-33` |
| CK status change | `corporate-kpi-api.ts:45-51` |
| Login endpoint | `login/page.tsx:54` — `POST /api/v1/auth/login` |
| Login response no fullName/id | `types/auth.ts:14-17` — only username, email, roles, permissions |
| Refresh bootstrap flow | `auth-store.ts:28-42`, `token-service.ts:27-46` |
| SidebarItem interface | `src/modules/hr/sidebar.ts:5-13` — has `permissions?: string[]` |
| Sidebar uses `some()` matching | `kpi-frontend` skill — sidebar permission semantics |
| No `/me` or `/profile` endpoint | `UserController.java` — only CRUD + positions-by-id endpoints |
| `fullName` in user response | `UserServiceImpl.java:110,365` — `CoreUserResponse.fullName` |
| User lookup by email | `UserController.java:36-46` — `GET /api/v1/users` with `UserFilterRequest` (includes email filter) |
