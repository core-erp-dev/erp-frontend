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
  description: string;
  permissions: string[];
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
