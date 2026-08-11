/**
 * useKpiDashboardData tests — single request per VALID period, URL as source
 * of truth, invalid periods blocked before any request, initial year
 * resolution from the ACTIVE structure, refetch vs initial loading, errors.
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useKpiDashboardData, pickActiveYear, buildYearOptions } from '../use-kpi-dashboard-data';
import { kpiDashboardApi } from '../kpi-dashboard-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { buildDashboardResponse } from '../test-fixtures';

jest.mock('next/navigation', () => {
  let params = new URLSearchParams();
  let listener: (() => void) | null = null;
  const notify = () => { listener?.(); };
  return {
    useRouter: () => ({
      replace: (url: string) => {
        const query = String(url).split('?')[1] ?? '';
        params = new URLSearchParams(query);
        notify();
      },
      push: jest.fn(),
      back: jest.fn(),
      refresh: jest.fn(),
    }),
    useSearchParams: () => {
      React.useSyncExternalStore(
        (cb) => { listener = cb; return () => { if (listener === cb) listener = null; }; },
        () => params,
      );
      return params;
    },
    __setParams: (next: URLSearchParams) => { params = next; notify(); },
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

  it('ignores a URL year outside the five-year window and falls back to ACTIVE year', async () => {
    nextNavigation.__setParams(new URLSearchParams('year=2020&fromMonth=1&toMonth=3'));
    const { result } = renderHook(() => useKpiDashboardData());

    await waitFor(() => expect(result.current.data).not.toBeNull());

    // 2020 is not inside the dynamic five-year window → the ACTIVE year 2025
    // wins and the API is called with it.
    expect(mockedDashboard.getDashboard).toHaveBeenCalledWith(2025, 1, 3);
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

  it('clears previous data and shows loading when the PERIOD changes (no stale UI)', async () => {
    nextNavigation.__setParams(new URLSearchParams('year=2026'));
    const { result } = renderHook(() => useKpiDashboardData());
    await waitFor(() => expect(result.current.data).not.toBeNull());

    mockedDashboard.getDashboard.mockResolvedValueOnce(
      buildDashboardResponse({ summary: { ...buildDashboardResponse().summary, greenCount: 9 } }),
    );

    act(() => {
      result.current.setPeriod({ fromMonth: 1, toMonth: 3 });
    });

    // Old data must NOT be visible as if it belonged to the new period.
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.summary.greenCount).toBe(9);
    expect(mockedDashboard.getDashboard).toHaveBeenCalledTimes(2);
    expect(mockedDashboard.getDashboard).toHaveBeenLastCalledWith(2026, 1, 3);
  });

  it('keeps current data visible on a same-period refresh (refetch indicator only)', async () => {
    nextNavigation.__setParams(new URLSearchParams('year=2026'));
    const { result } = renderHook(() => useKpiDashboardData());
    await waitFor(() => expect(result.current.data).not.toBeNull());

    mockedDashboard.getDashboard.mockResolvedValueOnce(buildDashboardResponse());
    act(() => {
      result.current.refresh();
    });

    // Same period: the existing data stays, only the refetch indicator is on.
    expect(result.current.data).not.toBeNull();
    expect(result.current.isRefetching).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await waitFor(() => expect(result.current.isRefetching).toBe(false));
    expect(mockedDashboard.getDashboard).toHaveBeenCalledTimes(2);
  });

  it('finishes an empty response as data, not endless loading', async () => {
    mockedDashboard.getDashboard.mockResolvedValueOnce(buildDashboardResponse({ indicators: [] }));
    nextNavigation.__setParams(new URLSearchParams('year=2020'));
    const { result } = renderHook(() => useKpiDashboardData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.indicators).toHaveLength(0);
    expect(result.current.isRefetching).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('buildYearOptions', () => {
  it('always contains the running year plus the four previous years, newest first', () => {
    expect(buildYearOptions(new Date('2026-06-01T00:00:00'))).toEqual([2026, 2025, 2024, 2023, 2022]);
    expect(buildYearOptions(new Date('2031-01-15T00:00:00'))).toEqual([2031, 2030, 2029, 2028, 2027]);
  });

  it('includes 2025 when the running year is 2026 (dynamic, not hardcoded)', () => {
    const options = buildYearOptions(new Date('2026-06-01T00:00:00'));
    expect(options).toContain(2025);
    expect(options).toHaveLength(5);
    expect(options[0]).toBeGreaterThan(options[4]);
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
