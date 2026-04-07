import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/auth';
import type {
  AuthUserResponse,
  UserPositionResponse,
  UserRoleResponse,
} from '@/types/user-management';

export const userManagementService = {
  async searchUsers(keyword: string): Promise<AuthUserResponse[]> {
    const res = await api.get<ApiResponse<AuthUserResponse[]>>(
      `/api/v1/user-management/users/search?keyword=${encodeURIComponent(keyword)}`
    );
    return res.data;
  },

  async assignUserToPosition(externalUserId: number, positionId: number): Promise<UserPositionResponse> {
    const res = await api.post<ApiResponse<UserPositionResponse>>(
      '/api/v1/user-management/assignments',
      { externalUserId, positionId }
    );
    return res.data;
  },

  async updateUserRole(userId: string, roleId: number): Promise<UserRoleResponse> {
    const res = await api.put<ApiResponse<UserRoleResponse>>(
      '/api/v1/user-management/roles',
      { userId, roleId }
    );
    return res.data;
  },
};
