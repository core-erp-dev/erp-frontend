/**
 * KPI Reports page tests — V1 (responsibility-based).
 * Proves: authenticated-only access (no obsolete capability gate), both tabs
 * always available, and the Submit Report entry point always present.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiReportsPage from '@/app/(main)/kpi/reports/page';

type PermSet = Record<string, boolean>;

let mockPermissions: PermSet = {};

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => {
    const perms = mockPermissions;
    const permList = Object.keys(perms).filter((k) => perms[k]);
    return {
      hasPerm: (p: string) => perms[p] ?? false,
      hasAnyPerm: (...ps: string[]) => ps.some((p) => perms[p] ?? false),
      hasAllPerms: (...ps: string[]) => ps.every((p) => perms[p] ?? false),
      permissions: permList,
    };
  },
}));

jest.mock('@/modules/kpi/report/use-report-data', () => ({
  useReportData: () => ({
    myReports: [], isLoadingMy: false, myError: null, fetchMyReports: jest.fn(),
    toReview: [], isLoadingReview: false, reviewError: null, fetchToReview: jest.fn(),
    submitReport: jest.fn(), isSubmitting: false,
    approveReport: jest.fn(), isApproving: false,
    rejectReport: jest.fn(), isRejecting: false,
    recoverable: null, clearRecoverable: jest.fn(),
  }),
}));

jest.mock('@/modules/kpi/report/report-table', () => ({ ReportTable: () => null }));
jest.mock('@/modules/kpi/report/report-detail-modal', () => ({ ReportDetailModal: () => null }));
jest.mock('@/modules/kpi/report/report-submit-modal', () => ({ ReportSubmitModal: () => null }));
jest.mock('@/modules/kpi/report/report-review-dialog', () => ({ ReportReviewDialog: () => null }));
jest.mock('@/modules/kpi/admin/reassign-reviewer-dialog', () => ({ ReassignReviewerDialog: () => null }));

function allText(): string {
  return document.body.textContent ?? '';
}

describe('KPI Reports page — V1', () => {
  beforeEach(() => {
    mockPermissions = {};
  });

  it('renders for a user with NO report permissions (responsibility-based access)', () => {
    render(<KpiReportsPage />);
    expect(screen.getByRole('heading', { name: 'Execution Reports' })).toBeInTheDocument();
    expect(allText()).not.toMatch(/Access Denied/i);
  });

  it('shows My Reports and Review Queue tabs for any authenticated user', () => {
    render(<KpiReportsPage />);
    expect(allText()).toMatch(/My Reports/);
    expect(allText()).toMatch(/Review Queue/);
  });

  it('always shows the Submit Report entry point (exact-assignee gate is the selector)', () => {
    render(<KpiReportsPage />);
    expect(allText()).toMatch(/Submit Report/);
  });

  it('does not require kpi_report:manage to open Reports', () => {
    mockPermissions = {};
    render(<KpiReportsPage />);
    expect(allText()).not.toMatch(/Access Denied/i);
  });
});
