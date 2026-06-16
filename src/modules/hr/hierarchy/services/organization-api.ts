import { api } from '@/lib/axios';
import {
  Position,
  PositionRequest,
  PositionTree,
  PositionTreeResponse,
  PositionUpdateRequest,
  ApiResponse,
} from '../types';
import type { RoleResponse } from '@/modules/hr/employees/types';

export const organizationApi = {
  /** Fetch the complete position hierarchy as a tree structure */
  fetchPositionTree: async (): Promise<PositionTree[]> => {
    const response = await api.get<ApiResponse<PositionTreeResponse>>(
      '/api/v1/employees/positions/tree'
    );
    return response.data.data.tree;
  },

  /** Get a single position by ID */
  getPositionById: async (id: string): Promise<Position> => {
    const response = await api.get<ApiResponse<Position>>(
      `/api/v1/employees/positions/${id}`
    );
    return response.data.data;
  },

  /** Create a new position */
  createPosition: async (data: PositionRequest): Promise<Position> => {
    const response = await api.post<ApiResponse<Position>>(
      '/api/v1/employees/positions',
      data
    );
    return response.data.data;
  },

  /** Update an existing position */
  updatePosition: async (
    id: string,
    data: PositionUpdateRequest
  ): Promise<Position> => {
    const response = await api.put<ApiResponse<Position>>(
      `/api/v1/employees/positions/${id}`,
      data
    );
    return response.data.data;
  },

  /** Soft delete a position */
  deletePosition: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/employees/positions/${id}`);
  },

  /** Get roles assigned to a position */
  getPositionRoles: async (positionId: string): Promise<RoleResponse[]> => {
    const response = await api.get<ApiResponse<RoleResponse[]>>(
      `/api/v1/employees/positions/${positionId}/roles`
    );
    return response.data.data;
  },

  /** Assign a role to a position */
  assignRoleToPosition: async (
    positionId: string,
    roleId: number
  ): Promise<RoleResponse> => {
    const response = await api.post<ApiResponse<RoleResponse>>(
      `/api/v1/employees/positions/${positionId}/roles`,
      { roleId }
    );
    return response.data.data;
  },

  /** Remove a role from a position */
  removeRoleFromPosition: async (
    positionId: string,
    roleId: number
  ): Promise<void> => {
    await api.delete(
      `/api/v1/employees/positions/${positionId}/roles/${roleId}`
    );
  },
};
