import { api } from '@/lib/axios';
import {
  CoreUser,
  UserCreateRequest,
  UserUpdateRequest,
  AssignUserPositionRequest,
  UserPositionResponse,
  ApiResponse,
  PaginatedResponse,
  RoleResponse,
  PositionOption,
} from '../types';

export interface UserFilterParams {
  search?: string;
  roleCode?: string;
  isActive?: boolean;
  jabatanId?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export const employeeApi = {
  getUsers: async (params?: UserFilterParams): Promise<PaginatedResponse<CoreUser>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<CoreUser>>>(
      '/api/v1/users',
      { params },
    );
    return response.data.data;
  },

  getUserById: async (id: string): Promise<CoreUser> => {
    const response = await api.get<ApiResponse<CoreUser>>(
      `/api/v1/users/${id}`,
    );
    return response.data.data;
  },

  createUser: async (data: UserCreateRequest): Promise<CoreUser> => {
    const response = await api.post<ApiResponse<CoreUser>>(
      '/api/v1/users',
      data,
    );
    return response.data.data;
  },

  updateUser: async (id: string, data: UserUpdateRequest): Promise<CoreUser> => {
    const response = await api.put<ApiResponse<CoreUser>>(
      `/api/v1/users/${id}`,
      data,
    );
    return response.data.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/users/${id}`);
  },

  assignUserToPosition: async (
    data: AssignUserPositionRequest,
  ): Promise<UserPositionResponse> => {
    const response = await api.post<ApiResponse<UserPositionResponse>>(
      '/api/v1/employees/user-positions',
      data,
    );
    return response.data.data;
  },

  getRoles: async (): Promise<RoleResponse[]> => {
    const response = await api.get<ApiResponse<RoleResponse[]>>(
      '/api/v1/roles',
    );
    return response.data.data;
  },

  getPositions: async (): Promise<PositionOption[]> => {
    const response = await api.get<ApiResponse<{ tree: PositionOption[] }>>(
      '/api/v1/employees/positions/tree',
    );
    return response.data.data.tree;
  },
};
