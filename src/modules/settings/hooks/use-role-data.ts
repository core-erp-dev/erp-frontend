'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { roleApi } from '../services/role-api';
import type { Role, Permission } from '../types';

export interface UseRoleDataReturn {
  roles: Role[];
  deletedRoles: Role[];
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
  includeDeleted: boolean;
  setIncludeDeleted: (val: boolean) => void;
  refresh: () => Promise<void>;
  deleteRole: (id: number) => Promise<boolean>;
  restoreRole: (id: number) => Promise<boolean>;
  togglePermission: (roleId: number, permissionCode: string, hasPermission: boolean) => Promise<void>;
}

export function useRoleData(): UseRoleDataReturn {
  const [roles, setRoles] = useState<Role[]>([]);
  const [deletedRoles, setDeletedRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rolesData, deletedData, permsData] = await Promise.all([
        roleApi.getRoles(),
        roleApi.getDeletedRoles(),
        roleApi.getPermissions(),
      ]);
      setRoles(rolesData);
      setDeletedRoles(deletedData);
      setPermissions(permsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data';
      setError(msg);
      toast.danger(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const deleteRole = useCallback(async (id: number): Promise<boolean> => {
    try {
      await roleApi.deleteRole(id);
      toast.success('Role deleted successfully');
      await fetchData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete role';
      toast.danger(msg);
      return false;
    }
  }, [fetchData]);

  const restoreRole = useCallback(async (id: number): Promise<boolean> => {
    try {
      await roleApi.restoreRole(id);
      toast.success('Role restored successfully');
      await fetchData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore role';
      toast.danger(msg);
      return false;
    }
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
      toast.success('Permission berhasil diperbarui');
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah permission';
      toast.danger(msg);
    }
  }, [permissions, fetchData]);

  return {
    roles,
    deletedRoles,
    permissions,
    isLoading,
    error,
    includeDeleted,
    setIncludeDeleted,
    refresh,
    deleteRole,
    restoreRole,
    togglePermission,
  };
}