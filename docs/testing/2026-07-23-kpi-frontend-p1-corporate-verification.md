# P1 — Corporate KPI Frontend Verification Report

**Date:** 2026-07-23
**Author:** Implementation agent (source-inspected)
**Manual smoke-test status:** PENDING USER EXECUTION

---

## Commits

| Phase | Hash | Message |
|---|---|---|
| P1.1 | `0378833` | `feat(kpi): add corporate KPI hierarchy view` |
| P1.2 | `4cb9ec9` | `feat(kpi): add corporate KPI create and edit workflows` |
| P1.2 audit | `a01d4c4` | `test(kpi): complete corporate KPI form coverage` |
| P1.2 verification | `24aae2c` | `test(kpi): verify corporate KPI mutation orchestration` |
| P1.3 | `6b57c89` | `feat(kpi): add corporate KPI lifecycle management` |
| P1.4 (this) | *(after verification)* | `fix(kpi): clarify corporate KPI lifecycle actions` |

---

## Files Created and Modified

### P1.1 — Hierarchy view (7 new, 5 modified)
**Created:**
- `src/modules/hr/kpi/corporate/corporate-kpi.types.ts`
- `src/modules/hr/kpi/corporate/corporate-kpi-api.ts`
- `src/modules/hr/kpi/corporate/use-corporate-kpi-data.ts`
- `src/modules/hr/kpi/corporate/corporate-kpi-table.tsx`
- `src/modules/hr/kpi/corporate/corporate-kpi-filters.tsx`
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-api.test.ts`
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-table.test.tsx`
- `src/modules/hr/kpi/corporate/__tests__/corporate-kpi-page.test.tsx`

**Modified:**
- `src/app/(main)/hr/kpi/corporate/page.tsx`
- `src/__mocks__/heroui-react.tsx`
- `src/__mocks__/phosphor-icons-react.tsx`
- `src/modules/hr/kpi/__tests__/page-shells.test.tsx`

### P1.2 — Create/edit workflows (2 new, 8 modified)
**Created:**
- `src/modules/hr/kpi/corporate/corporate-kpi-error-mapper.ts`
- `src/modules/hr/kpi/corporate/kpi-node-form-modal.tsx`

**Modified:**
- All P1.1 files extended with create/update API methods, types, hook mutations, table action callbacks, modal state

### P1.3 — Lifecycle management (1 new, 5 modified)
**Created:**
- `src/modules/hr/kpi/corporate/corporate-kpi-lifecycle-dialog.tsx`

**Modified:**
- API, types, hook, table, page — lifecycle mutations, action buttons, dialog orchestration

### P1.4 — Finalization (1 file modified)
**Modified:**
- `src/modules/hr/kpi/corporate/corporate-kpi-table.tsx` — icon buttons replacing A/D/X labels
- `src/__mocks__/phosphor-icons-react.tsx` — added Check, Trash icons
- `docs/testing/2026-07-23-kpi-frontend-p1-corporate-verification.md` — this file

---

## Endpoints Consumed

| Method | Path | Permission | Phase |
|---|---|---|---|
| GET | `/api/v1/corporate-kpis/tree?year={year}` | `corporate_kpi:read` | P1.1 |
| GET | `/api/v1/corporate-kpis/deleted` | `corporate_kpi:read_deleted` | P1.1 |
| GET | `/api/v1/corporate-kpis/{id}` | `corporate_kpi:read` | NOT CONSUMED (detail deferred) |
| POST | `/api/v1/corporate-kpis` | `corporate_kpi:create` | P1.2 |
| PUT | `/api/v1/corporate-kpis/{id}` | `corporate_kpi:update` | P1.2 |
| PATCH | `/api/v1/corporate-kpis/{id}/status` | `corporate_kpi:update` | P1.3 |
| PATCH | `/api/v1/corporate-kpis/{id}/delete` | `corporate_kpi:delete` | P1.3 |
| POST | `/api/v1/corporate-kpis/{id}/restore` | `corporate_kpi:restore` | P1.3 |

**Total P1 API methods: 7** (tree, deleted, create, update, status, delete, restore)

---

## Permission Matrix

| Permission | Controls |
|---|---|
| `corporate_kpi:read` | Route access, tree rendering |
| `corporate_kpi:read_deleted` | Deleted KPIs view toggle |
| `corporate_kpi:create` | Create Aspect button, Create Indicator action |
| `corporate_kpi:update` | Edit action, Activate action, Deactivate action |
| `corporate_kpi:delete` | Delete action |
| `corporate_kpi:restore` | Restore action in Deleted KPIs view |

