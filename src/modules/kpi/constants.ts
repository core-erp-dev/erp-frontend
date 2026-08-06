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
  activitiesAll: '/kpi/activities/all',
  activitiesMine: '/kpi/activities/mine',
  activitiesSubordinate: '/kpi/activities/subordinate',
  activitiesMyRequests: '/kpi/activities/my-requests',
  reports: '/kpi/reports',
  reportReviews: '/kpi/report-reviews',
  approvals: '/kpi/approvals',
  unitPerformance: '/kpi/unit-performance',
} as const;

// ── Labels ────────────────────────────────────────────────────────────────
export const KPI_LABELS = {
  overview: 'Dashboard',
  corporate: 'Corporate KPI Structure',
  corporateVariables: 'KPI Variables',
  corporateVariableValues: 'KPI Values',
  activities: 'Activities',
  activitiesAll: 'All Activities',
  activitiesMine: 'My Activities',
  activitiesSubordinate: 'Subordinate',
  activitiesMyRequests: 'My Request',
  reports: 'My Report',
  reportReviews: 'Report Reviews',
  approvals: 'Activity Approvals',
  unitPerformance: 'Unit Performance',
} as const;

export const KPI_DESCRIPTIONS = {
  overview: 'Organization KPI performance summary.',
  corporate: 'Corporate KPI structure and evaluation results.',
  corporateVariables: 'Manage corporate KPI variable master data.',
  corporateVariableValues: 'View Corporate KPI variable values for a selected month or year.',
  activities: 'Manage KPI activities, create change requests, and monitor progress.',
  activitiesAll: 'All KPI activities the user is authorized to view.',
  activitiesMine: 'KPI activities assigned to the active user.',
  activitiesSubordinate: 'KPI activities of subordinate positions via an explicit acting Position.',
  activitiesMyRequests: 'KPI activity requests submitted by the active user.',
  reports: 'Your submitted execution reports, evidence, and review status.',
  reportReviews: 'Execution reports assigned to you or waiting in the company review queue.',
  approvals: 'Approve or reject KPI activity change requests.',
  unitPerformance: 'Unit performance against the corporate KPI target, by organization unit.',
} as const;
