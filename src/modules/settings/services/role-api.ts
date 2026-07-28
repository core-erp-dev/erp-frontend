import { api } from '@/lib/axios';
import type { Role, Permission, CreateRoleRequest, UpdateRoleRequest, ApiResponse } from '../types';

export const roleApi = {
  /** Get all active roles with their permissions */
  getRoles: async (): Promise<Role[]> => {
    const res = await api.get<ApiResponse<Role[]>>('/api/v1/roles');
    return res.data.data;
  },

  /** Get role by ID */
  getRoleById: async (id: number): Promise<Role> => {
    const res = await api.get<ApiResponse<Role>>(`/api/v1/roles/${id}`);
    return res.data.data;
  },

  /** Get all deleted roles */
  getDeletedRoles: async (): Promise<Role[]> => {
    const res = await api.get<ApiResponse<Role[]>>('/api/v1/roles/deleted');
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

  /** Create a new role */
  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    const res = await api.post<ApiResponse<Role>>('/api/v1/roles', data);
    return res.data.data;
  },

  /** Update an existing role */
  updateRole: async (id: number, data: UpdateRoleRequest): Promise<Role> => {
    const res = await api.put<ApiResponse<Role>>(`/api/v1/roles/${id}`, data);
    return res.data.data;
  },

  /** Delete a role (soft delete) */
  deleteRole: async (id: number): Promise<void> => {
    await api.patch(`/api/v1/roles/${id}/delete`);
  },

  /** Restore a deleted role */
  restoreRole: async (id: number): Promise<Role> => {
    const res = await api.post<ApiResponse<Role>>(`/api/v1/roles/${id}/restore`);
    return res.data.data;
  },

  /** Add permission to role */
  addPermissionToRole: async (roleId: number, permissionId: number): Promise<Role> => {
    const res = await api.post<ApiResponse<Role>>(
      `/api/v1/roles/${roleId}/permissions`,
      { permissionId },
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