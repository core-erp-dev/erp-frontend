'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { employeeApi } from '../services/employee-api';
import type { CoreUser, UserCreateRequest, UserUpdateRequest, PositionOption, UserPositionResponse } from '../types';
import { extractErrorMessage } from '@/types/api';

interface UseEmployeeFormDataReturn {
  positions: PositionOption[];
  isLoadingPositions: boolean;
  secondaryPositions: UserPositionResponse[];
  isLoadingSecondary: boolean;
  assignSecondary: (positionId: string, userId: string) => Promise<boolean>;
  removeSecondary: (up: UserPositionResponse) => Promise<boolean>;
  submitCreate: (data: UserCreateRequest & { password: string }) => Promise<boolean>;
  submitUpdate: (id: string, data: UserUpdateRequest) => Promise<boolean>;
}

export function useEmployeeFormData(isEditMode: boolean, initialData?: CoreUser | null): UseEmployeeFormDataReturn {
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [secondaryPositions, setSecondaryPositions] = useState<UserPositionResponse[]>([]);
  const [isLoadingSecondary, setIsLoadingSecondary] = useState(false);

  // Fetch position tree for dropdown
  useEffect(() => {
    (async () => {
      try {
        setPositions(await employeeApi.getPositions());
      } catch {
        // positions fetch failed — dropdown will be empty
      } finally {
        setIsLoadingPositions(false);
      }
    })();
  }, []);

  // Fetch user positions in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      setIsLoadingSecondary(true);
      employeeApi.getUserPositions(initialData.id)
        .then(setSecondaryPositions)
        .catch(() => {})
        .finally(() => setIsLoadingSecondary(false));
    }
  }, [isEditMode, initialData]);

  const assignSecondary = useCallback(async (positionId: string, userId: string): Promise<boolean> => {
    try {
      const result = await employeeApi.assignUserToPosition({
        userId,
        positionId,
        startDate: new Date().toISOString().split('T')[0],
        isPrimary: false,
      });
      setSecondaryPositions(prev => [...prev, result]);
      toast.success('Jabatan rangkap berhasil ditambahkan');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal menambah jabatan'));
      return false;
    }
  }, []);

  const removeSecondary = useCallback(async (up: UserPositionResponse): Promise<boolean> => {
    try {
      await employeeApi.deactivateUserPosition(up.id);
      setSecondaryPositions(prev => prev.filter(p => p.id !== up.id));
      toast.success('Jabatan rangkap dilepas');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal melepas jabatan'));
      return false;
    }
  }, []);

  const submitCreate = useCallback(async (data: UserCreateRequest & { password: string }): Promise<boolean> => {
    try {
      await employeeApi.createUser(data);
      toast.success('Karyawan berhasil ditambahkan');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal menambahkan karyawan'));
      return false;
    }
  }, []);

  const submitUpdate = useCallback(async (id: string, data: UserUpdateRequest): Promise<boolean> => {
    try {
      await employeeApi.updateUser(id, data);
      toast.success('Karyawan berhasil diperbarui');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal memperbarui karyawan'));
      return false;
    }
  }, []);

  return {
    positions,
    isLoadingPositions,
    secondaryPositions,
    isLoadingSecondary,
    assignSecondary,
    removeSecondary,
    submitCreate,
    submitUpdate,
  };
}
