import { api } from '@/lib/axios';
import type { Role, Permission, RolePermissionRequest, ApiResponse } from '../types';

export const roleApi = {
  /** Get all roles with their permissions */
  getRoles: async (): Promise<Role[]> => {
    const res = await api.get<ApiResponse<Role[]>>('/api/v1/roles');
    return res.data.data;
  },

  /** Get all permissions */
  getPermissions: async (): Promise<Permission[]> => {
    const res = await api.get<ApiResponse<Permission[]>>('/api/v1/permissions');
    return res.data.data;
  },

  /** Get permissions grouped by module */
  getModules: async (): Promise<string[]> => {
    const res = await api.get<ApiResponse<string[]>>('/api/v1/permissions/modules');
    return res.data.data;
  },

  /** Add permission to role */
  addPermissionToRole: async (roleId: number, permissionId: number): Promise<Role> => {
    const res = await api.post<ApiResponse<Role>>(
      `/api/v1/roles/${roleId}/permissions`,
      { permissionId } as RolePermissionRequest,
    );
    return res.data.data;
  },

  /** Remove permission from role */
  removePermissionFromRole: async (roleId: number, permissionId: number): Promise<Role> => {
    const res = await api.delete<ApiResponse<Role>>(
      `/api/v1/roles/${roleId}/permissions/${permissionId}`,
    );
    return res.data.data;
  },
};
