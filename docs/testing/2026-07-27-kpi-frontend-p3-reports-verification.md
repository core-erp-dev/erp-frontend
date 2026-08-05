# P3 — KPI Reports Frontend Verification

> **Status:** P3 Complete — Ready for P4
> **Manual browser acceptance:** PASS — USER EXECUTED
> **Date:** 27 July 2026

---

## 1. Implemented Commits

```
503ab07 feat(kpi): add P3 sidebar capability for compound Reports gate
c7a6db4 feat(kpi): add P3 report types, API, error mapper, data hook, and contract tests
f1a6a47 feat(kpi): add P3 report submission modal with multipart form
406debe feat(kpi): add P3 report tables, detail modal, and review dialog
ff519d0 feat(kpi): integrate P3 reports page with permission-aware tabs
```

---

## 2. Routes Implemented

| Route | Purpose |
|---|---|
| `/hr/kpi/reports` | My Reports + Review Queue (permission-aware tabs), Submit Report |

---

## 3. Reports Permissions

| Capability | Required Permission(s) |
|---|---|
| Sidebar visibility | `kpi_report:read` **OR** `kpi_report:review` **OR** (`kpi_report:submit` **AND** `kpi_activity:read`) |
| My Reports tab | `kpi_report:read` |
| Review Queue tab | `kpi_report:review` |
| Submit Report | `kpi_report:submit` **AND** `kpi_activity:read` |
| Post-submit refresh | Refresh My Reports only if user has `kpi_report:read`; otherwise toast+close only |
| Detail / Evidence | `kpi_report:read` **OR** `kpi_report:review` |

Sidebar uses a `capability` callback on `SidebarItem` — not the `permissions` array — to support compound AND/OR logic. All other sidebar items continue using the `permissions` array.

---

## 4. Endpoint Matrix

| Method | Path | Permission | Frontend |
|---|---|---|---|
| POST | `/api/v1/kpi-reports` | `kpi_report:submit` | Submit modal (multipart: `report` JSON Blob + `evidence` file) |
| GET | `/api/v1/kpi-reports/my` | `kpi_report:read` | My Reports tab |
| GET | `/api/v1/kpi-reports/to-review` | `kpi_report:review` | Review Queue tab |
| GET | `/api/v1/kpi-reports/{id}` | `kpi_report:read` or `kpi_report:review` | Report detail modal |
| GET | `/api/v1/kpi-reports/{id}/evidence` | `kpi_report:read` or `kpi_report:review` | Evidence blob (Axios `responseType:'blob'`) |
| PATCH | `/api/v1/kpi-reports/{id}/approve` | `kpi_report:review` | Approve (no body) |
| PATCH | `/api/v1/kpi-reports/{id}/reject` | `kpi_report:review` | Reject (`{ rejectionReason }`) |

### List Ordering

- `GET /my`: `ORDER BY r.createdAt DESC` (newest first)
- `GET /to-review`: `ORDER BY r.createdAt ASC` (oldest first — FIFO queue)

---

## 5. Verified Runtime Account and Hierarchy Mapping

### Account Credential Safety

All accounts share one password read from `ERP_E2E_PASSWORD`. Passwords, tokens, cookies, and Authorization headers are never stored in committed files.

### User Identity

| Account | ID | Display Name (fullName) |
|---|---|---|
| admin@erp.com | `11111111-1111-4111-a111-111111111111` | Administrator |
| admin_2@erp.com | `e2382619-fd3c-4734-91cd-27a190ac2b8a` | Administrator 2 |
| dirut@erp.com | `93358a4e-a758-4e5a-9083-62b49215f948` | Dira Pratama |
| manager_hr@erp.com | `9379dcb3-f2a7-4d33-9caf-b10e3c4207c3` | Andi Saputra |
| manager_hr_2@erp.com | `9388efd3-9a34-4fd1-acac-cae11c38cfcf` | Budi Santoso |
| staff_hr@erp.com | `0111b902-264c-4173-8df1-6cfda2d07dea` | Siti Rahma |

### Runtime Permissions

