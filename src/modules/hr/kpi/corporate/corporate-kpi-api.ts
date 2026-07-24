import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { CorporateKpiNode, CreateKpiRequest, UpdateKpiRequest, ChangeStatusRequest } from './corporate-kpi.types';

/** Corporate KPI API — P1.1 read + P1.2 create/update. */
export const corporateKpiApi = {
  /* ── Read (P1.1) ── */

  getTreeByYear: async (year: number): Promise<CorporateKpiNode[]> => {
    const response = await api.get<ApiResponse<CorporateKpiNode[]>>(
      '/api/v1/corporate-kpis/tree',
      { params: { year } },
    );
    return response.data.data;
  },

  getDeleted: async (): Promise<CorporateKpiNode[]> => {
    const response = await api.get<ApiResponse<CorporateKpiNode[]>>(
      '/api/v1/corporate-kpis/deleted',
    );
    return response.data.data;
  },

  /* ── Mutations (P1.2) ── */

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

  /* ── Lifecycle (P1.3) ── */

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

/** Read-error wrapper (P1.1). */
export function extractKpiError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load Corporate KPIs.');
}
