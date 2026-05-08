import { api } from '@/lib/axios';
import {
  CoreUser,
  UserCreateRequest,
  UserUpdateRequest,
  AssignUserPositionRequest,
  UserPositionResponse,
  ApiResponse,
  RoleResponse,
} from '../types';

export const employeeApi = {
  /**
   * Fetch all users
   */
  getUsers: async (): Promise<CoreUser[]> => {
    const response = await api.get<ApiResponse<CoreUser[]>>(
      '/api/v1/users'
    );
    return response.data.data;
  },

  /**
   * Create a new user
   */
  createUser: async (data: UserCreateRequest): Promise<CoreUser> => {
    const response = await api.post<ApiResponse<CoreUser>>(
      '/api/v1/users',
      data
    );
    return response.data.data;
  },

  /**
   * Update an existing user
   */
  updateUser: async (id: string, data: UserUpdateRequest): Promise<CoreUser> => {
    const response = await api.put<ApiResponse<CoreUser>>(
      `/api/v1/users/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Deactivate a user (soft delete)
   */
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/users/${id}`);
  },

  /**
   * Assign a user to a position
   */
  assignUserToPosition: async (
    data: AssignUserPositionRequest
  ): Promise<UserPositionResponse> => {
    const response = await api.post<ApiResponse<UserPositionResponse>>(
      '/api/v1/employees/user-positions',
      data
    );
    return response.data.data;
  },

  /**
   * Get all available roles
   */
  getRoles: async (): Promise<RoleResponse[]> => {
    const response = await api.get<ApiResponse<RoleResponse[]>>(
      '/api/v1/roles'
    );
    return response.data.data;
  },
};
