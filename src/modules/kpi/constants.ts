/**
 * KPI feature module — shared constants and types.
 */

// ── Routes ────────────────────────────────────────────────────────────────
export const KPI_ROUTES = {
  overview: '/kpi',
  corporate: '/kpi/corporate',
  activities: '/kpi/activities',
  reports: '/kpi/reports',
  approvals: '/kpi/approvals',
} as const;

// ── Labels ────────────────────────────────────────────────────────────────
export const KPI_LABELS = {
  overview: 'Dashboard',
  corporate: 'Corporate KPI',
  activities: 'KPI Activities',
  reports: 'Execution Reports',
  approvals: 'Activity Approvals',
} as const;

export const KPI_DESCRIPTIONS = {
  overview: 'Organization KPI performance summary.',
  corporate: 'Manage the corporate KPI tree and annual targets.',
  activities: 'Manage KPI activities, create change requests, and monitor progress.',
  reports: 'Submit execution reports, upload evidence, and review team reports.',
  approvals: 'Approve or reject KPI activity change requests.',
} as const;
