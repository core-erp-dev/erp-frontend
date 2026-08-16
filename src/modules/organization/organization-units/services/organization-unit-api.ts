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
    // Defensive normalization — the page renders with .map/.length, so the
    // payload must never surface an undefined content array.
    const data = response.data?.data;
    return {
      content: Array.isArray(data?.content) ? data.content : [],
      page: data?.page ?? 1,
      size: data?.size ?? 10,
      totalElements: data?.totalElements ?? 0,
      totalPages: data?.totalPages ?? 0,
      last: data?.last ?? true,
    };
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
