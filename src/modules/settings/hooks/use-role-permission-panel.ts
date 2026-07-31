'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { roleApi } from '../services/role-api';
import type { Role, Permission } from '../types';
import { extractErrorMessage } from '@/types/api';

interface UseRolePermissionPanelReturn {
  roles: Role[];
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
  togglePermission: (roleId: number, permissionCode: string, hasPermission: boolean) => Promise<void>;
}

/**
 * Data source for the RolePermissionPanel — loads ALL current roles + permissions
 * and toggles a role's permission. Independent from the paginated list-page hook.
 */
export function useRolePermissionPanel(): UseRolePermissionPanelReturn {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        roleApi.getRoles({ scope: 'current', size: 500, sortBy: 'roleName', sortDirection: 'asc' }),
        roleApi.getPermissions(),
      ]);
      setRoles(rolesData.content);
      setPermissions(permsData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePermission = useCallback(async (roleId: number, permissionCode: string, hasPermission: boolean) => {
    const perm = permissions.find((p) => p.permissionCode === permissionCode);
    if (!perm) return;

    try {
      if (hasPermission) {
        await roleApi.removePermissionFromRole(roleId, perm.id);
      } else {
        await roleApi.addPermissionToRole(roleId, perm.id);
      }
      toast.success('Permission updated successfully');
      await fetchData();
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to update permission'));
    }
  }, [permissions, fetchData]);

  return { roles, permissions, isLoading, error, togglePermission };
}
