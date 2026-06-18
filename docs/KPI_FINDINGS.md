# KPI Module — Temuan & Rekomendasi

**Status:** KPI module exists (pages, components, hooks, services) tapi sidebar dikomentari.
**Risk:** Begitu sidebar di-uncomment, seluruh halaman KPI dapat diakses tanpa permission check.

---

## Temuan Keamanan

### 1. Zero Permission Checks (CRITICAL)

Semua halaman KPI tidak meng-import `useAuthStore` / `usePermission`. Tidak ada `hasPerm` call sama sekali.

| Halaman | Permission yang seharusnya |
|---------|--------------------------|
| `kpi/tasks/page.tsx` | `task:read`, tombol "Tambah" → `task:create` |
| `kpi/corporate/page.tsx` | `kpi:read`, "Tambah" → `kpi:create` |
| `kpi/performance/page.tsx` | `performance:read` |
| `kpi/approvals/page.tsx` | `task:approve` |
| `kpi/approvals/reports/page.tsx` | `report:approve` |
| `kpi/tasks/[id]/page.tsx` | `task:read` |

### 2. KPI Sidebar Items (HARDCODED ROLES)

Sidebar KPI items menggunakan `roles: ['SUPER_ADMIN', 'HR_ADMIN']` — **hardcoded roles**, bukan permission-based. Seharusnya pakai `permissions: [...]`.

### 3. ESLint Warnings (21 issues)

| File | Issues |
|------|--------|
| `kpi/approvals/page.tsx` | 6 unused vars/imports |
| `kpi/corporate/page.tsx` | 5 unused vars |
| `kpi/tasks/page.tsx` | 1 unused `handleFormSubmit` |
| `kpi/components/approval-modal.tsx` | 1 unused `FieldError` |
| `kpi/components/corporate-kpi-form-modal.tsx` | `isEditMode` unused + `form.watch` in hook |
| `kpi/components/corporate-kpi-tree.tsx` | `setState` in effect (cascading renders) |
| `kpi/components/daily-report-modal.tsx` | 1 unused `Alert` + missing useEffect dep |
| `kpi/components/kpi-pending-badge.tsx` | 1 unused `Badge` |
| `kpi/components/task-data-table.tsx` | 2 unused imports (`XCircle`, `Badge`) |
| `kpi/components/task-form-modal.tsx` | 1 unused `NumberField` |
| `kpi/hooks/use-kpi-report-data.ts` | 1 unused `PendingCountResponse` |
| `kpi/hooks/use-pending-count.ts` | `setState` in effect (cascading renders) |
| `kpi/hooks/use-report-data.ts` | 1 unused `PendingCountResponse` |
| `kpi/services/kpi-task-api.ts` | 2 `any` types |
| `kpi/services/task-api.ts` | 2 `any` types |

### 4. React Warning di Runtime

| File | Issue |
|------|-------|
| `kpi/components/corporate-kpi-tree.tsx:195` | `setState` synchronously in useEffect → cascading renders |
| `kpi/hooks/use-pending-count.ts:33` | `setState` synchronously in useEffect → cascading renders |
| `kpi/components/corporate-kpi-form-modal.tsx:143` | `form.watch()` in component body — React Compiler skip memoization |

---

## Rekomendasi Sebelum Aktivasi KPI

### Prioritas 1 — Wajib
1. **Tambahkan permission guard** di semua halaman KPI sesuai tabel di atas
2. **Ganti sidebar filter** dari `roles: [...]` ke `permissions: [...]`
3. **Perbaiki `setState` in effect** — 2 file menyebabkan cascading renders

### Prioritas 2 — Sebelum Production
4. **Bersihkan 21 ESLint warning** — unused vars, unused imports
5. **Ganti 4 `any` types** di services dengan interface proper

### Prioritas 3 — Nice to Have
6. **Refactor ke `usePermission` hook** — begitu hook tersedia, ganti inline permission check
7. **Gunakan `PERM.*` constants** — begitu constants tersedia
