import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { Variable, CreateVariableRequest, UpdateVariableRequest } from './variables.types';

/** Corporate KPI Variables API — CRUD + soft-delete/restore (manage-gated mutations). */
export const variablesApi = {
  /* ── Reads (corporate_kpi:read) ── */

  list: async (search?: string): Promise<Variable[]> => {
    const response = await api.get<ApiResponse<Variable[]>>(
      '/api/v1/corporate-kpis/variables',
      { params: search ? { search } : {} },
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<Variable> => {
    const response = await api.get<ApiResponse<Variable>>(`/api/v1/corporate-kpis/variables/${id}`);
    return response.data.data;
  },

  /* ── Deleted list (corporate_kpi:manage) ── */

  getDeleted: async (): Promise<Variable[]> => {
    const response = await api.get<ApiResponse<Variable[]>>('/api/v1/corporate-kpis/variables/deleted');
    return response.data.data;
  },

  /* ── Mutations (corporate_kpi:manage) ── */

  create: async (payload: CreateVariableRequest): Promise<Variable> => {
    const response = await api.post<ApiResponse<Variable>>('/api/v1/corporate-kpis/variables', payload);
    return response.data.data;
  },

  update: async (id: string, payload: UpdateVariableRequest): Promise<Variable> => {
    const response = await api.put<ApiResponse<Variable>>(
      `/api/v1/corporate-kpis/variables/${id}`,
      payload,
    );
    return response.data.data;
  },

  softDelete: async (id: string): Promise<void> => {
    await api.patch<ApiResponse<void>>(`/api/v1/corporate-kpis/variables/${id}/delete`);
  },

  restore: async (id: string): Promise<Variable> => {
    const response = await api.post<ApiResponse<Variable>>(`/api/v1/corporate-kpis/variables/${id}/restore`);
    return response.data.data;
  },
};

/** Read-error wrapper. */
export function extractVariablesError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load variables.');
}
