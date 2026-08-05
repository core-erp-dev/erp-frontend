export interface Permission {
  id: number;
  permissionCode: string;
  module: string;
  action: string;
  description: string;
}

export interface Role {
  id: number;
  roleCode: string;
  roleName: string;
  description: string;
  deletedAt: string | null;
  permissions: string[];
}

export interface RoleFilterParams {
  search?: string;
  scope?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  size?: number;
}

export interface CreateRoleRequest {
  roleCode: string;
  roleName: string;
  description?: string;
  permissionIds?: number[];
}

export interface UpdateRoleRequest {
  roleCode: string;
  roleName: string;
  description?: string;
  permissionIds?: number[];
}

export interface RolePermissionRequest {
  permissionId: number;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}