import type React from 'react';
import { Users, TreeStructure, Gear, Lock } from '@phosphor-icons/react';

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
  },
  {
    title: 'Struktur Jabatan',
    href: '/hr/positions',
    icon: TreeStructure,
    module: 'hr',
    group: 'ORGANISASI',
  },

  // ==============================
  // KPI MODULE — DIKARANTINA (commented out)
  // Aktifkan kembali setelah modul Organisasi selesai di-test.
  // ==============================
  // {
  //   title: 'Dashboard',
  //   href: '/hr',
  //   icon: SquaresFour,
  //   module: 'hr',
  // },
  // {
  //   title: 'Tugas KPI',
  //   href: '/hr/kpi/tasks',
  //   icon: Target,
  //   module: 'hr',
  //   roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
  // },
  // {
  //   title: 'KPI Korporat',
  //   href: '/hr/kpi/corporate',
  //   icon: ClipboardText,
  //   module: 'hr',
  //   roles: ['SUPER_ADMIN', 'HR_ADMIN'],
  // },
  // {
  //   title: 'Capaian KPI',
  //   href: '/hr/kpi/performance',
  //   icon: ChartBar,
  //   module: 'hr',
  // },
  // {
  //   title: 'Persetujuan KPI',
  //   href: '/hr/kpi/approvals',
  //   icon: Checks,
  //   module: 'hr',
  //   roles: ['SUPER_ADMIN', 'HR_ADMIN'],
  // },
  // {
  //   title: 'Persetujuan Laporan',
  //   href: '/hr/kpi/approvals/reports',
  //   icon: FileC,
  //   module: 'hr',
  //   roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'],
  // },

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
