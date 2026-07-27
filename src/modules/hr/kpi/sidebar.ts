import { ChartBar, Buildings, ClipboardText, Article, Checks } from '@phosphor-icons/react';
import { KPI_ROUTES, KPI_ANY_PERMISSION } from './constants';
import type { SidebarItem } from '@/modules/hr/sidebar';
import { PERM } from '@/constants/permissions';

/**
 * KPI sidebar items — grouped under "KPI".
 * All items use `permissions: [...]` for PBAC filtering.
 * Sidebar uses `some()` — ANY listed permission grants visibility.
 * The Reports item uses `capability` for compound AND/OR logic.
 */
export const kpiSidebar: SidebarItem[] = [
  {
    title: 'Overview',
    href: KPI_ROUTES.overview,
    icon: ChartBar,
    module: 'hr',
    group: 'KPI',
    permissions: [...KPI_ANY_PERMISSION] as unknown as string[],
  },
  {
    title: 'Corporate KPI',
    href: KPI_ROUTES.corporate,
    icon: Buildings,
    module: 'hr',
    group: 'KPI',
    permissions: [PERM.CORPORATE_KPI_READ],
  },
  {
    title: 'Activities',
    href: KPI_ROUTES.activities,
    icon: ClipboardText,
    module: 'hr',
    group: 'KPI',
    permissions: [PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST],
  },
  {
    title: 'Reports',
    href: KPI_ROUTES.reports,
    icon: Article,
    module: 'hr',
    group: 'KPI',
    capability: (perms: string[]) =>
      perms.includes('kpi_report:read') ||
      perms.includes('kpi_report:review') ||
      (perms.includes('kpi_report:submit') && perms.includes('kpi_activity:read')),
  },
  {
    title: 'Approvals',
    href: KPI_ROUTES.approvals,
    icon: Checks,
    module: 'hr',
    group: 'KPI',
    permissions: [PERM.KPI_ACTIVITY_APPROVE],
  },
];
