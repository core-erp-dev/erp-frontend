export interface AuthUserResponse {
  userId: number;
  nip: string;
  fullName: string;
  email: string;
}

export interface UserPositionResponse {
  assignmentId: string;
  userId: string;
  authServiceId: string;
  nip: string;
  fullName: string;
  email: string;
  positionId: number;
  positionName: string;
  positionCode: string;
  isPrimary: boolean;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
}

export interface UserRoleResponse {
  userId: string;
  fullName: string;
  email: string;
  roleId: number;
  roleCode: string;
}

export interface CoreRole {
  id: number;
  roleCode: string;
  description: string;
}

export interface CoreUserListItem {
  id: string;
  authServiceId: string;
  nip: string;
  fullName: string;
  email: string;
  isActive: boolean;
  positionName?: string;
  positionCode?: string;
  roleCode?: string;
}
