import { api } from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
  OrganizationUnitResponse,
  OrganizationUnitFilterParams,
  OrganizationUnitTreeResponse,
  CreateOrganizationUnitRequest,
  UpdateOrganizationUnitRequest,
} from '../types';

export const organizationUnitApi = {
  getFilteredUnits: async (
    params?: OrganizationUnitFilterParams,
  ): Promise<PaginatedResponse<OrganizationUnitResponse>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<OrganizationUnitResponse>>>(
      '/api/v1/organization-units',
      { params },
    );
    return response.data.data;
  },

  getUnitTree: async (): Promise<OrganizationUnitResponse[]> => {
    const response = await api.get<ApiResponse<OrganizationUnitTreeResponse>>(
      '/api/v1/organization-units/tree',
    );
    const tree = response.data?.data?.tree;
    return Array.isArray(tree) ? tree : [];
  },

  createUnit: async (data: CreateOrganizationUnitRequest): Promise<OrganizationUnitResponse> => {
    const response = await api.post<ApiResponse<OrganizationUnitResponse>>(
      '/api/v1/organization-units',
      data,
    );
    return response.data.data;
  },

  updateUnit: async (id: string, data: UpdateOrganizationUnitRequest): Promise<OrganizationUnitResponse> => {
    const response = await api.put<ApiResponse<OrganizationUnitResponse>>(
      `/api/v1/organization-units/${id}`,
      data,
    );
    return response.data.data;
  },

  getUnitById: async (id: string): Promise<OrganizationUnitResponse> => {
    const response = await api.get<ApiResponse<OrganizationUnitResponse>>(
      `/api/v1/organization-units/${id}`,
    );
    return response.data.data;
  },

  deleteUnit: async (id: string): Promise<void> => {
    await api.patch(`/api/v1/organization-units/${id}/delete`);
  },

  restoreUnit: async (id: string): Promise<OrganizationUnitResponse> => {
    const response = await api.post<ApiResponse<OrganizationUnitResponse>>(
      `/api/v1/organization-units/${id}/restore`,
    );
    return response.data.data;
  },
};
