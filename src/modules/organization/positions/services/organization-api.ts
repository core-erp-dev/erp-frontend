import { api } from '@/lib/axios';
import {
  Position,
  PositionRequest,
  PositionTree,
  PositionTreeResponse,
  PositionUpdateRequest,
  ApiResponse,
} from '../types';
import type { RoleResponse } from '@/modules/organization/employees/types';
import type { PaginatedResponse } from '@/types/api';

export interface PositionFilterParams {
  search?: string;
  includeDeleted?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export const organizationApi = {
  /** Fetch paginated positions (table view) */
  getPositions: async (params?: PositionFilterParams): Promise<PaginatedResponse<Position>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<Position>>>(
      '/api/v1/positions',
      { params }
    );
    return response.data.data;
  },

  /** Fetch the complete position hierarchy as a tree structure */
  fetchPositionTree: async (): Promise<PositionTree[]> => {
    const response = await api.get<ApiResponse<PositionTreeResponse>>(
      '/api/v1/positions/tree'
    );
    return response.data.data.tree;
  },

  /** Get a single position by ID */
  getPositionById: async (id: string): Promise<Position> => {
    const response = await api.get<ApiResponse<Position>>(
      `/api/v1/positions/${id}`
    );
    return response.data.data;
  },

  /** Create a new position */
  createPosition: async (data: PositionRequest): Promise<Position> => {
    const response = await api.post<ApiResponse<Position>>(
      '/api/v1/positions',
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
      `/api/v1/positions/${id}`,
      data
    );
    return response.data.data;
  },

  /** Soft delete a position */
  deletePosition: async (id: string): Promise<void> => {
    await api.patch(`/api/v1/positions/${id}/delete`);
  },

  /** Restore a soft-deleted position */
  restorePosition: async (id: string): Promise<Position> => {
    const response = await api.post<ApiResponse<Position>>(
      `/api/v1/positions/${id}/restore`
    );
    return response.data.data;
  },

  /** Get roles assigned to a position */
  getPositionRoles: async (positionId: string): Promise<RoleResponse[]> => {
    const response = await api.get<ApiResponse<RoleResponse[]>>(
      `/api/v1/positions/${positionId}/roles`
    );
    return response.data.data;
  },

  /** Assign a role to a position */
  assignRoleToPosition: async (
    positionId: string,
    roleId: number
  ): Promise<RoleResponse> => {
    const response = await api.post<ApiResponse<RoleResponse>>(
      `/api/v1/positions/${positionId}/roles`,
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
      `/api/v1/positions/${positionId}/roles/${roleId}`
    );
  },
};
