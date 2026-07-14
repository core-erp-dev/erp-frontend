'use client';

import { Spinner, Button } from '@heroui/react';
import { useRoleData } from '../hooks/use-role-data';
import type { Role } from '../types';

const moduleLabels: Record<string, string> = {
  employee: 'Karyawan',
  position: 'Jabatan',
  user: 'Pengguna',
  role: 'Role & Permission',
  permission: 'Permission',
};

export function RolePermissionPanel() {
  const {
    roles,
    permissionsByModule,
    selectedRole,
    setSelectedRole,
    loading,
    error,
    togglePermission,
  } = useRoleData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Left: Role list */}
      <div className="w-64 shrink-0 space-y-2">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Daftar Role
        </h3>
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            isSelected={selectedRole?.id === role.id}
            onSelect={() => setSelectedRole(role)}
          />
        ))}
      </div>

      {/* Right: Permission checkboxes */}
      <div className="flex-1">
        {selectedRole ? (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground">
                Permission: {selectedRole.roleCode}
              </h3>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-[#006FEE]">
                {selectedRole.permissions.length} permission
              </span>
            </div>
            <p className="mb-6 text-sm text-gray-500">
              {selectedRole.description}
            </p>

            <div className="space-y-6">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module} className="rounded-xl border border-border p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    {moduleLabels[module] || module}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {perms.map((perm) => {
                      const hasPerm = selectedRole.permissions.includes(perm.permissionCode);
                      return (
                        <label
                          key={perm.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={hasPerm}
                            onChange={() =>
                              togglePermission(selectedRole.id, perm.permissionCode, hasPerm)
                            }
                            className="h-4 w-4 rounded border-gray-300 text-[#006FEE] focus:ring-[#006FEE]"
                          />
                          <span className="text-sm">
                            <span className="font-mono text-xs text-gray-500">
                              {perm.permissionCode}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-gray-400">
            Pilih role di sebelah kiri untuk melihat permission
          </div>
        )}
      </div>
    </div>
  );
}

function RoleCard({
  role,
  isSelected,
  onSelect,
}: {
  role: Role;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      variant="ghost"
      aria-label={`Pilih role ${role.roleCode}`}
      onPress={onSelect}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors h-auto ${
        isSelected
          ? 'border-[#006FEE] bg-blue-50 text-foreground'
          : 'border-border bg-background hover:bg-gray-50'
      }`}
    >
      <div className="text-sm font-semibold">{role.roleCode}</div>
      <div className="mt-0.5 text-xs text-gray-500">
        {role.permissions.length} permission
      </div>
    </Button>
  );
}