Permissions are independent — no permission implies another. Frontend hiding is UX only; backend remains authoritative.

---

## Hierarchy Behavior

- 2-level: ASPECT (root) → INDICATOR (leaf)
- Expandable tree-table with caret toggles
- Expand All / Collapse All controls
- Client-side search: matching child keeps parent visible
- Year selector (current year ± 3)
- Current KPIs / Deleted KPIs views
- Deleted KPIs: lazy, permission-safe fetch, flat list filtered by selected year client-side

---

## Create/Edit Validation and Payloads

### Frontend validation (Zod)
- Code: required, max 50 chars
- Name: required, max 255 chars
- Unit (Indicator): required, non-blank, max 50
- Target Value (Indicator): required, strictly positive (zero/negative/NaN rejected)
- Description: optional in all modes
- Parent Aspect (Indicator): required

### Payload mapping

| Operation | Sends explicit nulls? | Sends nodeType/year? |
|---|---|---|
| Create ASPECT | parentId, unit, targetValue → null | nodeType: "ASPECT", year |
| Create INDICATOR | — | nodeType: "INDICATOR", year |
| Update ASPECT | parentId, unit, targetValue → null | NO (immutable) |
| Update INDICATOR | — | NO (immutable) |

---

## Lifecycle Behavior

### Status flow
```
DRAFT → ACTIVE → INACTIVE → ACTIVE (bidirectional)
```

### Action availability per status

| Status | Activate | Deactivate | Delete | Restore |
|---|---|---|---|---|
| DRAFT | ✓ | — | ✓ | — |
| ACTIVE | — | ✓ | ✓ | — |
| INACTIVE | ✓ | — | ✓ | — |
| Deleted (any status) | — | — | — | ✓ |

### Lifecycle action UI
- **Activate:** Check icon (green), `aria-label="Activate"`
- **Deactivate:** `||` pause icon (orange), `aria-label="Deactivate"`
- **Delete:** Trash icon (red, destructive), `aria-label="Delete"`
- **Restore:** ArrowCounterClockwise icon, `aria-label="Restore"`
- All buttons have at minimum full English `aria-label` for accessibility

### Confirmation dialog
- Action-specific title (e.g., "Delete Corporate KPI")
- Body: "Are you sure you want to {action} **{code} — {name}**?"
- Confirm/Cancel buttons; pending state disables both
- Delete uses destructive danger variant

### Lifecycle constraints (backend-enforced, frontend-mapped)
- Cannot deactivate ASPECT with ACTIVE Indicators → clear English message
- Cannot delete node with non-deleted children → clear English message
- Cannot restore Indicator while parent is deleted → clear English message
- Indicator → ACTIVE requires ACTIVE parent → clear English message

---

## Deleted / Restore Workflow

- Delete: soft delete via `PATCH /{id}/delete`
- Delete order: Indicator first, then childless Aspect
- Deleted KPIs view: lazy-fetched flat list from `GET /deleted`
- Deleted list filtered client-side by selected year
- Restore via `POST /{id}/restore`
- Restore order: Aspect first, then Indicator
- Error mapper: "Delete all child Indicators before deleting this Aspect." / "Restore the parent Aspect before restoring this Indicator."

---

## Lifecycle-Action UI Correction (P1.4)

The initial implementation used single-letter labels (A/D/X) as button content. This was replaced with:
- **Activate:** `Check` icon (green) — semantically clear, used in existing codebase
- **Deactivate:** `||` pause symbol (orange) — visually distinct pause representation
- **Delete:** `Trash` icon (red, destructive) — matches existing `PositionTable` convention
- **Restore:** `ArrowCounterClockwise` icon — matches existing convention

All buttons carry full English `aria-label` attributes for accessibility. Icon colors follow existing project conventions (green=success, orange=warning, red=danger).

---

## Automated Test Count

| Test file | Tests | Coverage |
|---|---|---|
| `sidebar.test.ts` | 21 | Sidebar structure, permissions, route constants |
| `page-shells.test.tsx` | 25 | All 5 KPI page shells, titles, descriptions |
| `corporate-kpi-api.test.ts` | 16 | Read, create, update, lifecycle API methods |
| `corporate-kpi-table.test.tsx` | 15 | Hierarchy rendering, search, status badges, actions |
| `corporate-kpi-page.test.tsx` | 11 | Permissions, year selection, view toggle, lazy fetch |
| `kpi-node-form-modal.test.tsx` | 27 | All 4 modes, validation, DTO mapping, pending, reset |
| `corporate-kpi-error-mapper.test.ts` | 18 | Known errors, safety (SQL, stack traces, class names) |
| **Total** | **133** | **7 test suites** |

