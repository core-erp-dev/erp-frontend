/**
 * Permission code constants — single source of truth.
 * Must match core_permissions.permission_code in backend migration.
 */
export const PERM = {
  // Employee
  EMPLOYEE_READ: 'employee:read',
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_UPDATE: 'employee:update',
  EMPLOYEE_DELETE: 'employee:delete',
  EMPLOYEE_READ_DELETED: 'employee:read_deleted',
  EMPLOYEE_RESTORE: 'employee:restore',

  // Position
  POSITION_READ: 'position:read',
  POSITION_CREATE: 'position:create',
  POSITION_UPDATE: 'position:update',
  POSITION_DELETE: 'position:delete',
  POSITION_READ_DELETED: 'position:read_deleted',
  POSITION_RESTORE: 'position:restore',
  POSITION_ASSIGN_ROLE: 'position:assign_role',

  // User
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Role
  ROLE_READ: 'role:read',
  ROLE_MANAGE_PERMISSIONS: 'role:manage_permissions',

  // Permission
  PERMISSION_READ: 'permission:read',
} as const;

export type PermissionCode = (typeof PERM)[keyof typeof PERM];
