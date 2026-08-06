import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  UnitPerformanceRow,
  CreateUnitPerformanceRequest,
  UpdateUnitPerformanceRequest,
} from './unit-performance.types';

/** Unit Performance API — computed list + weight CRUD. */
export const unitPerformanceApi = {
  /**
   * @param month optional — omitted = yearly evaluation (mirrors the
   * Corporate KPI tree: monthly = selected year+month, yearly = full year).
   */
  getPerformance: async (year: number, month?: number): Promise<UnitPerformanceRow[]> => {
    const response = await api.get<ApiResponse<UnitPerformanceRow[]>>(
      '/api/v1/unit-performances',
      { params: month != null ? { year, month } : { year } },
    );
    return response.data.data;
  },

  create: async (payload: CreateUnitPerformanceRequest): Promise<UnitPerformanceRow> => {
    const response = await api.post<ApiResponse<UnitPerformanceRow>>(
      '/api/v1/unit-performances',
      payload,
    );
    return response.data.data;
  },

  update: async (id: string, payload: UpdateUnitPerformanceRequest): Promise<UnitPerformanceRow> => {
    const response = await api.put<ApiResponse<UnitPerformanceRow>>(
      `/api/v1/unit-performances/${id}`,
      payload,
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.patch(`/api/v1/unit-performances/${id}/delete`);
  },
};

/** Read-error wrapper. */
export function extractUnitPerformanceError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load unit performance.');
}
