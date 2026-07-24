'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { roleApi } from '../services/role-api';
import type { Role, Permission } from '../types';

export interface UseRoleDetailReturn {
  role: Role | null;
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
  isDeleting: boolean;
  deleteRole: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useRoleDetail(id: string): UseRoleDetailReturn {
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [roleData, permsData] = await Promise.all([
        roleApi.getRoleById(Number(id)),
        roleApi.getPermissions(),
      ]);
      setRole(roleData);
      setPermissions(permsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load role data';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const deleteRole = useCallback(async (): Promise<boolean> => {
    if (!role) return false;
    setIsDeleting(true);
    try {
      await roleApi.deleteRole(role.id);
      toast.success('Role berhasil dihapus');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus role';
      toast.danger(msg);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [role]);

  return {
    role,
    permissions,
    isLoading,
    error,
    isDeleting,
    deleteRole,
    refresh,
  };
}