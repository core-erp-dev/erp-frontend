import { ChartBar, Buildings, ClipboardText, Article, Users, TreeStructure, Gear, Lock } from '@phosphor-icons/react';
import type React from 'react';
import { KPI_ROUTES, KPI_ANY_PERMISSION } from '@/modules/kpi/constants';
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

export const navigationConfig: SidebarItem[] = [
  // ── KPI ──
  {
    title: 'Dashboard',
    href: KPI_ROUTES.overview,
    icon: ChartBar,
    group: 'KPI',
    permissions: [...KPI_ANY_PERMISSION] as unknown as string[],
  },
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
    permissions: [PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST, PERM.KPI_ACTIVITY_APPROVE],
  },
  {
    title: 'Reports',
    href: KPI_ROUTES.reports,
    icon: Article,
    group: 'KPI',
    capability: (perms: string[]) =>
      perms.includes('kpi_report:read') ||
      perms.includes('kpi_report:review') ||
      (perms.includes('kpi_report:submit') && perms.includes('kpi_activity:read')),
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
