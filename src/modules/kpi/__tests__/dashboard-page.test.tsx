/**
 * KPI Dashboard page tests ("Dashboard Kinerja").
 * Covers: BOTH-permissions guard (one permission => Akses Ditolak), status
 * cards with backend counts, card click filters the indicator list without
 * touching the backend summary, the Semua tab keeps every indicator, non-OK
 * rows land in Tidak Dievaluasi with a user-friendly reason, 0 is a valid
 * value, null renders as "—", and loading / error / empty states.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardPage from '@/app/(main)/page';
import { buildDashboardResponse } from '@/modules/kpi/dashboard/test-fixtures';
import type { KpiDashboardResponse } from '@/modules/kpi/dashboard/kpi-dashboard.types';

/* ── Mock permissions (mutable per test) ── */
let mockPerms: string[] = [];
jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => {
    const perms = mockPerms;
    return {
      hasPerm: (p: string) => perms.includes(p),
      hasAnyPerm: (...ps: string[]) => ps.some((p) => perms.includes(p)),
      hasAllPerms: (...ps: string[]) => ps.every((p) => perms.includes(p)),
      permissions: perms,
    };
  },
}));

/* ── Mock dashboard data hook (page-level) ── */
let mockDashboard: Partial<ReturnType<typeof import('../dashboard/use-kpi-dashboard-data').useKpiDashboardData>> = {};
jest.mock('@/modules/kpi/dashboard/use-kpi-dashboard-data', () => ({
  useKpiDashboardData: () => mockDashboard,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@phosphor-icons/react', () => ({
  ChartBar: () => null,
  ArrowLeft: () => null,
  House: () => null,
  ArrowsClockwise: () => null,
  CalendarBlank: () => null,
  Warning: () => null,
  CircleNotch: () => null,
  CheckCircle: () => null,
  Prohibit: () => null,
  Info: () => null,
  Buildings: () => null,
}));

const okDashboard = buildDashboardResponse();

function mockSuccess(payload: KpiDashboardResponse = okDashboard) {
  mockDashboard = {
    period: { year: 2026, fromMonth: null, toMonth: null },
    setPeriod: jest.fn(),
    resetToAnnual: jest.fn(),
    refresh: jest.fn(),
    data: payload,
    isLoading: false,
    isRefetching: false,
    error: null,
    validationError: null,
    availableYears: [2026, 2025],
  };
}

