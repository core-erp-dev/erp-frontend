export interface CoreUser {
  id: string;
  authServiceId: string | null;
  nip: string;
  fullName: string;
  email: string;
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
  positions: UserPositionResponse[];
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
  positionId: string;
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
  defaultPositionId?: string;
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
  defaultPositionId?: string;
  joinDate?: string;
  phoneNumber?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
}

export type { ApiResponse, ApiErrorResponse, PaginatedResponse } from '@/types/api';

export interface AssignUserPositionRequest {
  userId: string;
  positionId: string;
  startDate: string;
  endDate?: string | null;
  isPrimary: boolean;
}

export interface UserPositionResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  positionId: string;
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
  id: string;
  positionCode: string;
  positionName: string;
  parentId: string | null;
  positionLevel: number;
  children?: PositionOption[];
}
