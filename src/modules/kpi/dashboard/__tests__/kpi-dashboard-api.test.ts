/**
 * KPI Dashboard API tests — period parameter contract.
 * Annual sends NO month params; single month sends the same month twice;
 * a partial range sends the pair. Incomplete/inverted periods are prevented
 * in the UI (hook) and never reach the API layer.
 */
import { kpiDashboardApi, extractDashboardError } from '../kpi-dashboard-api';
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { KpiDashboardResponse } from '../kpi-dashboard.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

const payload: ApiResponse<KpiDashboardResponse> = {
  status: 200,
  message: 'ok',
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
};

describe('kpiDashboardApi.getDashboard', () => {
  beforeEach(() => {
    mockedApi.get.mockResolvedValue({ data: payload } as never);
  });

  it('annual period sends year only — no month params at all', async () => {
    await kpiDashboardApi.getDashboard(2026, null, null);
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-dashboard', { params: { year: 2026 } });
    const params = mockedApi.get.mock.calls[0][1]?.params as Record<string, number>;
    expect(params.fromMonth).toBeUndefined();
    expect(params.toMonth).toBeUndefined();
  });

  it('single month sends the same month as both bounds', async () => {
    await kpiDashboardApi.getDashboard(2026, 3, 3);
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-dashboard', {
      params: { year: 2026, fromMonth: 3, toMonth: 3 },
    });
  });

  it('partial range sends the month pair', async () => {
    await kpiDashboardApi.getDashboard(2026, 1, 3);
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-dashboard', {
      params: { year: 2026, fromMonth: 1, toMonth: 3 },
    });
  });

  it('returns the unwrapped dashboard payload', async () => {
    await expect(kpiDashboardApi.getDashboard(2026, 1, 3)).resolves.toBe(payload.data);
  });
});

describe('extractDashboardError', () => {
  it('maps 403 to a permission message', () => {
    const err = { response: { status: 403, data: { message: 'Forbidden' } } };
    expect(extractDashboardError(err)).toContain('akses');
  });

  it('maps 401 to a session message', () => {
    const err = { response: { status: 401, data: { message: 'Unauthorized' } } };
    expect(extractDashboardError(err)).toContain('Sesi');
  });

  it('maps 400 to an invalid-period message', () => {
    const err = { response: { status: 400, data: { message: 'Bad Request' } } };
    expect(extractDashboardError(err)).toContain('Periode');
  });

  it('falls back to the raw message for other errors', () => {
    expect(extractDashboardError(new Error('network down'))).toBe('network down');
  });
});
