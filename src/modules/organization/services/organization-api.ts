import { api } from '@/lib/axios';
import {
  Position,
  PositionRequest,
  PositionTree,
  PositionTreeResponse,
  PositionUpdateRequest,
  ApiResponse,
} from '../types';

export const organizationApi = {
  /**
   * Fetch the complete position hierarchy as a tree structure
   */
  fetchPositionTree: async (): Promise<PositionTree[]> => {
    const response = await api.get<ApiResponse<PositionTreeResponse>>(
      '/api/positions/tree'
    );
    return response.data.data.tree;
  },

  /**
   * Create a new position
   */
  createPosition: async (data: PositionRequest): Promise<Position> => {
    const response = await api.post<ApiResponse<Position>>(
      '/api/positions',
      data
    );
    return response.data.data;
  },

  /**
   * Update an existing position
   */
  updatePosition: async (
    id: number,
    data: PositionUpdateRequest
  ): Promise<Position> => {
    const response = await api.put<ApiResponse<Position>>(
      `/api/positions/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Soft delete a position
   */
  deletePosition: async (id: number): Promise<void> => {
    await api.delete(`/api/positions/${id}`);
  },
};
