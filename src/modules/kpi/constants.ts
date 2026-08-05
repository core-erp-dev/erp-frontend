/**
 * KPI feature module — shared constants and types.
 */

// ── Routes ────────────────────────────────────────────────────────────────
export const KPI_ROUTES = {
  overview: '/kpi',
  corporate: '/kpi/corporate',
  corporateAdd: '/kpi/corporate/add',
  corporateEditRoute: (id: string) => `/kpi/corporate/${id}/edit`,
  corporateVariables: '/kpi/corporate/variables',
  corporateVariableValues: '/kpi/corporate/variable-values',
  activities: '/kpi/activities',
  reports: '/kpi/reports',
  reportReviews: '/kpi/report-reviews',
  approvals: '/kpi/approvals',
} as const;

// ── Labels ────────────────────────────────────────────────────────────────
export const KPI_LABELS = {
  overview: 'Dashboard',
  corporate: 'Corporate KPI Structure',
  corporateVariables: 'KPI Variables',
  corporateVariableValues: 'KPI Values',
  activities: 'KPI Activities',
  reports: 'My Reports',
  reportReviews: 'Report Reviews',
  approvals: 'Activity Approvals',
} as const;

export const KPI_DESCRIPTIONS = {
  overview: 'Organization KPI performance summary.',
  corporate: 'Corporate KPI structure and evaluation results.',
  corporateVariables: 'Manage corporate KPI variable master data.',
  corporateVariableValues: 'View Corporate KPI variable values for a selected month or year.',
  activities: 'Manage KPI activities, create change requests, and monitor progress.',
  reports: 'Your submitted execution reports, evidence, and review status.',
  reportReviews: 'Execution reports assigned to you or waiting in the company review queue.',
  approvals: 'Approve or reject KPI activity change requests.',
} as const;
