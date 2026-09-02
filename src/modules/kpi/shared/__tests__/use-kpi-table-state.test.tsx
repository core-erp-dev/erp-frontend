import { act, renderHook, waitFor } from '@testing-library/react';
import {
  getLocalTodayIso,
  useKpiTableState,
  type KpiTableStateConfig,
} from '../use-kpi-table-state';

const monthConfig: KpiTableStateConfig = {
  sortOptions: ['activityName', 'createdAt'],
  defaultSort: 'activityName',
  periodFilter: 'month',
};

const dateConfig: KpiTableStateConfig = {
  sortOptions: ['reportDate'],
  defaultSort: 'reportDate',
  periodFilter: 'date',
};

describe('useKpiTableState period URL state', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/kpi/test');
  });

  it('defaults activity to the local current month and year', () => {
    const { result } = renderHook(() => useKpiTableState(monthConfig));
    const today = new Date();

    expect(result.current.filters.periodYear).toBe(today.getFullYear());
    expect(result.current.filters.periodMonth).toBe(today.getMonth() + 1);
    expect(window.location.search).toBe(
      '?year=' + today.getFullYear() + '&month=' + (today.getMonth() + 1),
    );
  });

  it('normalizes invalid activity parameters and resets pagination on period changes', () => {
    window.history.replaceState({}, '', '/kpi/test?year=nope&month=13&page=4');
    const { result } = renderHook(() => useKpiTableState(monthConfig));
    const today = new Date();

    expect(result.current.filters.page).toBe(4);
    expect(result.current.filters.periodYear).toBe(today.getFullYear());
    expect(result.current.filters.periodMonth).toBe(today.getMonth() + 1);

    act(() => result.current.setPeriod(2025, 1));
    expect(result.current.filters.page).toBe(1);
    expect(window.location.search).toBe('?year=2025&month=1');
  });

  it('preserves filter state through pagination and reset restores the local period', () => {
    const { result } = renderHook(() => useKpiTableState(monthConfig));
    act(() => result.current.setPeriod(2025, 8));
    act(() => result.current.setPage(3));

    expect(result.current.filters.page).toBe(3);
    expect(window.location.search).toBe('?year=2025&month=8&page=3');

    act(() => result.current.reset());
    const today = new Date();
    expect(result.current.filters.page).toBe(1);
    expect(result.current.filters.periodYear).toBe(today.getFullYear());
    expect(result.current.filters.periodMonth).toBe(today.getMonth() + 1);
    expect(window.location.search).toBe(
      '?year=' + today.getFullYear() + '&month=' + (today.getMonth() + 1),
    );
  });

  it('uses push history so Back and Forward restore selected activity periods', async () => {
    const { result } = renderHook(() => useKpiTableState(monthConfig));

    act(() => result.current.setPeriod(2025, 1));
    act(() => result.current.setPeriod(2024, 2));
    expect(window.location.search).toBe('?year=2024&month=2');

    act(() => window.history.back());
    await waitFor(() => expect(result.current.filters.periodYear).toBe(2025));
    expect(result.current.filters.periodMonth).toBe(1);

    act(() => window.history.forward());
    await waitFor(() => expect(result.current.filters.periodYear).toBe(2024));
    expect(result.current.filters.periodMonth).toBe(2);
  });

  it('defaults invalid report dates and keeps a selected date as YYYY-MM-DD', () => {
    window.history.replaceState({}, '', '/kpi/test?reportDate=2026-02-30&page=4');
    const { result } = renderHook(() => useKpiTableState(dateConfig));

    expect(result.current.filters.reportDate).toBe(getLocalTodayIso());
    expect(window.location.search).toBe('?reportDate=' + getLocalTodayIso() + '&page=4');

    act(() => result.current.setReportDate('2026-09-01'));
    expect(result.current.filters.page).toBe(1);
    expect(result.current.filters.reportDate).toBe('2026-09-01');
    expect(window.location.search).toBe('?reportDate=2026-09-01');
  });
});
