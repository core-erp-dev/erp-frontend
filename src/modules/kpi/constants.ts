/**
 * KPI feature module — shared constants and types.
 */

// ── Routes ────────────────────────────────────────────────────────────────
export const KPI_ROUTES = {
  overview: '/kpi',
  corporate: '/kpi/corporate',
  corporateAdd: '/kpi/corporate/add',
  corporateDetailRoute: (id: string, query?: string) => `/kpi/corporate/${id}${query ? `?${query}` : ''}`,
  corporateEditRoute: (id: string, query?: string) => `/kpi/corporate/${id}/edit${query ? `?${query}` : ''}`,
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
  unitPerformanceConfiguration: '/kpi/unit-performance/configuration',
} as const;

// ── Labels ────────────────────────────────────────────────────────────────
export const KPI_LABELS = {
  overview: 'Dashboard',
  corporate: 'Struktur KPI Perusahaan',
  corporateVariables: 'Variabel KPI',
  corporateVariableValues: 'Nilai Variabel KPI',
  activities: 'Activities',
  activitiesAll: 'All Activities',
  activitiesMine: 'My Activities',
  activitiesSubordinate: 'Subordinate',
  activitiesMyRequests: 'My Request',
  reports: 'My Report',
  reportReviews: 'Report Reviews',
  approvals: 'Activity Approvals',
  unitPerformance: 'Performa Unit',
  unitPerformanceConfiguration: 'Konfigurasi',
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
  unitPerformance: 'Hasil performa KPI Unit berdasarkan periode dan unit organisasi.',
  unitPerformanceConfiguration: 'Kelola unit peserta dan bobot kontribusi per indikator.',
} as const;
