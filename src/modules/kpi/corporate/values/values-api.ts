import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { VariableValue, BatchVariableValueRequest } from './values.types';

/** Corporate KPI Variable Values API — monthly sheet (read) + atomic batch (manage). */
export const valuesApi = {
  /** Monthly sheet: ALL active variables, value null when no stored row. */
  getSheet: async (year: number, month: number): Promise<VariableValue[]> => {
    const response = await api.get<ApiResponse<VariableValue[]>>(
      '/api/v1/corporate-kpis/variable-values',
      { params: { year, month } },
    );
    return response.data.data;
  },

  /** Atomic batch upsert by natural key (variableId, year, month). */
  saveBatch: async (payload: BatchVariableValueRequest): Promise<VariableValue[]> => {
    const response = await api.put<ApiResponse<VariableValue[]>>(
      '/api/v1/corporate-kpis/variable-values/batch',
      payload,
    );
    return response.data.data;
  },
};

/** Read-error wrapper. */
export function extractValuesError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load variable values.');
}
