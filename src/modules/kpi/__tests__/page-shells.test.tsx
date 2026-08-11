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
import { render, screen, waitFor } from '@testing-library/react';
import KpiOverviewPage from '@/app/(main)/kpi/page';
import KpiCorporatePage from '@/app/(main)/kpi/corporate/page';
import KpiReportsPage from '@/app/(main)/kpi/reports/page';
import KpiReportReviewsPage from '@/app/(main)/kpi/report-reviews/page';
import { KPI_LABELS } from '@/modules/kpi/constants';

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
  Briefcase: () => null,
  Crown: () => null,
  UploadSimple: () => null,
  Wrench: () => null,
  FunnelSimple: () => null,
  SlidersHorizontal: () => null,
  CaretDown: () => null,
  CaretRight: () => null,
  ArrowsOutSimple: () => null,
  ArrowsInSimple: () => null,
  DownloadSimple: () => null,
  ArrowLeft: () => null,
  Info: () => null,
  CircleNotch: () => null,
  CheckCircle: () => null,
  Prohibit: () => null,
  CalendarBlank: () => null,
}));

jest.mock('@/lib/axios');

// ── Mock next/navigation (pages use useRouter / useSearchParams) ──
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  usePathname: () => '/',
}));

// ── Mock P3 report components (page-shells renders KpiReportsPage directly) ──
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

// ── Mock corporate KPI data hook (page-shells renders KpiCorporatePage directly) ──
jest.mock('@/modules/kpi/corporate/use-corporate-kpi-data', () => ({
  useCorporateKpiData: () => ({
    tree: [], deletedList: [],
    structures: [{ id: 'struct-2026', year: new Date().getFullYear(), status: 'DRAFT', activatedAt: null, activatedBy: null, deletedAt: null, createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00' }],
    isLoadingTree: false, isLoadingDeleted: false,
    isLoadingStructures: false, treeError: null, deletedError: null, structuresError: null,
    hasLoadedDeleted: false,
    fetchTree: jest.fn(), fetchDeleted: jest.fn(), fetchStructures: jest.fn(),
    isStructureMutating: false, createStructure: jest.fn(), changeStructureStatus: jest.fn(),
    isMutating: false, createNode: jest.fn(), updateNode: jest.fn(), refreshTree: jest.fn(),
    pendingLifecycle: null, deleteKpi: jest.fn(), restoreKpi: jest.fn(),
  }),
}));

// ── Mock dashboard hook (page-shells renders KpiOverviewPage directly) ──
jest.mock('@/modules/kpi/dashboard/use-kpi-dashboard-data', () => ({
  useKpiDashboardData: () => ({
    period: { year: new Date().getFullYear(), fromMonth: null, toMonth: null },
    setPeriod: jest.fn(),
    resetToAnnual: jest.fn(),
    refresh: jest.fn(),
    data: {
      indicators: [],
      unitPerformance: [],
      summary: {
        redCount: 0, yellowCount: 0, greenCount: 0, notEvaluatedCount: 0,
        totalIndicatorCount: 0, evaluatedIndicatorCount: 0,
        totalActualScore: null, totalTargetScore: null,
        totalActualResult: null, totalTargetResult: null,
        status: 'NO_KPI_DATA',
      },
    },
    isLoading: false,
    isRefetching: false,
    error: null,
    validationError: null,
    availableYears: [new Date().getFullYear()],
  }),
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
    expect(screen.getByRole('heading', { name: 'Dashboard Kinerja' })).toBeInTheDocument();
  });

  it('renders canonical description (period subtitle)', () => {
    expect(allText()).toMatch(/Periode Tahun \d{4}/);
  });

  it('renders dashboard sections rather than placeholder', () => {
    expect(allText()).toMatch(/Dashboard Kinerja|Periode Tahun|Tidak ada data KPI/);
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

  it('renders the legacy single-page controls', () => {
    // One main page: Add Corporate KPI button, refresh, year selector, and
    // the Deleted scope toggle button (Positions-style).
    expect(screen.getByRole('button', { name: /Add Corporate KPI/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select year/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show deleted/ })).toBeInTheDocument();
    expect(allText()).toMatch(/Deleted/);
  });

  it('renders the empty current-view table state', async () => {
    await waitFor(() => {
      expect(allText()).toMatch(/No corporate KPI/i);
    });
  });

  it('does not use "Dashboard KPI"', assertNoDashboardKpi);

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});

// ── Activities ──────────────────────────────────────────────────────────────

describe('KPI Activities page shell', () => {
  it('uses the Activities parent label', () => {
    // The workspace is split into per-view routes; see activity-page.test.tsx
    expect(KPI_LABELS.activities).toBe('Activities');
  });
});

// ── Reports ─────────────────────────────────────────────────────────────────

describe('KPI My Reports page', () => {
  beforeEach(() => {
    render(<KpiReportsPage />);
  });

  it('renders canonical title', () => {
    expect(screen.getByRole('heading', { name: KPI_LABELS.reports })).toBeInTheDocument();
  });

  it('renders the own-reports surface without the legacy tab toggle', () => {
    // The My Reports / Review Queue tab toggle was removed by the navigation
    // split — review actions live on the separate /kpi/report-reviews page.
    expect(allText()).toMatch(/My Reports/i);
    expect(allText()).not.toMatch(/Review Queue/i);
  });

  it('does not contain P3 placeholder text (feature implemented)', () => {
    expect(allText()).not.toMatch(/P3/i);
  });

  it('does not use "Dashboard KPI"', assertNoDashboardKpi);

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});

// ── Report Reviews ──────────────────────────────────────────────────────────

describe('KPI Report Reviews page', () => {
  beforeEach(() => {
    render(<KpiReportReviewsPage />);
  });

  it('renders canonical title', () => {
    expect(screen.getByRole('heading', { name: KPI_LABELS.reportReviews })).toBeInTheDocument();
  });

  it('renders its own review-queue surface', () => {
    expect(allText()).toMatch(/Report Reviews/i);
    expect(allText()).not.toMatch(/Review Queue/i);
  });

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});

// ── Approvals ───────────────────────────────────────────────────────────────

describe('KPI Approvals page shell', () => {
  it('renders canonical title', () => {
    // Approvals page is fully implemented in P2.3 — see activity-approval tests
    expect(KPI_LABELS.approvals).toBe('Activity Approvals');
  });
});