| Account | Report Perms | Activity Perms | Notes |
|---|---|---|---|
| admin@erp.com | read, submit, review | all (root_request, request, read, approve) | ADMIN role; 35 total perms |
| admin_2@erp.com | read, submit, review | all (root_request, request, read, approve) | EMPLOYEE role; 35 total perms |
| dirut@erp.com | read, submit, review | request, read, approve | 16 total perms |
| manager_hr@erp.com | read, submit, review | request, read | 8 total perms |
| manager_hr_2@erp.com | read, submit, review | request, read | 8 total perms (shares Manager HR position) |
| staff_hr@erp.com | read, submit | request, read | 7 total perms (no review) |

### Organizational Hierarchy (Verified from Runtime DB)

| Position | Parent | Occupants |
|---|---|---|
| Administrator (`a0000000-...`) | `null` (top-level) | admin@erp.com, admin_2@erp.com |
| Administrator Organisasi (`0d46c1b0-...`) | `null` (top-level) | org_admin@erp.com |
| **Direktur Utama** (`4afeb6b9-...`) | **`null` (top-level)** | **dirut@erp.com** |
| Manager Finance (`4c09f5c1-...`) | Direktur Utama | — |
| **Manager HR** (6ece9130-...) | **Direktur Utama** | **manager_hr@erp.com, manager_hr_2@erp.com** |
| Staff Finance (`bdd4f4f6-...`) | Manager Finance | staff_finance@erp.com |
| **Staff HR** (`4bf1c9ce-...`) | **Manager HR** | **staff_hr@erp.com** |

Key findings:
- `dirut@erp.com` (Direktur Utama) is **top-level** (`parent = null`) — required for Root Activity creation ✓
- `manager_hr@erp.com` (Manager HR) is a **direct subordinate** of dirut's position ✓
- `staff_hr@erp.com` (Staff HR) is a **direct subordinate** of manager_hr's position ✓
- `manager_hr` and `manager_hr_2` **share the same Position** (Manager HR) but have distinct UserPositions — the reviewer resolution uses exact UserPosition

---

## 6. Fixture Strategy

### Prefix

```
E2E-P3-1785132675
```

### Activity Chain (Created via P2 API, approved by admin_2@erp.com)

| Activity | ID | Creator | Assignee |
|---|---|---|---|
| Root A | `f3e7aedf-6a22-455e-9549-3fc04df59f49` | admin@erp.com | dirut@erp.com |
| Root B | `0924b653-6eff-42e7-993b-ea2222e1a5fc` | admin@erp.com | dirut@erp.com |
| Root C | `e14371a1-5f09-44f4-a7f3-62ea2bef2781` | admin@erp.com | dirut@erp.com |
| Child A | `45c502ce-3eb8-4e85-9b09-4224ed669d1c` | dirut@erp.com | manager_hr@erp.com |
| Child B | `3fa1a1b1-5179-4e9c-ba18-38d602e40994` | dirut@erp.com | manager_hr@erp.com |
| Child C | `0f5442ff-62f9-4e7d-ba56-17db2c70976e` | dirut@erp.com | manager_hr@erp.com |
| Grandchild A | `b98e0ffc-2177-4d02-93af-daf81fe42952` | manager_hr@erp.com | staff_hr@erp.com |
| Grandchild B | `2b1a42a3-c295-4094-a1d6-686027f3d104` | manager_hr@erp.com | staff_hr@erp.com |
| Grandchild C | `d2a1f4d8-17b2-43f1-b8d1-f93be81602da` | manager_hr@erp.com | staff_hr@erp.com |

### Corporate KPI

Used existing ACTIVE INDICATOR: `ROE` (Return on Equity, ID `47f646db-8f98-4585-a0c2-e4db4194e0b8`), under FIN (Aspek Keuangan) aspect.

---

## 7. Reviewer Chain (Source-Verified from Backend)

| Report | Submitter | Reviewer | Not Reviewer | Backend Rule |
|---|---|---|---|---|
| Root | dirut@erp.com | admin@erp.com | admin_2@erp.com | Reviewer = ADMIN Creator UserPosition from APPROVED CREATE request |
| Child | manager_hr@erp.com | dirut@erp.com | — | Reviewer = parent (Root) Activity assignee |
| Grandchild | staff_hr@erp.com | manager_hr@erp.com | dirut, admin, admin_2 | Reviewer = parent (Child) Activity assignee |

