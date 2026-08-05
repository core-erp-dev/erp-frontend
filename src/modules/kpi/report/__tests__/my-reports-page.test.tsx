/**
 * My Reports page tests — `/kpi/reports` (split navigation, 2026-08-06).
 *
 * Proves: the page is the user's own report history ONLY — it fetches
 * scope=mine (never to-review), shows no approve/reject actions, keeps the
 * read-only detail modal, and renders the "Company queue" reviewer label for
 * top-level root reports. The old My Reports / Review Queue tab toggle is gone.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiMyReportsPage from '@/app/(main)/kpi/reports/page';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';

const fetchMy = jest.fn();
const fetchReview = jest.fn();

let mockMyReports: KpiReportResponse[] = [];

jest.mock('@/modules/kpi/report/use-report-data', () => ({
  useReportData: () => ({
    myReports: mockMyReports, isLoadingMy: false, myError: null, fetchMyReports: fetchMy,
    toReview: [], isLoadingReview: false, reviewError: null, fetchToReview: fetchReview,
    submitReport: jest.fn(), isSubmitting: false,
    approveReport: jest.fn(), isApproving: false,
    rejectReport: jest.fn(), isRejecting: false,
    recoverable: null, clearRecoverable: jest.fn(),
  }),
}));

// Detail modal captured as a probe: MY mode must never receive decision callbacks.
jest.mock('@/modules/kpi/report/report-detail-modal', () => ({
  ReportDetailModal: (props: { mode: string; onApprove?: () => void; onReject?: () => void }) => (
    <div
      data-testid="detail-modal"
      data-mode={props.mode}
      data-has-approve={props.onApprove ? 'true' : 'false'}
      data-has-reject={props.onReject ? 'true' : 'false'}
    />
  ),
}));
jest.mock('@/modules/kpi/report/report-submit-modal', () => ({ ReportSubmitModal: () => null }));
jest.mock('@/modules/kpi/report/report-review-dialog', () => ({ ReportReviewDialog: () => null }));
jest.mock('@/modules/kpi/admin/reassign-reviewer-dialog', () => ({ ReassignReviewerDialog: () => null }));

function report(id: string, reviewerUserId: string | null, reviewerUserName: string | null): KpiReportResponse {
  return {
    id, activityId: 'act-1', activityName: `Activity ${id}`, unit: '%',
    activityTargetValue: 100, submittedByUserPositionId: 'up-1',
    submittedByUserName: 'Staff', submittedByPositionName: 'Staff Pos',
    reviewerUserId, reviewerUserName, reviewerUserPositionId: null, reviewerPositionName: null,
    reportDate: '2026-07-15', executionDescription: 'done', realizedValue: 40,
    note: null, status: 'PENDING', reviewedBy: null, reviewedAt: null,
    rejectionReason: null, evidenceOriginalFilename: 'e.jpg',
    evidenceContentType: 'image/jpeg', evidenceFileSize: 1024,
    createdAt: '2026-08-01T10:00:00', updatedAt: '2026-08-01T10:00:00',
  };
}

function allText(): string {
  return document.body.textContent ?? '';
}

describe('My Reports page (/kpi/reports)', () => {
  beforeEach(() => {
    fetchMy.mockClear();
    fetchReview.mockClear();
    mockMyReports = [];
  });

  it('renders directly with its own header and breadcrumb (direct-load safe)', () => {
    render(<KpiMyReportsPage />);
    expect(screen.getByRole('heading', { name: 'My Report' })).toBeInTheDocument();
    expect(allText()).toMatch(/My Report/);
  });

  it('fetches scope=mine and never scope=to-review', () => {
    render(<KpiMyReportsPage />);
    expect(fetchMy).toHaveBeenCalledTimes(1);
    expect(fetchReview).not.toHaveBeenCalled();
  });

  it('shows the empty state instead of a permission error when there are no reports', () => {
    render(<KpiMyReportsPage />);
    expect(screen.getByText('No reports submitted yet.')).toBeInTheDocument();
    expect(allText()).not.toMatch(/Access Denied/i);
  });

  it('renders the own-report list and shows Company queue for top-level roots', () => {
    mockMyReports = [
      report('assigned', 'u-reviewer', 'Parent Reviewer'),
      report('root', null, null),
    ];
    render(<KpiMyReportsPage />);
    expect(screen.getByText('Activity assigned')).toBeInTheDocument();
    expect(screen.getByText('Parent Reviewer')).toBeInTheDocument();
    expect(screen.getByText('Company queue')).toBeInTheDocument();
  });

  it('does NOT expose approve/reject — the detail modal opens in read-only MY mode', () => {
    mockMyReports = [report('assigned', 'u-reviewer', 'Parent Reviewer')];
    render(<KpiMyReportsPage />);
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'View detail' }).click();
    const modal = screen.getByTestId('detail-modal');
    expect(modal).toHaveAttribute('data-mode', 'MY');
    expect(modal).toHaveAttribute('data-has-approve', 'false');
    expect(modal).toHaveAttribute('data-has-reject', 'false');
  });

  it('does not render the legacy My Reports / Review Queue tab toggle', () => {
    render(<KpiMyReportsPage />);
    expect(allText()).not.toMatch(/Review Queue/);
    expect(allText()).not.toMatch(/To Review/);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});
