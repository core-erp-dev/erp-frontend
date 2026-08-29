/**
 * Permission code constants — single source of truth.
 * Must match core_permissions.permission_code in backend migration (V25).
 *
 * Consolidated domain model: each master-data domain exposes exactly two codes:
 *   - *:read   — active list/tree/detail operations only.
 *   - *:manage — implies read; create, update, delete, restore and
 *                deleted-data access (deleted toggles / scope=deleted).
 * Read gates use hasAnyPerm(*_READ, *_MANAGE); mutation gates use *_MANAGE.
 */
export const PERM = {
  // Organization Unit
  ORGANIZATION_UNIT_READ: 'organization_unit:read',
  ORGANIZATION_UNIT_MANAGE: 'organization_unit:manage',

  // Position
  POSITION_READ: 'position:read',
  POSITION_MANAGE: 'position:manage',

  // User
  USER_READ: 'user:read',
  USER_MANAGE: 'user:manage',

  // Role
  ROLE_READ: 'role:read',
  ROLE_MANAGE: 'role:manage',

  // Corporate KPI (collapsed model: read + manage; manage implies read via backend implication map)
  CORPORATE_KPI_READ: 'corporate_kpi:read',
  CORPORATE_KPI_MANAGE: 'corporate_kpi:manage',

  // KPI Activity
  /** @deprecated Legacy alias; independent Activity visibility is responsibility-based. */
  KPI_ACTIVITY_ROOT_REQUEST: 'kpi_activity:root_request',
  KPI_ACTIVITY_APPROVE: 'kpi_activity:approve',
  KPI_ACTIVITY_MANAGE: 'kpi_activity:manage',
  KPI_ACTIVITY_READ_ALL: 'kpi_activity:read_all',

  // KPI Report
  KPI_REPORT_MANAGE: 'kpi_report:manage',
  KPI_REPORT_ROOT_REVIEW: 'kpi_report:root_review',

  // Unit Performance
  UNIT_PERFORMANCE_READ: 'unit_performance:read',
  UNIT_PERFORMANCE_MANAGE: 'unit_performance:manage',
} as const;

export type PermissionCode = (typeof PERM)[keyof typeof PERM];
