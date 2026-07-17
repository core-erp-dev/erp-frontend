'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { roleApi } from '../services/role-api';
import type { Permission, CreateRoleRequest, UpdateRoleRequest } from '../types';

export interface UseRoleFormDataReturn {
  permissions: Permission[];
  modules: string[];
  permissionsByModule: Record<string, Permission[]>;
  isLoadingPermissions: boolean;
  submitCreate: (data: CreateRoleRequest) => Promise<boolean>;
  submitUpdate: (id: number, data: UpdateRoleRequest) => Promise<boolean>;
}

export function useRoleFormData(): UseRoleFormDataReturn {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoadingPermissions(true);
    try {
      const [permsData, modulesData] = await Promise.all([
        roleApi.getPermissions(),
        roleApi.getModules(),
      ]);
      setPermissions(permsData);
      setModules(modulesData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data permission';
      toast.danger(msg);
    } finally {
      setIsLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const permissionsByModule = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  const submitCreate = useCallback(async (data: CreateRoleRequest): Promise<boolean> => {
    try {
      await roleApi.createRole(data);
      toast.success('Role berhasil dibuat');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat role';
      toast.danger(msg);
      return false;
    }
  }, []);

  const submitUpdate = useCallback(async (id: number, data: UpdateRoleRequest): Promise<boolean> => {
    try {
      await roleApi.updateRole(id, data);
      toast.success('Role berhasil diperbarui');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui role';
      toast.danger(msg);
      return false;
    }
  }, []);

  return {
    permissions,
    modules,
    permissionsByModule,
    isLoadingPermissions,
    submitCreate,
    submitUpdate,
  };
}