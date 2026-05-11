// User management types based on User Management API Documentation

export interface CoreUser {
  id: string;
  authServiceId: string | null;
  nip: string;
  fullName: string;
  email: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: CoreRole[];
  primaryPosition: PrimaryPosition | null;
}

export interface CoreRole {
  id: number;
  roleCode: string;
  description: string;
}

export interface RoleResponse {
  id: number;
  roleCode: string;
  description: string;
}

export interface PrimaryPosition {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  positionId: number;
  positionName: string;
  positionCode: string;
  startDate: string;
  endDate: string | null;
  isPrimary: boolean;
  isActive: boolean;
  assignedBy: string;
  createdAt: string;
}

export interface UserCreateRequest {
  email: string;
  fullName: string;
  nip?: string;
  password?: string;
  authServiceId?: string;
  defaultRoleCode?: string;
}

export interface UserUpdateRequest {
  email?: string;
  fullName?: string;
  nip?: string;
  isActive?: boolean;
  defaultRoleCode?: string;
}

// Re-export shared API types for backward compatibility within this module
export type { ApiResponse, ApiErrorResponse } from '@/types/api';

// User Position Assignment types
export interface AssignUserPositionRequest {
  userId: string;
  positionId: number;
  startDate: string;
  endDate?: string | null;
  isPrimary: boolean;
}

export interface UserPositionResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  positionId: number;
  positionName: string;
  positionCode: string;
  startDate: string;
  endDate: string | null;
  isPrimary: boolean;
  isActive: boolean;
  assignedBy: string;
  createdAt: string;
}
