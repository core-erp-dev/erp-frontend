'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { employeeApi } from '../services/employee-api';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { CoreUser, UserCreateRequest, UserUpdateRequest, PositionOption, RoleResponse } from '../types';
import { extractErrorMessage } from '@/types/api';

interface UseEmployeeFormDataReturn {
  positions: PositionOption[];
  isLoadingPositions: boolean;
  roles: RoleResponse[];
  isLoadingRoles: boolean;
  submitCreate: (data: UserCreateRequest & { password: string }) => Promise<CoreUser | null>;
  submitUpdate: (id: string, data: UserUpdateRequest) => Promise<boolean>;
  /** Replace a user's direct roles (positionless mode). */
  submitRoles: (id: string, roleIds: number[]) => Promise<boolean>;
}

export function useEmployeeFormData(): UseEmployeeFormDataReturn {
  const { hasPerm } = usePermission();
  // user:manage may look up positions and roles for the employee form
  // (backend: GET /positions/tree and GET /roles accept user:manage read-only).
  const canFetchLookups = hasPerm(PERM.USER_MANAGE);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  // Fetch position tree for dropdown (only when the actor may use it)
  useEffect(() => {
    (async () => {
      try {
        if (canFetchLookups) {
          setPositions(await employeeApi.getPositions());
        }
      } catch {
        // positions fetch failed — dropdown will be empty
      } finally {
        setIsLoadingPositions(false);
      }
    })();
  }, [canFetchLookups]);

  // Fetch roles for the positionless section (only when the actor may use it)
  useEffect(() => {
    (async () => {
      try {
        if (canFetchLookups) {
          setRoles(await employeeApi.getRoles());
        }
      } catch {
        // roles fetch failed — dropdown will be empty
      } finally {
        setIsLoadingRoles(false);
      }
    })();
  }, [canFetchLookups]);

  const submitCreate = useCallback(async (data: UserCreateRequest & { password: string }): Promise<CoreUser | null> => {
    try {
      const created = await employeeApi.createUser(data);
      toast.success('Pegawai berhasil dibuat', {
        description: 'Data pegawai telah disimpan.',
      });
      return created;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal membuat pegawai'));
      return null;
    }
  }, []);

  const submitUpdate = useCallback(async (id: string, data: UserUpdateRequest): Promise<boolean> => {
    try {
      await employeeApi.updateUser(id, data);
      toast.success('Perubahan berhasil disimpan', {
        description: 'Data pegawai telah diperbarui.',
      });
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal memperbarui pegawai'));
      return false;
    }
  }, []);

  const submitRoles = useCallback(async (id: string, roleIds: number[]): Promise<boolean> => {
    try {
      await employeeApi.updateUserRoles(id, roleIds);
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal memperbarui Role pegawai'));
      return false;
    }
  }, []);

  return {
    positions,
    isLoadingPositions,
    roles,
    isLoadingRoles,
    submitCreate,
    submitUpdate,
    submitRoles,
  };
}
