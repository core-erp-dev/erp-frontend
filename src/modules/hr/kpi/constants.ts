/**
 * KPI feature module — shared constants and types.
 */
import { PERM } from '@/constants/permissions';

// ── Routes ────────────────────────────────────────────────────────────────
export const KPI_ROUTES = {
  overview: '/hr/kpi',
  corporate: '/hr/kpi/corporate',
  activities: '/hr/kpi/activities',
  reports: '/hr/kpi/reports',
  approvals: '/hr/kpi/approvals',
} as const;

// ── Labels ────────────────────────────────────────────────────────────────
export const KPI_LABELS = {
  overview: 'Overview',
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

// ── Permission Groups (for sidebar visibility) ─────────────────────────────
/** All KPI permissions — used for Overview visibility. */
export const KPI_ANY_PERMISSION = [
  PERM.CORPORATE_KPI_READ,
  PERM.CORPORATE_KPI_CREATE,
  PERM.CORPORATE_KPI_UPDATE,
  PERM.CORPORATE_KPI_DELETE,
  PERM.CORPORATE_KPI_RESTORE,
  PERM.CORPORATE_KPI_READ_DELETED,
  PERM.KPI_ACTIVITY_READ,
  PERM.KPI_ACTIVITY_REQUEST,
  PERM.KPI_ACTIVITY_APPROVE,
  PERM.KPI_REPORT_READ,
  PERM.KPI_REPORT_SUBMIT,
  PERM.KPI_REPORT_REVIEW,
] as const;
