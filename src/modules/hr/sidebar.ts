import type React from 'react';
import { Users, TreeStructure, Gear, Lock } from '@phosphor-icons/react';

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
    href: '/hr/organization/employees',
    icon: Users,
    module: 'hr',
    group: 'ORGANISASI',
    permissions: ['user:read'],
  },
  {
    title: 'Struktur Jabatan',
    href: '/hr/organization/positions',
    icon: TreeStructure,
    module: 'hr',
    group: 'ORGANISASI',
    permissions: ['position:read'],
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
