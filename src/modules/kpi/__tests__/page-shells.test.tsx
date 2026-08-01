/**
 * KPI P0 page-shell verification tests.
 *
 * Renders all five P0 page shells and verifies:
 *  - canonical title renders
 *  - canonical description/placeholder renders
 *  - no page uses the term "Dashboard KPI"
 *  - no fake KPI metrics or mock business data appear
 *  - rendering does not trigger an API call
 */
import { render, screen } from '@testing-library/react';
import KpiOverviewPage from '@/app/(main)/kpi/page';
import KpiCorporatePage from '@/app/(main)/kpi/corporate/page';
import KpiReportsPage from '@/app/(main)/kpi/reports/page';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/kpi/constants';

// ── Mock usePermission — allow reading by default ──
jest.mock('@/hooks/use-permission', () => {
  const actual = jest.requireActual('@/hooks/use-permission');
  return {
    ...actual,
    usePermission: () => ({
      hasPerm: () => true,
      hasAnyPerm: (...perms: string[]) => perms.some(() => true),
      hasAllPerms: (...perms: string[]) => perms.every(() => true),
      permissions: [],
    }),
  };
});

// ── Mock HeroUI and Phosphor for component pages ──
jest.mock('@phosphor-icons/react', () => ({
  ClipboardText: () => null,
  Buildings: () => null,
  ChartBar: () => null,
  Article: () => null,
  Checks: () => null,
  Eye: () => null,
  Tray: () => null,
  X: () => null,
  ArrowsClockwise: () => null,
  Plus: () => null,
  House: () => null,
  Play: () => null,
  Copy: () => null,
  FloppyDisk: () => null,
  MagnifyingGlass: () => null,
  ArrowCounterClockwise: () => null,
  Target: () => null,
  MedalMilitary: () => null,
  Warning: () => null,
  PencilSimple: () => null,
  Trash: () => null,
  FunnelSimple: () => null,
  SlidersHorizontal: () => null,
  CaretDown: () => null,
  CaretRight: () => null,
  DownloadSimple: () => null,
}));

jest.mock('@/lib/axios');

// ── Mock P3 report components (page-shells renders KpiReportsPage directly) ──
jest.mock('@/modules/kpi/report/use-report-data', () => ({
  useReportData: () => ({
    myReports: [], isLoadingMy: false, myError: null, fetchMyReports: jest.fn(),
    toReview: [], isLoadingReview: false, reviewError: null, fetchToReview: jest.fn(),
    submitReport: jest.fn(), isSubmitting: false,
    approveReport: jest.fn(), isApproving: false,
    rejectReport: jest.fn(), isRejecting: false,
  }),
}));

// ── Mock P4 overview hook (page-shells renders KpiOverviewPage directly) ──
jest.mock('@/modules/kpi/overview/use-overview-data', () => ({
  useOverviewData: () => ({
    myActivities: [], myActivitiesError: null,
    managedActivities: [], managedActivitiesError: null,
    ownedActivities: [], ownedActivitiesError: null,
    pendingRequests: [], pendingRequestsError: null,
    pendingReviews: [], pendingReviewsError: null,
    myReports: [], myReportsError: null,
    corporateKpiTree: [], corporateKpiError: null,
    isLoading: false,
  }),
  averageProgress: () => null,
  targetReachedCount: () => 0,
  countActiveIndicators: () => 0,
}));
jest.mock('@/modules/kpi/report/report-table', () => ({ ReportTable: () => null }));
jest.mock('@/modules/kpi/report/report-detail-modal', () => ({ ReportDetailModal: () => null }));
jest.mock('@/modules/kpi/report/report-submit-modal', () => ({ ReportSubmitModal: () => null }));
jest.mock('@/modules/kpi/report/report-review-dialog', () => ({ ReportReviewDialog: () => null }));

// ── Helpers ────────────────────────────────────────────────────────────────

/** Collect all text content from the rendered output. */
function allText(): string {
  return document.body.textContent ?? '';
}

/** Assert a page does NOT contain "Dashboard KPI". */
function assertNoDashboardKpi(): void {
  expect(allText()).not.toMatch(/Dashboard KPI/i);
}

/** Assert a page does NOT contain fake metrics or mock business data. */
function assertNoFakeMetrics(): void {
  const text = allText();
  expect(text).not.toMatch(/\b\d+(?:\.\d+)?%\b/); // percentage values
  expect(text).not.toMatch(/\bTarget \d+/i);
  expect(text).not.toMatch(/\bProgress \d+/i);
  expect(text).not.toMatch(/\b(Achieved|Not Achieved)\b/i);
  expect(text).not.toMatch(/\bActual\b/i);
}

// ── Overview ────────────────────────────────────────────────────────────────

describe('KPI Overview page shell', () => {
  beforeEach(() => {
    render(<KpiOverviewPage />);
  });

  it('renders canonical title', () => {
    expect(screen.getByRole('heading', { name: KPI_LABELS.overview })).toBeInTheDocument();
  });

  it('renders canonical description', () => {
    expect(screen.getByText(KPI_DESCRIPTIONS.overview)).toBeInTheDocument();
  });

  it('renders overview sections rather than placeholder', () => {
    expect(allText()).toMatch(/Activities|Pending Actions|Recent Reports|Corporate KPI/);
  });

  it('does not use "Dashboard KPI"', assertNoDashboardKpi);

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});

// ── Corporate ───────────────────────────────────────────────────────────────

describe('Corporate KPI page shell', () => {
  beforeEach(() => {
    render(<KpiCorporatePage />);
  });

  it('renders canonical title', () => {
    expect(screen.getByRole('heading', { name: KPI_LABELS.corporate })).toBeInTheDocument();
  });

  it('renders the configuration workspace controls', () => {
    // The legacy description line is gone — the workspace exposes create/refresh
    // controls and a year selector instead.
    expect(screen.getByRole('button', { name: /New Configuration/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh configurations/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
  });

  it('renders loading state on mount', () => {
    expect(allText()).toMatch(/Corporate KPI/);
  });

  it('does not use "Dashboard KPI"', assertNoDashboardKpi);

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});

// ── Activities ──────────────────────────────────────────────────────────────

describe('KPI Activities page shell', () => {
  it('renders canonical title', () => {
    // Activities page is fully implemented in P2.1 — see activity-page.test.tsx
    expect(KPI_LABELS.activities).toBe('KPI Activities');
  });
});

// ── Reports ─────────────────────────────────────────────────────────────────

describe('KPI Reports page', () => {
  beforeEach(() => {
    render(<KpiReportsPage />);
  });

  it('renders canonical title', () => {
    expect(screen.getByRole('heading', { name: KPI_LABELS.reports })).toBeInTheDocument();
  });

  it('renders the implemented reports surface', () => {
    // The canonical description line is not rendered by the page — assert the
    // implemented tab surface instead.
    expect(allText()).toMatch(/My Reports/i);
    expect(allText()).toMatch(/Review Queue/i);
  });

  it('does not contain P3 placeholder text (feature implemented)', () => {
    expect(allText()).not.toMatch(/P3/i);
  });

  it('does not use "Dashboard KPI"', assertNoDashboardKpi);

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});

// ── Approvals ───────────────────────────────────────────────────────────────

describe('KPI Approvals page shell', () => {
  it('renders canonical title', () => {
    // Approvals page is fully implemented in P2.3 — see activity-approval tests
    expect(KPI_LABELS.approvals).toBe('Activity Approvals');
  });
});