### Focused lifecycle coverage (P1.3 + P1.4)
- API: changeStatus path/payload, deleteNode path, restoreNode path
- Table: lifecycle buttons render based on status and permissions
- Dialog: pending state prevents double submission
- Error mapper: all lifecycle domain errors mapped to safe English

---

## TypeScript Result

**Pass** — zero errors (`npx tsc --noEmit`)

---

## Changed-File Lint Result

**All P1-changed files: 0 errors, 0 warnings**

Changed files pass ESLint:
- `src/modules/hr/kpi/corporate/` — clean
- `src/__mocks__/` — clean  
- `src/app/(main)/hr/kpi/corporate/page.tsx` — clean

---

## Full Lint Result

15 issues reported by `npx eslint .`, all **pre-existing** from legacy Organization module:

| File | Issue | Type |
|---|---|---|
| `roles/page.tsx:43` | `react-hooks/exhaustive-deps` | warning |
| `page.tsx:4` (root) | `Surface` unused | warning |
| `employee-form.tsx:23` | `toast` unused | warning |
| `employee-form.tsx:78` | `isLoadingSecondary` unused | warning |
| `employee-form.tsx:127` | `set-state-in-effect` | error |
| `use-employee-data.ts:87` | `_error` unused | warning |
| `position-form.tsx:20` | `RoleResponse` unused | warning |
| `position-form.tsx:102` | incompatible library | warning |
| `use-position-form-data.ts:19` | 2 unused vars | warnings |
| `role-form.tsx:26` | `isEditMode` unused | warning |
| `role-form.tsx:99` | incompatible library | warning |
| `role-form.tsx:102` | `result` unused | warning |
| `role-table.tsx:19` | 2 unused vars | warnings |

No new lint issues were introduced by any P1 Corporate KPI file.

---

## Production Build Result

**Pass** — Next.js 16 Turbopack, compiled successfully in ~11s

---

## Manual Smoke-Test Checklist

Status: **PENDING USER EXECUTION**

Run these steps against the real backend:

1. Login as ADMIN (all 6 Corporate KPI permissions).
2. Open `/hr/kpi/corporate`.
3. Create Aspect (code: `FIN`, name: `Financial`, year: 2026).
4. Verify Aspect appears in Current KPIs with DRAFT status.
5. Click Check (Activate) icon on the Aspect → confirm dialog → verify status changes to ACTIVE.
6. Create Indicator under Aspect (code: `F01`, name: `Revenue Growth`, unit: `%`, targetValue: `10.5`).
7. Verify Indicator appears under Aspect with DRAFT status.
8. Try to activate Indicator → expect error (parent is already ACTIVE so should succeed).
9. Verify Indicator now shows ACTIVE.
10. Click Trash (Delete) on the ACTIVE Indicator → confirm → expect error (parent ASPECT deletion is blocked because of active child).
11. Deactivate Indicator first (click `||` icon).
12. Delete Indicator → verify it disappears from Current KPIs.
13. Delete now-childless Aspect → verify it disappears.
14. Switch to "Deleted KPIs" — verify both deleted nodes appear (filtered to selected year).
15. Try to restore Indicator while Aspect is still deleted → expect error "Restore the parent Aspect before restoring this Indicator."
16. Restore Aspect first → verify success toast.
17. Restore Indicator → both return.
18. Switch back to "Current KPIs" → verify both nodes visible.
19. Login as read-only user → verify no mutation icons visible.
20. Verify read-only user cannot see "Deleted KPIs" tab.

---

## Known Limitations

- Manual smoke test has not been executed against the real backend (PENDING).
- Lifecycle Deactivate icon uses a `||` pause symbol rather than a Phosphor icon due to module resolution restrictions in `@phosphor-icons/react@2.1.10` (the `Play` and `Pause` icon files exist on disk but are not recognized by TypeScript `moduleResolution: "bundler"`).
- Edit/Aspect-switching parent Select uses native `<select>` rather than HeroUI `Select` (HeroUI v3 type defs don't expose `value`/`onChange`/`isDisabled` directly).
- The detail endpoint (`GET /{id}`) is not consumed; all node data comes from the tree response.

---

## Readiness for P2 (Activity)

P1 is functionally complete and all automated checks pass. P2 (Activity frontend) may begin after manual smoke testing confirms the backend integration works end-to-end. The Corporate KPI create/update/lifecycle endpoints must produce ACTIVE INDICATOR nodes that Activity creation can reference. Verify this in the manual smoke test (step 16-18).
