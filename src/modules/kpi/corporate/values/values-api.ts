import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { VariableValue, BatchVariableValueRequest, SheetPeriod } from './values.types';

/** Corporate KPI Variable Values API — monthly/annual sheets (read) + atomic batch + annual upsert/delete (manage). */
export const valuesApi = {
  /**
   * Input sheet for a period. A month is REQUIRED for the monthly sheet
   * (all active variables); omitting month requests the ANNUAL sheet (only
   * active ANNUAL_REQUIRED variables). The month parameter is deliberately
   * absent from the query when the period is annual — never sent as 0/null/''.
   */
  getSheet: async (period: SheetPeriod): Promise<VariableValue[]> => {
    const params: Record<string, number | string> = {
      year: period.year,
      sortBy: period.sortBy ?? 'name',
      sortDirection: period.sortDirection ?? 'asc',
    };
    if (period.month != null) params.month = period.month;
    const response = await api.get<ApiResponse<VariableValue[]>>(
      '/api/v1/corporate-kpis/variable-values',
      { params },
    );
    return response.data.data;
  },

  /** Atomic batch upsert by natural key (variableId, year, month); month null = annual item. */
  saveBatch: async (payload: BatchVariableValueRequest): Promise<VariableValue[]> => {
    const response = await api.put<ApiResponse<VariableValue[]>>(
      '/api/v1/corporate-kpis/variable-values/batch',
      payload,
    );
    return response.data.data;
  },

  /** Upsert the explicit annual value (month = null) for a variable + year. */
  upsertAnnual: async (variableId: string, year: number, value: number): Promise<VariableValue> => {
    const response = await api.put<ApiResponse<VariableValue>>(
      `/api/v1/corporate-kpis/variable-values/${variableId}/${year}/annual`,
      { value },
    );
    return response.data.data;
  },

  /** Delete the explicit annual value — allowed regardless of the variable's mode. */
  deleteAnnual: async (variableId: string, year: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(
      `/api/v1/corporate-kpis/variable-values/${variableId}/${year}/annual`,
    );
  },

  /** Delete a monthly value by natural key — cleared cells are removed, not nulled. */
  deleteMonthly: async (variableId: string, year: number, month: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(
      `/api/v1/corporate-kpis/variable-values/${variableId}/${year}/${month}`,
    );
  },
};

/** Read-error wrapper. */
export function extractValuesError(error: unknown): string {
  return extractErrorMessage(error, 'Gagal memuat nilai variabel.');
}
