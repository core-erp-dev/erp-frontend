import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  ChangeStructureStatusRequest,
  CorporateKpiStructure,
  CreateStructureRequest,
} from './corporate-kpi.types';

/**
 * Yearly Corporate KPI structure API — the lifecycle aggregate.
 * Structures are created explicitly (DRAFT), activated as a whole (validation
 * covers every indicator), and their configuration is frozen while ACTIVE.
 */
export const corporateKpiStructuresApi = {
  list: async (): Promise<CorporateKpiStructure[]> => {
    const response = await api.get<ApiResponse<CorporateKpiStructure[]>>(
      '/api/v1/corporate-kpi-structures',
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<CorporateKpiStructure> => {
    const response = await api.get<ApiResponse<CorporateKpiStructure>>(
      `/api/v1/corporate-kpi-structures/${id}`,
    );
    return response.data.data;
  },

  create: async (payload: CreateStructureRequest): Promise<CorporateKpiStructure> => {
    const response = await api.post<ApiResponse<CorporateKpiStructure>>(
      '/api/v1/corporate-kpi-structures',
      payload,
    );
    return response.data.data;
  },

  changeStatus: async (id: string, payload: ChangeStructureStatusRequest): Promise<CorporateKpiStructure> => {
    const response = await api.patch<ApiResponse<CorporateKpiStructure>>(
      `/api/v1/corporate-kpi-structures/${id}/status`,
      payload,
    );
    return response.data.data;
  },

  deleteStructure: async (id: string): Promise<void> => {
    await api.patch<ApiResponse<void>>(`/api/v1/corporate-kpi-structures/${id}/delete`);
  },

  restoreStructure: async (id: string): Promise<CorporateKpiStructure> => {
    const response = await api.post<ApiResponse<CorporateKpiStructure>>(
      `/api/v1/corporate-kpi-structures/${id}/restore`,
    );
    return response.data.data;
  },
};

/** Read-error wrapper. */
export function extractStructureError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load Corporate KPI structures.');
}
