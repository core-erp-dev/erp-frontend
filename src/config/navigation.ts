import { ChartBar, Buildings, ClipboardText, Checks, Article, Tray, Users, TreeStructure, Gear, Lock, Stack } from '@phosphor-icons/react';
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
    ],
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
    title: 'My Reports',
    href: KPI_ROUTES.reports,
    icon: Article,
    group: 'KPI',
    // Any authenticated user — submission and `scope=mine` are responsibility-based.
  },
  {
    title: 'Report Reviews',
    href: KPI_ROUTES.reportReviews,
    icon: Tray,
    group: 'KPI',
    // Same Reporting audience as My Reports: hierarchy reviewers see assigned
    // non-root reports without kpi_report:root_review; root_review only adds
    // the centralized top-level root queue and root decision rights.
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