---

## 8. Multipart Contract

- Parts: `report` (JSON Blob, `Content-Type: application/json`), `evidence` (file)
- No manual `Content-Type` header — browser + axios interceptor handle the boundary
- Evidence MIME types accepted: `image/jpeg`, `image/png`, `image/webp`
- Maximum file size: 5 MB (from `LocalFileStorageService.java:124`)
- Evidence required: yes, exactly one file per report
- Evidence preview: Axios `responseType: 'blob'` → `URL.createObjectURL()` → `<img>` → `revokeObjectURL()` on cleanup

### Evidence Display

- `reviewerUserName` is the **designated reviewer's full name** — always populated; used for the Reviewer column
- `reviewedBy` is a UUID only — **not displayed**
- No `progressPercent` on report DTO — not shown in report detail
- Activity `progressPercent` and `realizedValue` are accessible via Activity API separately for E2E verification

---

## 9. Rejection and Resubmission Behavior (Source-Verified)

Backend partial unique index `idx_unique_pending_report` (`WHERE status = 'PENDING'`) only blocks duplicate **PENDING** reports per activity. After rejection (`status = 'REJECTED'`), a new PENDING report can be submitted for the same Activity. The original REJECTED report record remains unchanged.

---

## 10. Safe Error Mapping

All known backend error messages are mapped to user-facing English text. Unknown errors use a generic fallback: "An unexpected error occurred. Please try again." No SQL, Java class names (`org.springframework`, `java.`), stack traces, or constraint names are exposed.

---

## 11. Jest Test Results

| Suite | Tests | Result |
|---|---|---|
| `report-api.test.ts` | 14 | All passed |
| `report-page.test.tsx` | 6 | All passed |
| **Focused (P3)** | **20** | **All passed** |
| **Full project** | **185 across 11 suites** | **All passed** |

No regressions introduced by P3.

---

## 12. TypeScript Result

```
npx tsc --noEmit → Zero errors
```

---

## 13. ESLint Results

| Scope | Errors | Warnings | Notes |
|---|---|---|---|
| **P3 changed files** | **0** | **4** | 1 unused import in test, 2 `<img>` tags for blob URLs, 1 useCallback dep ordering — accepted patterns |
| **Full project** | **1** | ~25 | The single error is `set-state-in-effect` in a non-P3 file (pre-existing). All warnings are pre-existing and unrelated to P3. |

---

## 14. Production Build Result

```
npm run build → Succeeds
```

Route `/hr/kpi/reports` renders as a dynamic server-rendered page.

---

## 15. Manual Browser Acceptance (User Executed)

Hermes built-in browser tools were blocked by CORS preventing cross-origin API calls and HeroUI controlled-input event handling. The user manually executed all acceptance scenarios against the running application (frontend at `172.21.32.1:3000`, backend at `172.21.32.1:8080`).

| # | Scenario | Account(s) | Result |
|---|---|---|---|
| 1 | Permission-aware Reports navigation | All 6 | **PASS — USER EXECUTED** |
| 2 | Root report submission with valid image | dirut@erp.com | **PASS — USER EXECUTED** |
| 3 | Root Pending in My Reports, realization unchanged | dirut@erp.com | **PASS — USER EXECUTED** |
| 4 | Root report in admin Review Queue, absent from admin_2 | admin@erp.com, admin_2@erp.com | **PASS — USER EXECUTED** |
| 5 | Root approval updates status and realization | admin@erp.com | **PASS — USER EXECUTED** |
| 6 | Child report submission, visible to dirut only | manager_hr@erp.com, dirut@erp.com | **PASS — USER EXECUTED** |
| 7 | Child rejection with reason, realization unchanged | dirut@erp.com | **PASS — USER EXECUTED** |
| 8 | New submission after rejection allowed | manager_hr@erp.com | **PASS — USER EXECUTED** |
| 9 | Grandchild report, visible to manager_hr only, approved | staff_hr@erp.com, manager_hr@erp.com | **PASS — USER EXECUTED** |
| 10 | manager_hr_2 negative reviewer (same Position, distinct UserPosition) | manager_hr_2@erp.com | **PASS — USER EXECUTED** |
| 11 | Duplicate PENDING protection | dirut@erp.com | **PASS — USER EXECUTED** |
| 12 | Evidence: valid accepted, invalid MIME rejected, oversized rejected | dirut@erp.com, manager_hr@erp.com | **PASS — USER EXECUTED** |
| 13 | Evidence image rendered in Report Detail | dirut@erp.com | **PASS — USER EXECUTED** |
| 14 | Safe errors (no SQL/Java/stack traces) | dirut@erp.com | **PASS — USER EXECUTED** |

