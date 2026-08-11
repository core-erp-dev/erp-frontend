import { ChartBar, Buildings, ClipboardText, Article, Users, TreeStructure, Gear, Lock, Stack } from '@phosphor-icons/react';
import type React from 'react';
import { KPI_ROUTES } from '@/modules/kpi/constants';
import { PERM } from '@/constants/permissions';

export interface SidebarItem {
  title: string;
  href: string;
  /** Optional — submenu children may be text-only (getIcon returns null when absent). */
  icon?: string | React.FC<{ className?: string }>;
  group?: string;
  roles?: string[];
  permissions?: string[];
  /** Compound capability predicate — overrides `permissions` when present. */
  capability?: (permissions: string[]) => boolean;
  /**
   * Expandable parent: when present, the item renders as a collapsible menu
   * header and its children are listed beneath it. The parent is auto-opened
   * when any child (or the parent href itself) is the active route.
   */
  children?: SidebarItem[];
}

/**
 * Canonical sidebar source — the ONLY navigation definition consumed by
 * `src/components/layout/sidebar.tsx`. `src/modules/kpi/sidebar.ts` is a stale
 * duplicate and has been deleted (zero production callers).
 *
 * KPI access model (V1, responsibility-based):
 *   - Dashboard, Activities, Reports: any authenticated user (no gate).
 *   - Activity Approvals: exactly `kpi_activity:approve` — `manage` is never a bypass.
 *   - Corporate KPI: `corporate_kpi:read` (unchanged).
 * Permission codes gate only their elevated actions/scopes, never module entry points.
 */
export const navigationConfig: SidebarItem[] = [
  // ── DASHBOARD (outside the KPI group, at `/`) ──
  // The dashboard payload combines Corporate KPI + Unit Performance data, so
  // BOTH read permissions are required (backend hasAllAuthorities). The
  // sidebar `permissions` filter is ANY-match, so a compound `capability`
  // predicate is used instead.
  {
    title: 'Dashboard',
    href: '/',
    icon: ChartBar,
    capability: (perms) =>
      perms.includes(PERM.CORPORATE_KPI_READ) && perms.includes(PERM.UNIT_PERFORMANCE_READ),
  },

  // ── KPI ──
  {
    title: 'Corporate KPI',
    href: KPI_ROUTES.corporate,
    icon: Buildings,
    group: 'KPI',
    permissions: [PERM.CORPORATE_KPI_READ],
    children: [
      {
        title: 'Structure',
        href: KPI_ROUTES.corporate,
        group: 'KPI',
        permissions: [PERM.CORPORATE_KPI_READ],
      },
      {
        title: 'Variables',
        href: KPI_ROUTES.corporateVariables,
        group: 'KPI',
        permissions: [PERM.CORPORATE_KPI_READ],
      },
      {
        title: 'Values',
        href: KPI_ROUTES.corporateVariableValues,
        group: 'KPI',
        permissions: [PERM.CORPORATE_KPI_READ],
      },
      {
        title: 'Unit Performance',
        href: KPI_ROUTES.unitPerformance,
        group: 'KPI',
        permissions: [PERM.UNIT_PERFORMANCE_READ],
      },
    ],
  },
  {
    title: 'Activities',
    href: KPI_ROUTES.activities,
    icon: ClipboardText,
    group: 'KPI',
    // Expandable parent (Corporate KPI pattern). Children map to the split
    // /kpi/activities/* routes; `all` keeps its read_all|manage gate, Approval
    // keeps the kpi_activity:approve gate of the existing /kpi/approvals page.
    children: [
      {
        title: 'All Activities',
        href: KPI_ROUTES.activitiesAll,
        permissions: [PERM.KPI_ACTIVITY_READ_ALL, PERM.KPI_ACTIVITY_MANAGE],
      },
      { title: 'My Activities', href: KPI_ROUTES.activitiesMine },
      { title: 'Subordinate', href: KPI_ROUTES.activitiesSubordinate },
      { title: 'My Request', href: KPI_ROUTES.activitiesMyRequests },
      {
        title: 'Approval',
        href: KPI_ROUTES.approvals,
        permissions: [PERM.KPI_ACTIVITY_APPROVE],
      },
    ],
  },
  {
    title: 'Report',
    href: KPI_ROUTES.reports,
    icon: Article,
    group: 'KPI',
    // Expandable parent (Corporate KPI pattern). Report > Approval is NOT
    // gated by kpi_report:root_review — hierarchy reviewers without it must
    // still open the queue; root_review only adds root queue contents.
    children: [
      { title: 'My Report', href: KPI_ROUTES.reports },
      { title: 'Approval', href: KPI_ROUTES.reportReviews },
    ],
  },

  // ── ORGANIZATION ──
  {
    title: 'Employees',
    href: '/organization/employees',
    icon: Users,
    group: 'ORGANIZATION',
    permissions: ['user:read'],
  },
  {
    title: 'Position Structure',
    href: '/organization/positions',
    icon: TreeStructure,
    group: 'ORGANIZATION',
    permissions: ['position:read'],
  },
  {
    title: 'Organization Unit',
    href: '/organization/organization-units',
    icon: Stack,
    group: 'ORGANIZATION',
    permissions: ['organization_unit:read'],
  },

  // ── SETTINGS ──
  {
    title: 'Access Control & Roles',
    href: '/settings/roles',
    icon: Lock,
    group: 'SETTINGS',
    permissions: ['role:read'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Gear,
    group: 'SETTINGS',
  },
];
