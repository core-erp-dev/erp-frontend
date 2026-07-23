# P0 — KPI Frontend Foundation Plan

**Date**: 2026-07-23  
**Phase**: P0 of P0–P6 KPI frontend implementation  
**Scope**: Establish clean, compilable foundation without implementing any feature logic

---

## 1. Current Frontend Architecture

| Aspect | Detail |
|--------|--------|
| Framework | Next.js 16 + React 19 + TypeScript 5 |
| UI Library | HeroUI v3 (`@heroui/react` ^3.0.3) |
| Icons | `@phosphor-icons/react` |
| State | Zustand (auth-store) |
| Forms | React Hook Form + Zod v4 |
| HTTP | Axios |
| Package Manager | npm |
| Routing | Next.js App Router (`app/(main)/hr/...`) |
| Sidebar | `modules/hr/sidebar.ts` → `config/sidebar.ts` → `components/layout/sidebar.tsx` |
| Auth Guard | `components/layout/auth-guard.tsx` (token check, initAuth) |
| Layout | `MainLayout` — Sidebar + Header + scrollable content area |
| Permission Hook | `usePermission()` — `hasPerm`, `hasAnyPerm`, `hasAllPerms` |
| Permission Constants | `constants/permissions.ts` — `PERM` object |
| Permission Filter | Sidebar uses `some()` — ANY listed permission grants visibility |
| Tests | Jest + Testing Library configured, zero existing test files |

**Route Structure:**
```
/                          → ModuleSelectorPage (dashboard utama)
/hr                        → HRDashboardPage
/hr/organization/employees → Employee list
/hr/organization/positions → Position list
/hr/settings               → Settings
/hr/settings/roles          → Role management
```

**Sidebar Groups:**
- ORGANISASI: Karyawan (`user:read`), Struktur Jabatan (`position:read`)
- PENGATURAN: Hak Akses & Role (`role:read`), Pengaturan

---

## 2. Legacy KPI Inventory

**Result: ZERO legacy KPI files found.**

The KPI module was completely removed from the frontend:
- No `app/(main)/hr/kpi/` directory
- No `modules/hr/kpi/` directory
- No KPI permissions in `constants/permissions.ts`
- No KPI sidebar items in `modules/hr/sidebar.ts`
- No KPI types, services, hooks, or components
- No `__archive__/` directory

This is a clean slate — no legacy files to classify, remove, or defer.

---

## 3. Backend Contract Sources Inspected

| Source | Path |
|--------|------|
| Permissions | `erp-backend/src/main/java/com/erp/common/constant/Permissions.java` |
| Corporate KPI Controller | `erp-backend/src/main/java/com/erp/kpi/controller/CorporateKpiController.java` |
| KPI Activity Controller | `erp-backend/src/main/java/com/erp/kpi/controller/KpiActivityController.java` |
| KPI Activity Change Request Controller | `erp-backend/src/main/java/com/erp/kpi/controller/KpiActivityChangeRequestController.java` |
| KPI Report Controller | `erp-backend/src/main/java/com/erp/kpi/controller/KpiReportController.java` |

### Backend KPI Permissions

| Domain | Permission Code | Constant |
|--------|----------------|----------|
| Corporate KPI | `corporate_kpi:read` | `CORPORATE_KPI_READ` |
| Corporate KPI | `corporate_kpi:create` | `CORPORATE_KPI_CREATE` |
| Corporate KPI | `corporate_kpi:update` | `CORPORATE_KPI_UPDATE` |
| Corporate KPI | `corporate_kpi:delete` | `CORPORATE_KPI_DELETE` |
| Corporate KPI | `corporate_kpi:restore` | `CORPORATE_KPI_RESTORE` |
| Corporate KPI | `corporate_kpi:read_deleted` | `CORPORATE_KPI_READ_DELETED` |
| KPI Activity | `kpi_activity:read` | `KPI_ACTIVITY_READ` |
| KPI Activity | `kpi_activity:request` | `KPI_ACTIVITY_REQUEST` |
| KPI Activity | `kpi_activity:approve` | `KPI_ACTIVITY_APPROVE` |
| KPI Report | `kpi_report:read` | `KPI_REPORT_READ` |
| KPI Report | `kpi_report:submit` | `KPI_REPORT_SUBMIT` |
| KPI Report | `kpi_report:review` | `KPI_REPORT_REVIEW` |

Total: **12 KPI permissions** across 3 domains.

### Backend Endpoint Base Paths

| Module | Base Path | Controller |
|--------|-----------|------------|
| Corporate KPI | `/api/v1/corporate-kpis` | `CorporateKpiController` |
| KPI Activity | `/api/v1/kpi-activities` | `KpiActivityController` |
| Activity Requests | `/api/v1/kpi-activity-requests` | `KpiActivityChangeRequestController` |
| KPI Report | `/api/v1/kpi-reports` | `KpiReportController` |

---

## 4. Canonical Terminology

