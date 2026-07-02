/**
 * Permission code constants — single source of truth.
 * Must match core_permissions.permission_code in backend migration.
 *
 * @see erp-backend/src/main/resources/db/migration/V2__seed_dev_data.sql
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

  // Task (KPI)
  TASK_READ: 'task:read',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_APPROVE: 'task:approve',

  // Report
  REPORT_READ: 'report:read',
  REPORT_CREATE: 'report:create',
  REPORT_UPDATE: 'report:update',
  REPORT_APPROVE: 'report:approve',
  REPORT_AMEND: 'report:amend',

  // Corporate KPI
  KPI_READ: 'kpi:read',
  KPI_CREATE: 'kpi:create',
  KPI_UPDATE: 'kpi:update',
  KPI_DELETE: 'kpi:delete',

  // Performance
  PERFORMANCE_READ: 'performance:read',
} as const;

export type PermissionCode = (typeof PERM)[keyof typeof PERM];
