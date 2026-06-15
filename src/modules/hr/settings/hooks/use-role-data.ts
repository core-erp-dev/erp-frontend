'use client';

import { useState, useEffect, useCallback } from 'react';
import { roleApi } from '../services/role-api';
import type { Role, Permission } from '../types';

export function useRoleData() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        roleApi.getRoles(),
        roleApi.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
      // Auto-select first role
      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePermission = async (roleId: number, permissionCode: string, hasPermission: boolean) => {
    const perm = permissions.find((p) => p.permissionCode === permissionCode);
    if (!perm) return;

    try {
      let updatedRole: Role;
      if (hasPermission) {
        updatedRole = await roleApi.removePermissionFromRole(roleId, perm.id);
      } else {
        updatedRole = await roleApi.addPermissionToRole(roleId, perm.id);
      }

      // Update roles list
      setRoles((prev) => prev.map((r) => (r.id === roleId ? updatedRole : r)));
      // Update selected role
      if (selectedRole?.id === roleId) {
        setSelectedRole(updatedRole);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah permission';
      setError(msg);
    }
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  return {
    roles,
    permissions,
    permissionsByModule,
    selectedRole,
    setSelectedRole,
    loading,
    error,
    togglePermission,
    refetch: fetchData,
  };
}