describe('DashboardPage guard', () => {
  beforeEach(() => { mockPerms = []; mockDashboard = {}; });

  it('shows Akses Ditolak when the user has only one of the two permissions', () => {
    mockPerms = ['corporate_kpi:read'];
    render(<DashboardPage />);
    expect(screen.getByText('Akses Ditolak')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Kinerja')).not.toBeInTheDocument();
  });

  it('shows Akses Ditolak with only unit_performance:read', () => {
    mockPerms = ['unit_performance:read'];
    render(<DashboardPage />);
    expect(screen.getByText('Akses Ditolak')).toBeInTheDocument();
  });

  it('renders the dashboard when BOTH permissions are present', () => {
    mockPerms = ['corporate_kpi:read', 'unit_performance:read'];
    mockSuccess();
    render(<DashboardPage />);
    expect(screen.queryByText('Akses Ditolak')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard Kinerja')).toBeInTheDocument();
  });
});

describe('DashboardPage content', () => {
  beforeEach(() => {
    mockPerms = ['corporate_kpi:read', 'unit_performance:read'];
    mockSuccess();
  });

  it('shows the four status cards with backend counts', () => {
    render(<DashboardPage />);
    // Cards are reachable by their aria-label (the word "Merah" also appears
    // as a row label inside the indicator list, so role queries are used).
    expect(screen.getByRole('button', { name: 'Filter indikator Merah' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter indikator Kuning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter indikator Hijau' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter indikator Tidak Dievaluasi' })).toBeInTheDocument();
    // Counts come straight from summary (1 red, 1 yellow, 1 green, 2 not evaluated).
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the four backend totals', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Skor Capaian')).toBeInTheDocument();
    expect(screen.getByText('Skor Target')).toBeInTheDocument();
    expect(screen.getByText('Nilai Capaian')).toBeInTheDocument();
    expect(screen.getByText('Nilai Target')).toBeInTheDocument();
  });

  it('shows null totals as "—" (never 0)', () => {
    mockSuccess(buildDashboardResponse({
      summary: {
        ...okDashboard.summary,
        totalActualScore: null, totalTargetScore: null,
        totalActualResult: null, totalTargetResult: null,
        status: 'NO_KPI_DATA',
      },
    }));
    render(<DashboardPage />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('keeps a zero achievement visible as a real value, not a dash', () => {
    mockSuccess(buildDashboardResponse({
      indicators: okDashboard.indicators.map((ind, i) =>
        i === 0 ? { ...ind, actualScore: 0, achievement: 0 } : ind),
    }));
    render(<DashboardPage />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows all indicators on the Semua tab and filters by card click', () => {
    render(<DashboardPage />);

    // Semua tab — all 5 indicators (incl. both non-OK rows).
    expect(screen.getByText('ROE')).toBeInTheDocument();
    expect(screen.getByText('Ratio Diklat')).toBeInTheDocument();
    expect(screen.getByText('Tekanan Layanan')).toBeInTheDocument();

    // Click the Merah card → only the RED indicator remains in the list.
    fireEvent.click(screen.getByRole('button', { name: 'Filter indikator Merah' }));
    expect(screen.getByText('ROE')).toBeInTheDocument();
    expect(screen.queryByText('Ratio Diklat')).not.toBeInTheDocument();
    expect(screen.queryByText('Cakupan Layanan')).not.toBeInTheDocument();
    // The backend summary is untouched by display filtering.
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(3);
  });

  it('places non-OK indicators under Tidak Dievaluasi with a friendly reason', () => {
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter indikator Tidak Dievaluasi' }));

    expect(screen.getByText('Ratio Diklat')).toBeInTheDocument();
    expect(screen.getByText('Tekanan Layanan')).toBeInTheDocument();
    expect(screen.queryByText('ROE')).not.toBeInTheDocument();
    // Reason mapped from reasonCode.
    expect(screen.getByText(/Membutuhkan data tahunan/)).toBeInTheDocument();
    expect(screen.getByText(/Data nilai periode tidak tersedia/)).toBeInTheDocument();
    // Non-OK rows carry NO warning color label — the only remaining "Merah"
    // texts are the status-card labels, never a row-level warning label.
    const rows = screen.getAllByTestId('indicator-row');
    for (const row of rows) {
      expect(row.textContent).not.toMatch(/^Merah$/);
      expect(row.textContent).not.toMatch(/^Kuning$/);
      expect(row.textContent).not.toMatch(/^Hijau$/);
    }
    expect(rows.length).toBe(2);
  });

  it('shows the skeleton while initially loading', () => {
    mockDashboard = {
      ...mockDashboard,
      data: null,
      isLoading: true,
      isRefetching: false,
      error: null,
    };
    render(<DashboardPage />);
    expect(screen.getByText('Dashboard Kinerja')).toBeInTheDocument();
    expect(screen.queryByText('Ringkasan Nilai')).not.toBeInTheDocument();
  });

  it('shows an error state with retry', () => {
    mockDashboard = {
      ...mockDashboard,
      data: null,
      isLoading: false,
      error: 'Gagal memuat dashboard.',
    };
    render(<DashboardPage />);
    expect(screen.getByText('Gagal memuat dashboard.')).toBeInTheDocument();
    expect(screen.getByText('Coba Lagi')).toBeInTheDocument();
  });

  it('shows the empty state when the period has no indicators', () => {
    mockSuccess(buildDashboardResponse({ indicators: [] }));
    render(<DashboardPage />);
    expect(screen.getByText('Belum ada data KPI')).toBeInTheDocument();
    expect(screen.getByText(/Data KPI untuk periode yang dipilih belum tersedia/)).toBeInTheDocument();
    // No status cards / totals / unit chart / zero-filled list on the empty state.
    expect(screen.queryByText('Ringkasan Nilai')).not.toBeInTheDocument();
    expect(screen.queryByText('Performance per Unit')).not.toBeInTheDocument();
    expect(screen.queryByText('Daftar Indikator')).not.toBeInTheDocument();
  });

  it('recovers from data → empty → data without stale UI or reload', () => {
    const { rerender } = render(<DashboardPage />);
    expect(screen.getByText('ROE')).toBeInTheDocument();

    // Switch to an empty period — previous data must disappear.
    mockDashboard = {
      ...mockDashboard,
      data: buildDashboardResponse({ indicators: [] }),
      period: { year: 2020, fromMonth: null, toMonth: null },
      isLoading: false,
    };
    rerender(<DashboardPage />);
    expect(screen.getByText('Belum ada data KPI')).toBeInTheDocument();
    expect(screen.queryByText('ROE')).not.toBeInTheDocument();

    // Back to a data period — the dashboard recovers normally.
    mockSuccess(okDashboard);
    rerender(<DashboardPage />);
    expect(screen.queryByText('Belum ada data KPI')).not.toBeInTheDocument();
    expect(screen.getByText('ROE')).toBeInTheDocument();
  });

  it('blocks a request when the period is invalid and explains why', () => {
    mockDashboard = {
      ...mockDashboard,
      data: null,
      isLoading: false,
      error: null,
      validationError: 'Bulan awal tidak boleh melebihi bulan akhir.',
    };
    render(<DashboardPage />);
    // Shown both inline next to the filter and as a blocking alert.
    expect(screen.getAllByText('Bulan awal tidak boleh melebihi bulan akhir.').length).toBeGreaterThanOrEqual(1);
  });
});
