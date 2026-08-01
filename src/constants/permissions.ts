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

  // Corporate KPI
  CORPORATE_KPI_READ: 'corporate_kpi:read',
  CORPORATE_KPI_MANAGE: 'corporate_kpi:manage',

  // KPI Activity
  KPI_ACTIVITY_READ: 'kpi_activity:read',
  KPI_ACTIVITY_ROOT_REQUEST: 'kpi_activity:root_request',
  KPI_ACTIVITY_REQUEST: 'kpi_activity:request',
  KPI_ACTIVITY_APPROVE: 'kpi_activity:approve',

  // KPI Report
  KPI_REPORT_READ: 'kpi_report:read',
  KPI_REPORT_SUBMIT: 'kpi_report:submit',
  KPI_REPORT_REVIEW: 'kpi_report:review',
} as const;

export type PermissionCode = (typeof PERM)[keyof typeof PERM];
