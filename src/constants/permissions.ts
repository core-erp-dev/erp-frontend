/**
 * Permission code constants — single source of truth.
 * Must match core_permissions.permission_code in backend migration.
 */
export const PERM = {
  // User
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_READ_DELETED: 'user:read_deleted',
  USER_RESTORE: 'user:restore',

  // Position
  POSITION_READ: 'position:read',
  POSITION_CREATE: 'position:create',
  POSITION_UPDATE: 'position:update',
  POSITION_DELETE: 'position:delete',
  POSITION_READ_DELETED: 'position:read_deleted',
  POSITION_RESTORE: 'position:restore',
  POSITION_ASSIGN_ROLE: 'position:assign_role',
  POSITION_ASSIGN_USER: 'position:assign_user',

  // Role
  ROLE_READ: 'role:read',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  ROLE_RESTORE: 'role:restore',
  ROLE_READ_DELETED: 'role:read_deleted',
  ROLE_MANAGE_PERMISSIONS: 'role:manage_permissions',

  // Permission
  PERMISSION_READ: 'permission:read',
} as const;

export type PermissionCode = (typeof PERM)[keyof typeof PERM];