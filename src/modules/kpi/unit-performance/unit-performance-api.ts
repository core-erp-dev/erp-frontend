import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  UnitPerformanceRow,
  UnitPerformanceDetail,
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

  getPerformanceDetail: async (
    id: string,
    year: number,
    month?: number,
  ): Promise<UnitPerformanceDetail> => {
    const response = await api.get<ApiResponse<UnitPerformanceDetail>>(
      `/api/v1/unit-performances/${id}`,
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
    return normalizeWeightMatrix(response.data?.data, year);
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
    return normalizeWeightMatrix(response.data?.data, year);
  },
};

/**
 * Coerce a weight-matrix payload into the canonical contract shape so pages
 * never see a matrix whose collections are `undefined`/`null` (e.g. an empty
 * registry or a payload that omits a collection). A missing/absent payload
 * becomes a well-formed EMPTY matrix — loading and error states stay distinct
 * at the hook level (isLoading / error), this only guarantees shape.
 */
function normalizeWeightMatrix(
  data: UnitPerformanceWeightMatrix | null | undefined,
  year: number,
): UnitPerformanceWeightMatrix {
  return {
    year: data?.year ?? year,
    units: Array.isArray(data?.units) ? data.units : [],
    indicators: Array.isArray(data?.indicators) ? data.indicators : [],
    weights: Array.isArray(data?.weights) ? data.weights : [],
    totals: data?.totals ?? {},
    complete: data?.complete === true,
  };
}

/** Read-error wrapper. */
export function extractUnitPerformanceError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load unit performance.');
}
