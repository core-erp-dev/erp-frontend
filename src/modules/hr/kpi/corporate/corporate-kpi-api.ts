import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { CorporateKpiNode } from './corporate-kpi.types';

/**
 * Corporate KPI read API — P1.1 only.
 * All methods unwrap ApiResponse<T>.data before returning.
 */
export const corporateKpiApi = {
  /**
   * Fetch the non-deleted hierarchy tree for a given year.
   * GET /api/v1/corporate-kpis/tree?year={year}
   * Permission: corporate_kpi:read
   */
  getTreeByYear: async (year: number): Promise<CorporateKpiNode[]> => {
    const response = await api.get<ApiResponse<CorporateKpiNode[]>>(
      '/api/v1/corporate-kpis/tree',
      { params: { year } },
    );
    return response.data.data;
  },

  /**
   * Fetch all soft-deleted KPIs (flat list, all years).
   * GET /api/v1/corporate-kpis/deleted
   * Permission: corporate_kpi:read_deleted
   */
  getDeleted: async (): Promise<CorporateKpiNode[]> => {
    const response = await api.get<ApiResponse<CorporateKpiNode[]>>(
      '/api/v1/corporate-kpis/deleted',
    );
    return response.data.data;
  },
};

/** Convenience wrapper around extractErrorMessage with a KPI-appropriate fallback. */
export function extractKpiError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load Corporate KPIs.');
}
