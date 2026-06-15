'use client';

import { RolePermissionPanel } from '@/modules/hr/settings/components/role-permission-panel';

export default function RolesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hak Akses & Role</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola role dan permission untuk mengatur akses pengguna ke sistem.
        </p>
      </div>
      <RolePermissionPanel />
    </div>
  );
}
