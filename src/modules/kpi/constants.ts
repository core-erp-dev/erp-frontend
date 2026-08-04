/**
 * KPI feature module — shared constants and types.
 */

// ── Routes ────────────────────────────────────────────────────────────────
export const KPI_ROUTES = {
  overview: '/kpi',
  corporate: '/kpi/corporate',
  corporateVariables: '/kpi/corporate/variables',
  corporateVariableValues: '/kpi/corporate/variable-values',
  activities: '/kpi/activities',
  reports: '/kpi/reports',
  approvals: '/kpi/approvals',
} as const;

// ── Labels ────────────────────────────────────────────────────────────────
export const KPI_LABELS = {
  overview: 'Dashboard',
  corporate: 'Corporate KPI',
  corporateVariables: 'Input Variables',
  corporateVariableValues: 'Monthly Variable Values',
  activities: 'KPI Activities',
  reports: 'Execution Reports',
  approvals: 'Activity Approvals',
} as const;

export const KPI_DESCRIPTIONS = {
  overview: 'Organization KPI performance summary.',
  corporate: 'Manage the corporate KPI tree and annual targets.',
  corporateVariables: 'Manage corporate KPI variable master data.',
  corporateVariableValues: 'Input monthly values for corporate KPI variables.',
  activities: 'Manage KPI activities, create change requests, and monitor progress.',
  reports: 'Submit execution reports, upload evidence, and review team reports.',
  approvals: 'Approve or reject KPI activity change requests.',
} as const;
