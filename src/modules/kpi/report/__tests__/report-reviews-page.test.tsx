/**
 * Report Reviews page tests — `/kpi/report-reviews` (split navigation, 2026-08-06).
 *
 * Proves: the page is the review queue ONLY — it fetches scope=to-review
 * (never mine); it is NOT gated by kpi_report:root_review or
 * kpi_report:manage; hierarchy reviewers without root_review can open it;
 * approve/reject survive; reassignment appears only for hierarchy-assigned
 * reports; root reports show Company queue; self-review rejection surfaces as
 * the recoverable banner; empty queue is an empty state, not a permission error.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiReportReviewsPage from '@/app/(main)/kpi/report-reviews/page';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';

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

const fetchMy = jest.fn();
const fetchReview = jest.fn();
const routerPush = jest.fn();

let mockToReview: KpiReportResponse[] = [];
let mockRecoverable: { kind: string; message: string; refetch: boolean } | null = null;

jest.mock('@/modules/kpi/report/use-report-data', () => ({
  useReportData: () => ({
    myReports: [], isLoadingMy: false, myError: null, fetchMyReports: fetchMy,
    toReview: mockToReview, isLoadingReview: false, reviewError: null, fetchToReview: fetchReview,
    submitReport: jest.fn(), isSubmitting: false,
    approveReport: jest.fn(), isApproving: false,
    rejectReport: jest.fn(), isRejecting: false,
    recoverable: mockRecoverable, clearRecoverable: jest.fn(),
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

describe('Report Reviews page (/kpi/report-reviews)', () => {
  beforeEach(() => {
    fetchMy.mockClear();
    fetchReview.mockClear();
    mockPermissions = {};
    mockToReview = [];
    mockRecoverable = null;
  });

  it('renders directly with its own header and breadcrumb (direct-load safe)', () => {
    render(<KpiReportReviewsPage />);
    expect(screen.getByRole('heading', { name: 'Persetujuan Laporan' })).toBeInTheDocument();
    expect(allText()).toMatch(/Persetujuan Laporan/);
  });

  it('fetches scope=to-review and never scope=mine', () => {
    render(<KpiReportReviewsPage />);
    expect(fetchReview).toHaveBeenCalledTimes(1);
    expect(fetchMy).not.toHaveBeenCalled();
  });

  it('is NOT gated by kpi_report:root_review — a hierarchy reviewer without it can open the page', () => {
    render(<KpiReportReviewsPage />);
    expect(allText()).not.toMatch(/Access Denied/i);
    expect(fetchReview).toHaveBeenCalledTimes(1);
  });

  it('is NOT gated by kpi_report:manage and shows no reassign action without it', () => {
    mockToReview = [report('assigned', 'u-reviewer', 'Parent Reviewer')];
    render(<KpiReportReviewsPage />);
    expect(allText()).not.toMatch(/Access Denied/i);
    expect(screen.queryByRole('button', { name: 'Alihkan peninjau' })).not.toBeInTheDocument();
  });

  it('shows the empty state instead of a permission error for an empty queue', () => {
    render(<KpiReportReviewsPage />);
    expect(screen.getByText('Tidak ada laporan untuk ditinjau.')).toBeInTheDocument();
    expect(allText()).not.toMatch(/Access Denied/i);
  });

  it('routes detail to the review context', () => {
    mockToReview = [report('assigned', 'u-reviewer', 'Parent Reviewer')];
    render(<KpiReportReviewsPage />);

    screen.getByRole('button', { name: 'Lihat detail laporan' }).click();
    expect(routerPush).toHaveBeenCalledWith('/kpi/reports/assigned?from=review');
  });

  it('shows reassignment for hierarchy-assigned reports when kpi_report:manage is held', () => {
    mockPermissions = { 'kpi_report:manage': true };
    mockToReview = [report('assigned', 'u-reviewer', 'Parent Reviewer')];
    render(<KpiReportReviewsPage />);
    expect(screen.getByRole('button', { name: 'Alihkan peninjau' })).toBeInTheDocument();
  });

  it('never shows reassignment for top-level root reports (no stored reviewer)', () => {
    mockPermissions = { 'kpi_report:manage': true };
    mockToReview = [
      report('assigned', 'u-reviewer', 'Parent Reviewer'),
      report('root', null, null),
    ];
    render(<KpiReportReviewsPage />);
    const reassignButtons = screen.getAllByRole('button', { name: 'Alihkan peninjau' });
    expect(reassignButtons).toHaveLength(1); // exactly the hierarchy-assigned report
  });

  it('surfaces a self-review rejection as the recoverable banner (backend remains authority)', () => {
    mockRecoverable = { kind: 'own-report', message: 'You cannot review your own report.', refetch: true };
    render(<KpiReportReviewsPage />);
    expect(screen.getByText('You cannot review your own report.')).toBeInTheDocument();
  });

  it('does not render the legacy My Reports / Review Queue tab toggle', () => {
    render(<KpiReportReviewsPage />);
    expect(allText()).not.toMatch(/Review Queue/);
    expect(allText()).not.toMatch(/To Review/);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});
