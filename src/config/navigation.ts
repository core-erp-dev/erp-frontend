import { ChartBar, Buildings, ClipboardText, Checks, Article, Users, TreeStructure, Gear, Lock, Stack } from '@phosphor-icons/react';
import type React from 'react';
import { KPI_ROUTES } from '@/modules/kpi/constants';
import { PERM } from '@/constants/permissions';

export interface SidebarItem {
  title: string;
  href: string;
  icon: string | React.FC<{ className?: string }>;
  group?: string;
  roles?: string[];
  permissions?: string[];
  /** Compound capability predicate — overrides `permissions` when present. */
  capability?: (permissions: string[]) => boolean;
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
  {
    title: 'Dashboard',
    href: '/',
    icon: ChartBar,
  },

  // ── KPI ──
  {
    title: 'Corporate KPI',
    href: KPI_ROUTES.corporate,
    icon: Buildings,
    group: 'KPI',
    permissions: [PERM.CORPORATE_KPI_READ],
  },
  {
    title: 'Activities',
    href: KPI_ROUTES.activities,
    icon: ClipboardText,
    group: 'KPI',
    // Any authenticated user — `scope=mine` reads are responsibility-based.
  },
  {
    title: 'Activity Approvals',
    href: KPI_ROUTES.approvals,
    icon: Checks,
    group: 'KPI',
    permissions: [PERM.KPI_ACTIVITY_APPROVE],
  },
  {
    title: 'Reports',
    href: KPI_ROUTES.reports,
    icon: Article,
    group: 'KPI',
    // Any authenticated user — submission, `scope=mine`, and stored-reviewer
    // access are responsibility-based. `kpi_report:manage` gates only admin tools.
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
    permissions: ['position:read'],
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
