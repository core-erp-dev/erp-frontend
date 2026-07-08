import type React from 'react';
import { Users, TreeStructure, Gear, Lock, Target, ClipboardText, ChartBar, User, Clipboard } from '@phosphor-icons/react';

export interface SidebarItem {
  title: string;
  href: string;
  icon: string | React.FC<{ className?: string }>;
  module: string;
  group?: string;
  roles?: string[];
  permissions?: string[];
}

export const hrSidebar: SidebarItem[] = [
  // ==============================
  // GRUP: ORGANISASI
  // ==============================
  {
    title: 'Karyawan',
    href: '/hr/employees',
    icon: Users,
    module: 'hr',
    group: 'ORGANISASI',
    permissions: ['employee:read'],
  },
  {
    title: 'Struktur Jabatan',
    href: '/hr/positions',
    icon: TreeStructure,
    module: 'hr',
    group: 'ORGANISASI',
    permissions: ['position:read'],
  },

  // ==============================
  // GRUP: KPI v1
  // ==============================
  {
    title: 'KPI Korporat',
    href: '/hr/kpi/corporate',
    icon: ClipboardText,
    module: 'hr',
    group: 'KPI',
    permissions: ['kpi_corporate:read'],
  },
  {
    title: 'Dashboard KPI',
    href: '/hr/kpi/dashboard',
    icon: ChartBar,
    module: 'hr',
    group: 'KPI',
    permissions: ['kpi_dashboard:read'],
  },
  {
    title: 'Tugas KPI',
    href: '/hr/kpi/tasks',
    icon: Clipboard,
    module: 'hr',
    group: 'KPI',
    permissions: ['kpi_task:read'],
  },
  {
    title: 'Persetujuan Tugas',
    href: '/hr/kpi/task-approvals',
    icon: Target,
    module: 'hr',
    group: 'KPI',
    permissions: ['kpi_task_change:read', 'kpi_task_change:approve'],
  },
  {
    title: 'Laporan Harian',
    href: '/hr/kpi/reports',
    icon: User,
    module: 'hr',
    group: 'KPI',
    permissions: ['kpi_report:read'],
  },

  // ==============================
  // GRUP: PENGATURAN
  // ==============================
  {
    title: 'Hak Akses & Role',
    href: '/hr/settings/roles',
    icon: Lock,
    module: 'hr',
    group: 'PENGATURAN',
    permissions: ['role:read'],
  },
  {
    title: 'Pengaturan',
    href: '/hr/settings',
    icon: Gear,
    module: 'hr',
    group: 'PENGATURAN',
  },
];
