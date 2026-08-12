import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  UnitPerformanceRow,
  CreateUnitPerformanceRequest,
  UnitPerformanceWeightMatrix,
  UpdateUnitPerformanceWeightMatrixRequest,
} from './unit-performance.types';

/** Unit Performance API — computed contribution rows + participant registry + weight matrix. */
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

  delete: async (id: string): Promise<void> => {
    await api.patch(`/api/v1/unit-performances/${id}/delete`);
  },

  /** Central matrix contract — indicators, participating units, weights, totals, completeness. */
  getWeightMatrix: async (year: number): Promise<UnitPerformanceWeightMatrix> => {
    const response = await api.get<ApiResponse<UnitPerformanceWeightMatrix>>(
      '/api/v1/unit-performances/weight-matrix',
      { params: { year } },
    );
    return response.data.data;
  },

  /** Atomically replaces the whole matrix for the year. */
  saveWeightMatrix: async (
    year: number,
    payload: UpdateUnitPerformanceWeightMatrixRequest,
  ): Promise<UnitPerformanceWeightMatrix> => {
    const response = await api.put<ApiResponse<UnitPerformanceWeightMatrix>>(
      '/api/v1/unit-performances/weight-matrix',
      payload,
      { params: { year } },
    );
    return response.data.data;
  },
};

/** Read-error wrapper. */
export function extractUnitPerformanceError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load unit performance.');
}