---

## 16. Files Created and Modified

### CREATE (12 production + 2 test)

```
src/modules/hr/kpi/report/report.types.ts
src/modules/hr/kpi/report/report-api.ts
src/modules/hr/kpi/report/report-error-mapper.ts
src/modules/hr/kpi/report/use-report-data.ts
src/modules/hr/kpi/report/report-submit-modal.tsx
src/modules/hr/kpi/report/report-table.tsx
src/modules/hr/kpi/report/report-detail-modal.tsx
src/modules/hr/kpi/report/report-review-dialog.tsx
src/modules/hr/kpi/report/__tests__/report-api.test.ts
src/modules/hr/kpi/report/__tests__/report-page.test.tsx
docs/testing/2026-07-27-kpi-frontend-p3-reports-verification.md
```

### MODIFY (6 files)

```
src/modules/hr/sidebar.ts                          # Added capability to SidebarItem
src/components/layout/sidebar.tsx                  # Check capability before permissions
src/modules/hr/kpi/sidebar.ts                      # Reports uses compound capability gate
src/modules/hr/kpi/__tests__/sidebar.test.ts       # Test capability callback
src/app/(main)/hr/kpi/reports/page.tsx             # Full implementation (replaced placeholder)
src/__mocks__/heroui-react.tsx                     # Added Tabs + Alert compound mocks
src/modules/hr/kpi/__tests__/page-shells.test.tsx  # Updated reports test for P3 implementation
```

---

## 17. Known Limitations

| Limitation | Rationale |
|---|---|
| Reviewer column shows designated reviewer name (`reviewerUserName`) only; `reviewedBy` UUID not displayed | `reviewedBy` has no display name |
| No progress percentage in report detail | Not present in `KpiReportResponse` DTO |
| `manager_hr_2@erp.com` shares the same Position as `manager_hr@erp.com` — negative control relies on distinct UserPosition ownership | Org hierarchy design; reviewer resolution uses exact UserPosition of Activity assignee |
| One pre-existing ESLint error (`set-state-in-effect`) in non-P3 file | Pre-existing Organization/Settings issue |
| Hermes browser automation was CORS-blocked; acceptance was user-executed | CORS configuration between frontend and backend prevents cross-origin API calls from browser console |

---

## 18. Credential Security

- No passwords, tokens, cookies, or Authorization headers are committed to the repository
- Runtime authentication used `ERP_E2E_PASSWORD` environment variable
- Fixture tokens were read during preflight and discarded
- This document contains no secrets

---

## 19. Definition of Done Checklist

- [x] API contracts match backend (methods, paths, part names, payloads)
- [x] Multipart submission: `report` (JSON Blob) + `evidence` (file), no manual Content-Type
- [x] Exactly one evidence image enforced (client-side + backend)
- [x] File type (JPEG/PNG/WebP) and size (5MB) validated
- [x] Reviewer chain matches strict cascading backend rules
- [x] My Reports shows only current user's submitted reports
- [x] Review Queue shows only reports where current user is the designated reviewer
- [x] `admin_2@erp.com` does NOT receive fixture reports (Activity approver ≠ report reviewer)
- [x] `manager_hr_2@erp.com` sees zero fixture reports from other branches/UserPositions
- [x] Official Activity realization changes only after report approval
- [x] Rejection leaves realization unchanged; rejected report stays REJECTED
- [x] New PENDING report can be submitted after rejection
- [x] TypeScript: zero errors
- [x] Full Jest: 185 passed (no regressions)
- [x] P3 changed-scope ESLint: zero errors
- [x] Production build: succeeds
- [x] No passwords, tokens, or credentials committed
- [x] No backend code or migrations changed
- [x] Manual browser acceptance: all 14 scenarios PASS
