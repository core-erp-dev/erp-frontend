import type React from 'react';
import { LayoutDashboard, Users, Network, Target, CheckSquare, BarChart3, FileCheck, ClipboardList } from 'lucide-react';

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
    icon: LayoutDashboard,
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
    icon: Network,
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
    icon: ClipboardList,
    module: 'hr',
    roles: ['SUPER_ADMIN', 'HR_ADMIN'],
  },
  {
    title: 'Capaian KPI',
    href: '/hr/kpi/performance',
    icon: BarChart3,
    module: 'hr',
  },
  {
    title: 'Persetujuan KPI',
    href: '/hr/kpi/approvals',
    icon: CheckSquare,
    module: 'hr',
    roles: ['SUPER_ADMIN', 'HR_ADMIN'],
  },
  {
    title: 'Persetujuan Laporan',
    href: '/hr/kpi/approvals/reports',
    icon: FileCheck,
    module: 'hr',
    roles: ['SUPER_ADMIN', 'HR_ADMIN', 'USER_APPROVER'],
  },
];
