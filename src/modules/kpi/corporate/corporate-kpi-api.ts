import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { CorporateKpiNode, CreateKpiRequest, UpdateKpiRequest, ChangeStatusRequest } from './corporate-kpi.types';

/** Corporate KPI API — reads + create/update + lifecycle against the variables-contract backend. */
export const corporateKpiApi = {
  /* ── Read ── */

  /** @param month optional — computed scoring fields are only populated when month is provided. */
  getTreeByYear: async (year: number, month?: number): Promise<CorporateKpiNode[]> => {
    const response = await api.get<ApiResponse<CorporateKpiNode[]>>(
      '/api/v1/corporate-kpis/tree',
      { params: month != null ? { year, month } : { year } },
    );
    return response.data.data;
  },

  getDeleted: async (): Promise<CorporateKpiNode[]> => {
    const response = await api.get<ApiResponse<CorporateKpiNode[]>>(
      '/api/v1/corporate-kpis/deleted',
    );
    return response.data.data;
  },

  /* ── Mutations ── */

  create: async (payload: CreateKpiRequest): Promise<CorporateKpiNode> => {
    const response = await api.post<ApiResponse<CorporateKpiNode>>(
      '/api/v1/corporate-kpis',
      payload,
    );
    return response.data.data;
  },

  update: async (id: string, payload: UpdateKpiRequest): Promise<CorporateKpiNode> => {
    const response = await api.put<ApiResponse<CorporateKpiNode>>(
      `/api/v1/corporate-kpis/${id}`,
      payload,
    );
    return response.data.data;
  },

  /* ── Lifecycle ── */

  changeStatus: async (id: string, payload: ChangeStatusRequest): Promise<CorporateKpiNode> => {
    const response = await api.patch<ApiResponse<CorporateKpiNode>>(
      `/api/v1/corporate-kpis/${id}/status`,
      payload,
    );
    return response.data.data;
  },

  deleteNode: async (id: string): Promise<void> => {
    await api.patch<ApiResponse<void>>(`/api/v1/corporate-kpis/${id}/delete`);
  },

  restoreNode: async (id: string): Promise<CorporateKpiNode> => {
    const response = await api.post<ApiResponse<CorporateKpiNode>>(
      `/api/v1/corporate-kpis/${id}/restore`,
    );
    return response.data.data;
  },
};

/** Read-error wrapper. */
export function extractKpiError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load Corporate KPIs.');
}
