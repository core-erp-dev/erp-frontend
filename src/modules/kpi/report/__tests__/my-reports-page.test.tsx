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
const routerPush = jest.fn();

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

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPush, replace: jest.fn() }) }));
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
    expect(screen.getByRole('heading', { name: 'Laporan Saya' })).toBeInTheDocument();
    expect(allText()).toMatch(/Laporan Saya/);
  });

  it('fetches scope=mine and never scope=to-review', () => {
    render(<KpiMyReportsPage />);
    expect(fetchMy).toHaveBeenCalledTimes(1);
    expect(fetchReview).not.toHaveBeenCalled();
  });

  it('shows the empty state instead of a permission error when there are no reports', () => {
    render(<KpiMyReportsPage />);
    expect(screen.getByText('Belum ada laporan yang diajukan.')).toBeInTheDocument();
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
    expect(screen.getByText('Antrean perusahaan')).toBeInTheDocument();
  });

  it('does NOT expose approve/reject and routes detail to the mine context', () => {
    mockMyReports = [report('assigned', 'u-reviewer', 'Parent Reviewer')];
    render(<KpiMyReportsPage />);
    expect(screen.queryByRole('button', { name: 'Setujui' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tolak' })).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Lihat detail laporan' }).click();
    expect(routerPush).toHaveBeenCalledWith('/kpi/reports/assigned?from=mine');
  });

  it('does not render the legacy My Reports / Review Queue tab toggle', () => {
    render(<KpiMyReportsPage />);
    expect(allText()).not.toMatch(/Review Queue/);
    expect(allText()).not.toMatch(/To Review/);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});
