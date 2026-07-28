// Position hierarchy types based on Employee Management API Documentation

export interface AssignedUser {
  id: string;
  fullName: string;
  email: string;
  nip: string;
}

export interface Position {
  id: string;
  positionCode: string;
  positionName: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  positionLevel: number;
  unitName: string | null;
  isActive: boolean;
  deletedAt: string | null;
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
  description?: string;
  parentId?: string | null;
  unitName?: string | null;
  positionLevel?: number;
}

export interface PositionUpdateRequest {
  positionCode?: string;
  positionName?: string;
  description?: string;
  parentId?: string | null;
  unitName?: string | null;
  positionLevel?: number;
}

// Re-export shared API types for backward compatibility within this module
export type { ApiResponse, ApiErrorResponse } from '@/types/api';

export interface PositionTreeResponse {
  tree: PositionTree[];
}
