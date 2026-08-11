import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { KpiDashboardResponse } from './kpi-dashboard.types';

/**
 * KPI Dashboard API — one dashboard call per period.
 *
 * Period contract (backend-enforced):
 *   - annual:        { year }                       (no month params at all)
 *   - single month:  { year, fromMonth: m, toMonth: m }
 *   - partial range: { year, fromMonth, toMonth }   (1–12, from ≤ to)
 * A lone month param is never sent; the UI also blocks inverted ranges.
 */
export const kpiDashboardApi = {
  getDashboard: async (
    year: number,
    fromMonth?: number | null,
    toMonth?: number | null,
  ): Promise<KpiDashboardResponse> => {
    const params: Record<string, number> = { year };
    if (fromMonth != null && toMonth != null) {
      params.fromMonth = fromMonth;
      params.toMonth = toMonth;
    }
    const response = await api.get<ApiResponse<KpiDashboardResponse>>(
      '/api/v1/kpi-dashboard',
      { params },
    );
    return response.data.data;
  },
};

/** Read-error wrapper with friendly messages for the dashboard states. */
export function extractDashboardError(error: unknown): string {
  const raw = extractErrorMessage(error, 'Gagal memuat dashboard.');
  if (raw.includes('403') || (error as { response?: { status?: number } })?.response?.status === 403) {
    return 'Anda tidak memiliki akses ke dashboard ini.';
  }
  if ((error as { response?: { status?: number } })?.response?.status === 401) {
    return 'Sesi berakhir — silakan masuk kembali.';
  }
  if ((error as { response?: { status?: number } })?.response?.status === 400) {
    return 'Periode tidak valid. Periksa kembali rentang bulan yang dipilih.';
  }
  return raw;
}
