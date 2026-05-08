import type React from 'react';
import { LayoutDashboard, Users, TreePine } from 'lucide-react';

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
    title: 'Employee Management',
    href: '/hr/employees',
    icon: Users,
    module: 'hr',
  },
  {
    title: 'Organization Hierarchy',
    href: '/hr/hierarchy',
    icon: TreePine,
    module: 'hr',
  },
];