| English | Bahasa Indonesia | Backend Domain |
|---------|-----------------|----------------|
| Corporate KPI | KPI Korporat | `CorporateKpi` |
| KPI Activity | Aktivitas KPI | `KpiActivity` |
| Activity Change Request | Permintaan Perubahan Aktivitas | `KpiActivityChangeRequest` |
| KPI Activity Report | Laporan Pelaksanaan | `KpiActivityReport` |
| Evidence | Bukti | Evidence file |
| Reviewer | Peninjau | Report reviewer |
| Realized Value | Nilai Realisasi | `realizedValue` |
| Progress Percent | Persentase Capaian | `progressPercent` |
| KPI Overview | Overview | Aggregate dashboard |

**Forbidden terminology:** `KpiTask`, `Task KPI`, `Kinerja Tim`, `Kinerja Individu`, `Admin KPI`, `Dashboard KPI`

---

## 5. Final Routes

```
/                    → Dashboard utama ERP (unchanged)
/hr                  → HR Dashboard (unchanged)
/hr/kpi              → KPI Overview
/hr/kpi/corporate    → KPI Korporat
/hr/kpi/activities   → Aktivitas KPI
/hr/kpi/reports      → Laporan Pelaksanaan
/hr/kpi/approvals    → Persetujuan Aktivitas
```

---

## 6. Final Sidebar Structure

```
KPI                                   (new group)
├─ Overview        /hr/kpi            (any KPI perm)
├─ KPI Korporat    /hr/kpi/corporate  (corporate_kpi:read)
├─ Aktivitas       /hr/kpi/activities (kpi_activity:read | kpi_activity:request | kpi_activity:approve)
├─ Laporan         /hr/kpi/reports    (kpi_report:read | kpi_report:submit | kpi_report:review)
└─ Persetujuan     /hr/kpi/approvals  (kpi_activity:approve)
```

Existing groups preserved:
```
ORGANISASI
├─ Karyawan
└─ Struktur Jabatan

PENGATURAN
├─ Hak Akses & Role
└─ Pengaturan
```

---

## 7. Permission Visibility Rules

Using existing `some()` sidebar filter semantics:

| Sidebar Item | Visible When |
|-------------|--------------|
| Overview | User has ANY of the 12 KPI permissions |
| KPI Korporat | `corporate_kpi:read` |
| Aktivitas | `kpi_activity:read` OR `kpi_activity:request` OR `kpi_activity:approve` |
| Laporan | `kpi_report:read` OR `kpi_report:submit` OR `kpi_report:review` |
| Persetujuan | `kpi_activity:approve` |

---

## 8. Proposed Files

### Create

| # | File | Purpose |
|---|------|---------|
| 1 | `docs/plans/2026-07-23-kpi-frontend-p0-foundation.md` | This plan |
| 2 | `docs/testing/2026-07-23-kpi-frontend-p0-foundation-verification.md` | Verification report |
| 3 | `src/modules/hr/kpi/sidebar.ts` | KPI sidebar definitions |
| 4 | `src/modules/hr/kpi/types.ts` | KPI constants (route paths, labels, permission groups) |
| 5 | `src/app/(main)/hr/kpi/page.tsx` | KPI Overview shell |
| 6 | `src/app/(main)/hr/kpi/corporate/page.tsx` | KPI Korporat shell |
| 7 | `src/app/(main)/hr/kpi/activities/page.tsx` | Aktivitas KPI shell |
| 8 | `src/app/(main)/hr/kpi/reports/page.tsx` | Laporan Pelaksanaan shell |
| 9 | `src/app/(main)/hr/kpi/approvals/page.tsx` | Persetujuan Aktivitas shell |
| 10 | `src/modules/hr/kpi/__tests__/sidebar.test.ts` | Sidebar permission tests |
| 11 | `src/modules/hr/kpi/__tests__/routes.test.ts` | Route configuration tests |

### Modify

| # | File | Change |
|---|------|--------|
| 12 | `src/constants/permissions.ts` | Add 12 KPI permission constants |
| 13 | `src/modules/hr/sidebar.ts` | Import and include KPI sidebar group |

### Remove

None — clean slate.

### Defer

None — clean slate.

---

## 9. Strict P0 Exclusions

- ❌ Corporate KPI CRUD, tree rendering, or status management
- ❌ Activity list, forms, create/update/cancel requests
- ❌ Activity change request approval flow
- ❌ Report multipart upload, list, evidence preview, approve/reject
- ❌ KPI Overview cards, aggregation, statistic components
- ❌ Main dashboard KPI widgets
- ❌ API client services for any KPI endpoint
- ❌ Request/response DTOs (deferred to vertical-slice phases)
- ❌ Form schemas, hooks, query keys
- ❌ Mock KPI data
- ❌ Charts or data visualization
- ❌ Backend changes
- ❌ Organization sidebar changes
- ❌ New UI or state-management libraries

---

## 10. Verification Commands

| Command | Equivalent |
|---------|-----------|
| TypeScript check | `npx tsc --noEmit` (no dedicated typecheck script) |
| Lint | `npm run lint` |
| Test | `npm test` |
| Build | `npm run build` |

---

## 11. Rollback Risks

- **Low risk:** This P0 adds only 5 page shells + constants + sidebar items. No behavior is modified.
- No existing imports, routes, or components are broken.
- If any issue arises: remove `src/modules/hr/kpi/`, `src/app/(main)/hr/kpi/`, revert `permissions.ts` and `sidebar.ts` additions.
