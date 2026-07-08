/**
 * Permission code constants — single source of truth.
 * Must match core_permissions.permission_code in backend migration.
 *
 * @see erp-backend/src/main/resources/db/migration/V8__kpi_v1_rebuild.sql
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

  // KPI v1 — Corporate KPI
  KPI_CORPORATE_READ: 'kpi_corporate:read',
  KPI_CORPORATE_CREATE: 'kpi_corporate:create',
  KPI_CORPORATE_UPDATE: 'kpi_corporate:update',
  KPI_CORPORATE_DELETE: 'kpi_corporate:delete',
  KPI_CORPORATE_ACTIVATE: 'kpi_corporate:activate',

  // KPI v1 — Task
  KPI_TASK_READ: 'kpi_task:read',
  KPI_TASK_REQUEST_CREATE: 'kpi_task:request_create',
  KPI_TASK_REQUEST_UPDATE: 'kpi_task:request_update',
  KPI_TASK_REQUEST_DELETE: 'kpi_task:request_delete',
  KPI_TASK_COMPLETE: 'kpi_task:complete',

  // KPI v1 — Task Change Request (admin)
  KPI_TASK_CHANGE_READ: 'kpi_task_change:read',
  KPI_TASK_CHANGE_APPROVE: 'kpi_task_change:approve',
  KPI_TASK_CHANGE_REJECT: 'kpi_task_change:reject',

  // KPI v1 — Report
  KPI_REPORT_READ: 'kpi_report:read',
  KPI_REPORT_CREATE: 'kpi_report:create',
  KPI_REPORT_UPDATE: 'kpi_report:update',
  KPI_REPORT_APPROVE: 'kpi_report:approve',
  KPI_REPORT_AMEND: 'kpi_report:amend',

  // KPI v1 — Dashboard
  KPI_DASHBOARD_READ: 'kpi_dashboard:read',
} as const;

export type PermissionCode = (typeof PERM)[keyof typeof PERM];
