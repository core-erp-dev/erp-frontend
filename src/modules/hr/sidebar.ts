import type React from 'react';
import { LayoutDashboard, Users, Network } from 'lucide-react';

export interface SidebarItem {
  title: string;
  href: string;
  icon: string | React.FC<{ className?: string }>;
  module: string;
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
];
