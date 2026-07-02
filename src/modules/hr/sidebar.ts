import type React from 'react';
import { Users, TreeStructure, Gear, Lock, Target, ClipboardText, ChartBar, Checks, FileC, SquaresFour } from '@phosphor-icons/react';

export interface SidebarItem {
  title: string;
  href: string;
  icon: string | React.FC<{ className?: string }>;
  module: string;
  /** Optional group label for visual grouping */
  group?: string;
  /** Optional list of roles that can see this item. If omitted, visible to all users. */
  roles?: string[];
  /** Optional list of permissions that can see this item. More granular than roles. */
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
  // KPI MODULE
  // ==============================
  {
    title: 'Tugas KPI',
    href: '/hr/kpi/tasks',
    icon: Target,
    module: 'hr',
    permissions: ['task:read'],
  },
  {
    title: 'KPI Korporat',
    href: '/hr/kpi/corporate',
    icon: ClipboardText,
    module: 'hr',
    permissions: ['kpi:read'],
  },
  {
    title: 'Capaian KPI',
    href: '/hr/kpi/performance',
    icon: ChartBar,
    module: 'hr',
    permissions: ['performance:read'],
  },
  {
    title: 'Persetujuan KPI',
    href: '/hr/kpi/approvals',
    icon: Checks,
    module: 'hr',
    permissions: ['task:approve'],
  },
  {
    title: 'Persetujuan Laporan',
    href: '/hr/kpi/approvals/reports',
    icon: FileC,
    module: 'hr',
    permissions: ['report:approve'],
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
