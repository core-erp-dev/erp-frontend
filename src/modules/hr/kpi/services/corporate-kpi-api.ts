import { api } from '@/lib/axios';
import {
  ApiResponse,
  CorporateKpiResponse,
  CreateCorporateKpiRequest,
  UpdateCorporateKpiRequest,
} from '../types';

export const corporateKpiApi = {
  getAll: async (periodYear?: number): Promise<CorporateKpiResponse[]> => {
    const response = await api.get<ApiResponse<CorporateKpiResponse[]>>(
      '/api/v1/kpi/corporate',
      { params: { periodYear } },
    );
    return response.data.data;
  },

  getTree: async (periodYear?: number): Promise<CorporateKpiResponse[]> => {
    const response = await api.get<ApiResponse<CorporateKpiResponse[]>>(
      '/api/v1/kpi/corporate/tree',
      { params: { periodYear } },
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<CorporateKpiResponse> => {
    const response = await api.get<ApiResponse<CorporateKpiResponse>>(
      `/api/v1/kpi/corporate/${id}`,
    );
    return response.data.data;
  },

  create: async (data: CreateCorporateKpiRequest): Promise<CorporateKpiResponse> => {
    const response = await api.post<ApiResponse<CorporateKpiResponse>>(
      '/api/v1/kpi/corporate',
      data,
    );
    return response.data.data;
  },

  update: async (id: string, data: UpdateCorporateKpiRequest): Promise<CorporateKpiResponse> => {
    const response = await api.put<ApiResponse<CorporateKpiResponse>>(
      `/api/v1/kpi/corporate/${id}`,
      data,
    );
    return response.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/kpi/corporate/${id}`);
  },
};
