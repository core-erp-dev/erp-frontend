import { TreePine, Users } from 'lucide-react';

export const dashboardSidebar = [
  {
    title: 'Dashboard',
    href: '/',
    icon: 'dashboard',
  },
  {
    title: 'Employee Management',
    href: '/hr/employees',
    icon: Users,
  },
  {
    title: 'Organization Hierarchy',
    href: '/hr/hierarchy',
    icon: TreePine,
  },
];
