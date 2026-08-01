/**
 * KPI Reports page — permission and tab visibility tests.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { usePermission } from '@/hooks/use-permission';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/kpi/constants';
import KpiReportsPage from '@/app/(main)/kpi/reports/page';

// ── Mock usePermission ──
jest.mock('@/hooks/use-permission', () => ({
  usePermission: jest.fn(),
}));

// ── Use the shared HeroUI mock (jest.config.ts maps @heroui/react) ──

// ── Mock Phosphor — simple null components ──
jest.mock('@phosphor-icons/react', () => ({
  Article: () => null,
  Plus: () => null,
  ArrowsClockwise: () => null,
  House: () => null,
  Eye: () => null,
  Tray: () => null,
  Warning: () => null,
  DownloadSimple: () => null,
  X: () => null,
}));

jest.mock('@/lib/axios');

jest.mock('@/modules/kpi/report/use-report-data', () => ({
  useReportData: () => ({
    myReports: [], isLoadingMy: false, myError: null, fetchMyReports: jest.fn(),
    toReview: [], isLoadingReview: false, reviewError: null, fetchToReview: jest.fn(),
    submitReport: jest.fn(), isSubmitting: false,
    approveReport: jest.fn(), isApproving: false,
    rejectReport: jest.fn(), isRejecting: false,
  }),
}));

jest.mock('@/modules/kpi/report/report-table', () => ({
  ReportTable: () => null,
}));

jest.mock('@/modules/kpi/report/report-detail-modal', () => ({
  ReportDetailModal: () => null,
}));

jest.mock('@/modules/kpi/report/report-submit-modal', () => ({
  ReportSubmitModal: () => null,
}));

jest.mock('@/modules/kpi/report/report-review-dialog', () => ({
  ReportReviewDialog: () => null,
}));

// ── Helper ──
function allText(): string {
  return document.body.textContent ?? '';
}

describe('KPI Reports page — access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Access Denied when user has no report capabilities', () => {
    (usePermission as jest.Mock).mockReturnValue({
      hasPerm: () => false,
      hasAnyPerm: () => false,
    });
    render(<KpiReportsPage />);
    expect(screen.getByRole('heading', { name: KPI_LABELS.reports })).toBeInTheDocument();
    expect(allText()).toMatch(/Access Denied/i);
  });

  it('shows My Reports tab when user has kpi_report:read', () => {
    (usePermission as jest.Mock).mockReturnValue({
      hasPerm: (perm: string) => perm === 'kpi_report:read',
      hasAnyPerm: (...perms: string[]) => perms.includes('kpi_report:read'),
    });
    render(<KpiReportsPage />);
    expect(allText()).toMatch(/My Reports/i);
    expect(allText()).not.toMatch(/Review Queue/i);
  });

  it('shows Review Queue tab when user has kpi_report:review', () => {
    (usePermission as jest.Mock).mockReturnValue({
      hasPerm: (perm: string) => perm === 'kpi_report:review',
      hasAnyPerm: (...perms: string[]) => perms.includes('kpi_report:review'),
    });
    render(<KpiReportsPage />);
    expect(allText()).toMatch(/Review Queue/i);
    expect(allText()).not.toMatch(/My Reports/i);
  });

  it('shows Submit Report button when user has kpi_report:submit AND kpi_activity:read', () => {
    (usePermission as jest.Mock).mockReturnValue({
      hasPerm: (perm: string) => perm === 'kpi_report:submit' || perm === 'kpi_activity:read',
      hasAnyPerm: (...perms: string[]) => perms.includes('kpi_report:submit') || perms.includes('kpi_activity:read'),
    });
    render(<KpiReportsPage />);
    expect(allText()).toMatch(/Submit Report/i);
  });

  it('shows both tabs when user has read and review permissions', () => {
    (usePermission as jest.Mock).mockReturnValue({
      hasPerm: (perm: string) => perm === 'kpi_report:read' || perm === 'kpi_report:review',
      hasAnyPerm: (...perms: string[]) => perms.includes('kpi_report:read') || perms.includes('kpi_report:review'),
    });
    render(<KpiReportsPage />);
    expect(allText()).toMatch(/My Reports/i);
    expect(allText()).toMatch(/Review Queue/i);
  });

  it('shows both tabs and Submit Report with all three capabilities', () => {
    (usePermission as jest.Mock).mockReturnValue({
      hasPerm: () => true,
      hasAnyPerm: () => true,
    });
    render(<KpiReportsPage />);
    expect(allText()).toMatch(/My Reports/i);
    expect(allText()).toMatch(/Review Queue/i);
    expect(allText()).toMatch(/Submit Report/i);
  });
});
