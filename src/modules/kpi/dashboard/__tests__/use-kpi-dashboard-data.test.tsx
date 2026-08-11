/**
 * useKpiDashboardData tests — single request per VALID period, URL as source
 * of truth, invalid periods blocked before any request, initial year
 * resolution from the ACTIVE structure, refetch vs initial loading, errors.
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useKpiDashboardData, pickActiveYear } from '../use-kpi-dashboard-data';
import { kpiDashboardApi } from '../kpi-dashboard-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { buildDashboardResponse } from '../test-fixtures';

jest.mock('next/navigation', () => {
  let params = new URLSearchParams();
  let listener: (() => void) | null = null;
  return {
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
    useSearchParams: () => {
      React.useSyncExternalStore(
        (cb) => { listener = cb; return () => { if (listener === cb) listener = null; }; },
        () => params,
      );
      return params;
    },
    __setParams: (next: URLSearchParams) => { params = next; listener?.(); },
  };
});

jest.mock('@/modules/kpi/corporate/corporate-kpi-structures-api', () => ({
  corporateKpiStructuresApi: { list: jest.fn() },
}));
const mockedStructures = jest.mocked(corporateKpiStructuresApi);

jest.mock('../kpi-dashboard-api', () => ({
  kpiDashboardApi: { getDashboard: jest.fn() },
  extractDashboardError: (err: unknown) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal memuat dashboard.',
}));
const mockedDashboard = jest.mocked(kpiDashboardApi);

const nextNavigation = jest.requireMock('next/navigation') as {
  __setParams: (next: URLSearchParams) => void;
};

describe('useKpiDashboardData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nextNavigation.__setParams(new URLSearchParams());
    mockedStructures.list.mockResolvedValue([
      { id: 's-2025', year: 2025, status: 'ACTIVE' },
      { id: 's-2026', year: 2026, status: 'DRAFT' },
    ]);
    mockedDashboard.getDashboard.mockResolvedValue(buildDashboardResponse());
  });

  it('resolves the ACTIVE structure year when the URL has none and fetches once', async () => {
    const { result } = renderHook(() => useKpiDashboardData());

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(mockedDashboard.getDashboard).toHaveBeenCalledTimes(1);
    expect(mockedDashboard.getDashboard).toHaveBeenCalledWith(2025, null, null);
  });

  it('uses the URL year when provided (annual — no month params)', async () => {
    nextNavigation.__setParams(new URLSearchParams('year=2026'));
    const { result } = renderHook(() => useKpiDashboardData());

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(mockedDashboard.getDashboard).toHaveBeenCalledWith(2026, null, null);
    // The structures list is still resolved once (available years) but never
    // replaces the URL year.
    expect(mockedStructures.list).toHaveBeenCalledTimes(1);
  });

  it('sends a single-month period with equal bounds', async () => {
    nextNavigation.__setParams(new URLSearchParams('year=2026&fromMonth=3&toMonth=3'));
    const { result } = renderHook(() => useKpiDashboardData());

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(mockedDashboard.getDashboard).toHaveBeenCalledWith(2026, 3, 3);
  });

  it('sends a partial range as a month pair', async () => {
    nextNavigation.__setParams(new URLSearchParams('year=2026&fromMonth=1&toMonth=3'));
    const { result } = renderHook(() => useKpiDashboardData());

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(mockedDashboard.getDashboard).toHaveBeenCalledWith(2026, 1, 3);
  });

  it('blocks a lone month param — no request, validation error shown', async () => {
    nextNavigation.__setParams(new URLSearchParams('year=2026&fromMonth=2'));
    const { result } = renderHook(() => useKpiDashboardData());

    await waitFor(() => expect(result.current.validationError).not.toBeNull());

    expect(mockedDashboard.getDashboard).not.toHaveBeenCalled();
  });

  it('blocks an inverted range — no request', async () => {
    nextNavigation.__setParams(new URLSearchParams('year=2026&fromMonth=5&toMonth=2'));
    const { result } = renderHook(() => useKpiDashboardData());

    await waitFor(() => expect(result.current.validationError).not.toBeNull());

    expect(mockedDashboard.getDashboard).not.toHaveBeenCalled();
  });

  it('surfaces API errors as a friendly message', async () => {
    mockedDashboard.getDashboard.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Forbidden' } },
    });
    nextNavigation.__setParams(new URLSearchParams('year=2026'));
    const { result } = renderHook(() => useKpiDashboardData());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toContain('Forbidden');
    expect(result.current.data).toBeNull();
  });

  it('keeps previous data while refetching after a period change (no hard reset)', async () => {
    nextNavigation.__setParams(new URLSearchParams('year=2026'));
    const { result } = renderHook(() => useKpiDashboardData());
    await waitFor(() => expect(result.current.data).not.toBeNull());

    mockedDashboard.getDashboard.mockResolvedValueOnce(
      buildDashboardResponse({ summary: { ...buildDashboardResponse().summary, greenCount: 9 } }),
    );

    act(() => {
      nextNavigation.__setParams(new URLSearchParams('year=2026&fromMonth=1&toMonth=3'));
      result.current.setPeriod({ fromMonth: 1, toMonth: 3 });
    });

    expect(result.current.isRefetching).toBe(true);
    expect(result.current.data).not.toBeNull(); // stale data stays visible

    await waitFor(() => expect(result.current.isRefetching).toBe(false));
    expect(result.current.data?.summary.greenCount).toBe(9);
    expect(mockedDashboard.getDashboard).toHaveBeenCalledTimes(2);
  });
});

describe('pickActiveYear', () => {
  it('picks the latest ACTIVE year only', () => {
    expect(pickActiveYear([
      { year: 2024, status: 'INACTIVE' },
      { year: 2025, status: 'ACTIVE' },
      { year: 2026, status: 'DRAFT' },
    ])).toBe(2025);
  });

  it('returns null when no structure is ACTIVE', () => {
    expect(pickActiveYear([{ year: 2026, status: 'DRAFT' }])).toBeNull();
  });
});
