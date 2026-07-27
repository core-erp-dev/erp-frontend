import type React from 'react';
import { Users, TreeStructure, Gear, Lock } from '@phosphor-icons/react';
import { kpiSidebar } from '@/modules/hr/kpi/sidebar';

export interface SidebarItem {
  title: string;
  href: string;
  icon: string | React.FC<{ className?: string }>;
  module: string;
  group?: string;
  roles?: string[];
  permissions?: string[];
  /** Compound capability predicate — overrides `permissions` when present.
   *  Receives the user's full permission list and returns true if the item should be visible. */
  capability?: (permissions: string[]) => boolean;
}

export const hrSidebar: SidebarItem[] = [
  // ==============================
  // GROUP: KPI
  // ==============================
  ...kpiSidebar,

  // ==============================
  // GROUP: ORGANIZATION
  // ==============================
  {
    title: 'Employees',
    href: '/hr/organization/employees',
    icon: Users,
    module: 'hr',
    group: 'ORGANIZATION',
    permissions: ['user:read'],
  },
  {
    title: 'Position Structure',
    href: '/hr/organization/positions',
    icon: TreeStructure,
    module: 'hr',
    group: 'ORGANIZATION',
    permissions: ['position:read'],
  },

  // ==============================
  // GROUP: SETTINGS
  // ==============================
  {
    title: 'Access Control & Roles',
    href: '/hr/settings/roles',
    icon: Lock,
    module: 'hr',
    group: 'SETTINGS',
    permissions: ['role:read'],
  },
  {
    title: 'Settings',
    href: '/hr/settings',
    icon: Gear,
    module: 'hr',
    group: 'SETTINGS',
  },
];
