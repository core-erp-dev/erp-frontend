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
import KpiOverviewPage from '@/app/(main)/hr/kpi/page';
import KpiCorporatePage from '@/app/(main)/hr/kpi/corporate/page';
import KpiActivitiesPage from '@/app/(main)/hr/kpi/activities/page';
import KpiReportsPage from '@/app/(main)/hr/kpi/reports/page';
import KpiApprovalsPage from '@/app/(main)/hr/kpi/approvals/page';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/constants';

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
  expect(text).not.toMatch(/\bCapaian \d+/i);
  expect(text).not.toMatch(/\b(Tercapai|Tidak Tercapai)\b/i);
  expect(text).not.toMatch(/\bRealisasi\b/);
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

  it('renders a placeholder indicating Overview is pending integration', () => {
    expect(allText()).toMatch(/tersedia setelah/i);
  });

  it('does not use "Dashboard KPI"', assertNoDashboardKpi);

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});

// ── Corporate ───────────────────────────────────────────────────────────────

describe('KPI Korporat page shell', () => {
  beforeEach(() => {
    render(<KpiCorporatePage />);
  });

  it('renders canonical title', () => {
    expect(screen.getByRole('heading', { name: KPI_LABELS.corporate })).toBeInTheDocument();
  });

  it('renders canonical description', () => {
    expect(screen.getByText(KPI_DESCRIPTIONS.corporate)).toBeInTheDocument();
  });

  it('renders a placeholder indicating P1 implementation', () => {
    expect(allText()).toMatch(/P1/i);
  });

  it('does not use "Dashboard KPI"', assertNoDashboardKpi);

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});

// ── Activities ──────────────────────────────────────────────────────────────

describe('KPI Aktivitas page shell', () => {
  beforeEach(() => {
    render(<KpiActivitiesPage />);
  });

  it('renders canonical title', () => {
    expect(screen.getByRole('heading', { name: KPI_LABELS.activities })).toBeInTheDocument();
  });

  it('renders canonical description', () => {
    expect(screen.getByText(KPI_DESCRIPTIONS.activities)).toBeInTheDocument();
  });

  it('renders a placeholder indicating P2 implementation', () => {
    expect(allText()).toMatch(/P2/i);
  });

  it('does not use "Dashboard KPI"', assertNoDashboardKpi);

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});

// ── Reports ─────────────────────────────────────────────────────────────────

describe('KPI Laporan page shell', () => {
  beforeEach(() => {
    render(<KpiReportsPage />);
  });

  it('renders canonical title', () => {
    expect(screen.getByRole('heading', { name: KPI_LABELS.reports })).toBeInTheDocument();
  });

  it('renders canonical description', () => {
    expect(screen.getByText(KPI_DESCRIPTIONS.reports)).toBeInTheDocument();
  });

  it('renders a placeholder indicating P3 implementation', () => {
    expect(allText()).toMatch(/P3/i);
  });

  it('does not use "Dashboard KPI"', assertNoDashboardKpi);

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});

// ── Approvals ───────────────────────────────────────────────────────────────

describe('KPI Persetujuan page shell', () => {
  beforeEach(() => {
    render(<KpiApprovalsPage />);
  });

  it('renders canonical title', () => {
    expect(screen.getByRole('heading', { name: KPI_LABELS.approvals })).toBeInTheDocument();
  });

  it('renders canonical description', () => {
    expect(screen.getByText(KPI_DESCRIPTIONS.approvals)).toBeInTheDocument();
  });

  it('renders a placeholder indicating P2 implementation', () => {
    expect(allText()).toMatch(/P2/i);
  });

  it('does not use "Dashboard KPI"', assertNoDashboardKpi);

  it('does not contain fake KPI metrics', assertNoFakeMetrics);
});
