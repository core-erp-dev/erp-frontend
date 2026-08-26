# Frontend table row-density audit — 2026-08-26

## Scope and baseline

The audit covers every HeroUI table implementation under `src/modules` and
`src/app`, including employee, organization, corporate KPI, unit performance,
activity, report, and settings/admin screens. The employee list table
(`src/modules/organization/employees/components/data-table.tsx`) is the visual
baseline: it uses the shared HeroUI table slots without cell-level vertical
padding overrides.

HeroUI v3's shared cell slot is `table__cell`, with `px-4 py-3 align-middle
text-sm`. The standard row baseline is now a shared `3.75rem` minimum on that
slot. This is a minimum rather than a forced fixed row height, so wrapped text,
an error message, or another real multi-line domain value can still grow the
row naturally.

## Findings by table

| Area / table | Implementation and relevant slots | Before | Result / exception |
| --- | --- | --- | --- |
| Pegawai | `employees/components/data-table.tsx`; `Table`, `Table.Content`, `Table.Header`, `Table.Row`, `Table.Cell` | Default HeroUI cell; `Button size="sm"`, `Chip size="sm"`, copy wrapper `flex items-center` | Baseline reference; no local row override required |
| Pegawai form — posisi | `employees/components/employee-form.tsx`; same HeroUI slots | Default cell; `Chip size="sm"`; action wrapper with `Button size="sm"` | Standard baseline |
| Jabatan | `positions/components/position-table.tsx`; table and tree variants use the same slots | Default cell; tree indentation and `h-5 w-5` expand affordance; chips and `Button size="sm"` | Standard baseline; indentation is horizontal only |
| Organisasi | `organization-units/components/org-unit-table.tsx`; table and tree variants | Default cell; tree indentation and `h-5 w-5` expand affordance; `Chip size="sm"`; action wrapper | Standard baseline |
| Jabatan detail | `app/(main)/organization/positions/[id]/page.tsx`; two HeroUI tables | Default cells; copy/action wrappers and `Button size="sm"` | Standard baseline |
| Organisasi detail | `app/(main)/organization/organization-units/[id]/page.tsx`; HeroUI table | Default cells; action wrapper and `Button size="sm"` | Standard baseline |
| KPI Perusahaan — Struktur | `kpi/corporate/corporate-kpi-table.tsx`; current/deleted HeroUI tables | Default cells; tree wrappers use horizontal `paddingLeft`; `h-5 w-5` expand affordance; `Button size="sm"`; `Chip size="sm"` where applicable | Standard baseline; tree indentation remains horizontal |
| KPI Perusahaan — Variabel | `kpi/corporate/variables/variables-table.tsx`; current/deleted HeroUI tables | Default cells; truncated description; `Chip size="sm"`; action wrapper | Standard baseline; description intentionally stays one line/truncated |
| KPI Perusahaan — Nilai Variabel | `kpi/corporate/values/values-sheet-table.tsx`; HeroUI table | Default cells plus `TextField`/`Input` in edit mode | Shared cell baseline; table input is compacted to avoid input `py-2` stacking on cell `py-3` |
| KPI Perusahaan — form tingkat nilai | `kpi/corporate/form/corporate-kpi-form.tsx`; HeroUI table | Default cells plus two `TextField`/`Input` controls and action button | Same input normalization; invalid-field helper text may grow the row naturally |
| KPI Unit — Performa | `kpi/unit-performance/unit-performance-results-table.tsx`; HeroUI table | Default cells; copy wrapper, tooltip trigger, and action wrapper | Standard baseline |
| KPI Unit — Konfigurasi | `kpi/unit-performance/unit-performance-weight-matrix.tsx`; HeroUI table | Redundant cell-level `py-3` on all data cells; inputs and total chip | Removed redundant `py-3`; shared cell slot is now the only vertical spacing source; inputs use shared compact table input rule |
| KPI Unit — Detail | `app/(main)/kpi/unit-performance/[id]/page.tsx`; HeroUI table | Default cells with text-only values | Standard baseline |
| Aktivitas | `kpi/activity/activity-table.tsx` via `KpiTable`; shared shell and HeroUI slots | Default cells; `ProgressBar size="sm"`, `Chip size="sm"`, action buttons | Standard baseline |
| Aktivitas — Pengajuan | `kpi/activity/request-table.tsx` via `KpiTable` | Default cells; type/status `Chip size="sm"`; action button | Standard baseline |
| Aktivitas — Approval | `kpi/activity/approval-table.tsx` via `KpiTable` | Default cells; type `Chip size="sm"`; up to three `Button size="sm"` controls | Standard baseline; controls no longer make text-only rows shorter |
| Laporan | `kpi/report/report-table.tsx` via `KpiTable` | Default cells; status `Chip size="sm"`; action buttons | Standard baseline |
| Pengaturan — Roles | `settings/components/role-table.tsx`; HeroUI table | Default cells; action wrapper and `Button size="sm"`; description can wrap | Standard baseline; description remains a deliberate natural-growth exception |

## Root cause and shared fix

The inconsistency was not caused by different table primitives. It came from
the row's intrinsic height being chosen by the tallest child: a text-only cell
was approximately its line box plus `py-3`, while a row with a small button,
input, or nested control used that control's height plus the same cell padding.
The unit-performance matrix also repeated the shared `py-3` on every cell,
which made the ownership of vertical spacing unclear and encouraged per-page
density tuning.

The shared fix is in `src/app/globals.css`:

- `.table-root .table__cell` provides the common `3.75rem` minimum baseline;
- the existing HeroUI `py-3` remains the canonical cell padding;
- `.table-root .table__cell .input` uses `py-1.5`, preventing input padding from
  being added on top of the table cell spacing;
- no row is forcibly clipped or given a fixed content height.

The only source change outside shared styling is removal of the redundant
`py-3` classes from the unit-performance weight matrix. Existing `flex
items-center` wrappers remain for horizontal/action alignment; they do not add
vertical padding. `Chip size="sm"`, icon buttons, tooltip triggers, and the
numeric zero value do not receive additional row-specific height.

## Validation notes

The verification commands and their results are recorded in the task handoff.
The audit intentionally does not normalize empty/loading state heights such as
`h-24` or `py-12`; those are table-body state presentations, not data-row
density, and changing them would alter loading/empty affordance behavior.
