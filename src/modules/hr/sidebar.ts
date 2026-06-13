import type React from 'react';
import { SquaresFour, Users, TreeStructure, Target, Checks, ChartBar, FileC, ClipboardText, Gear } from '@phosphor-icons/react';

export interface SidebarItem {
  title: string;
  href: string;
  icon: string | React.FC<{ className?: string }>;
  module: string;
  /** Optional list of roles that can see this item. If omitted, visible to all users. */
  roles?: string[];
}

export const hrSidebar: SidebarItem[] = [
  {
    title: 'Dashboard',
    href: '/hr',
    icon: SquaresFour,
    module: 'hr',
  },
  {
    title: 'Karyawan',
    href: '/hr/employees',
    icon: Users,
    module: 'hr',
  },
  {
    title: 'Struktur',
    href: '/hr/hierarchy',
    icon: TreeStructure,
    module: 'hr',
  },
  {
    title: 'Tugas KPI',
    href: '/hr/kpi/tasks',
    icon: Target,
    module: 'hr',
    roles: ['SUPER_ADMIN', 'HR_ADMIN', 'USER_APPROVER', 'USER_STAFF'],
  },
  {
    title: 'KPI Korporat',
    href: '/hr/kpi/corporate',
    icon: ClipboardText,
    module: 'hr',
    roles: ['SUPER_ADMIN', 'HR_ADMIN'],
  },
  {
    title: 'Capaian KPI',
    href: '/hr/kpi/performance',
    icon: ChartBar,
    module: 'hr',
  },
  {
    title: 'Persetujuan KPI',
    href: '/hr/kpi/approvals',
    icon: Checks,
    module: 'hr',
    roles: ['SUPER_ADMIN', 'HR_ADMIN'],
  },
  {
    title: 'Persetujuan Laporan',
    href: '/hr/kpi/approvals/reports',
    icon: FileC,
    module: 'hr',
    roles: ['SUPER_ADMIN', 'HR_ADMIN', 'USER_APPROVER'],
  },
  {
    title: 'Pengaturan',
    href: '/hr/settings',
    icon: Gear,
    module: 'hr',
  },
];
