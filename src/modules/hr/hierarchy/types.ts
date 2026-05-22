// Position hierarchy types based on Employee Management API Documentation

export interface AssignedUser {
  id: string;
  fullName: string;
  email: string;
  nip: string;
}

export interface Position {
  id: number;
  positionCode: string;
  positionName: string;
  parentId: number | null;
  parentName: string | null;
  positionLevel: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  children: PositionTree[];
  assignedUsers?: AssignedUser[];
}

export interface PositionTree extends Omit<Position, 'children'> {
  children: PositionTree[];
}

export interface PositionRequest {
  positionCode: string;
  positionName: string;
  parentId?: number | null;
  positionLevel?: number;
}

export interface PositionUpdateRequest {
  positionCode?: string;
  positionName?: string;
  positionLevel?: number;
  isActive?: boolean;
}

// Re-export shared API types for backward compatibility within this module
export type { ApiResponse, ApiErrorResponse } from '@/types/api';

export interface PositionTreeResponse {
  tree: PositionTree[];
}
