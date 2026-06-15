export interface CoreUser {
  id: string;
  authServiceId: string | null;
  nip: string;
  fullName: string;
  email: string;
  isActive: boolean;
  deletedAt: string | null;
  joinDate: string;
  phoneNumber: string | null;
  gender: string | null;
  birthDate: string | null;
  address: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: CoreRole[];
  permissions: string[];
  primaryPosition: PrimaryPosition | null;
}

export interface CoreRole {
  id: number;
  roleCode: string;
  description: string;
  permissions?: string[];
}

export interface RoleResponse {
  id: number;
  roleCode: string;
  description: string;
  permissions?: string[];
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
  defaultPositionId?: number;
  joinDate: string;
  phoneNumber?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
}

export interface UserUpdateRequest {
  email?: string;
  fullName?: string;
  nip?: string;
  isActive?: boolean;
  defaultPositionId?: number;
  joinDate?: string;
  phoneNumber?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
}

export type { ApiResponse, ApiErrorResponse, PaginatedResponse } from '@/types/api';

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

export interface PositionOption {
  id: number;
  positionCode: string;
  positionName: string;
  parentId: number | null;
  positionLevel: number;
  children?: PositionOption[];
}
