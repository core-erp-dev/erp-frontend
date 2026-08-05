'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { employeeApi } from '../services/employee-api';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { CoreUser, UserCreateRequest, UserUpdateRequest, PositionOption } from '../types';
import { extractErrorMessage } from '@/types/api';

interface UseEmployeeFormDataReturn {
  positions: PositionOption[];
  isLoadingPositions: boolean;
  submitCreate: (data: UserCreateRequest & { password: string }) => Promise<boolean>;
  submitUpdate: (id: string, data: UserUpdateRequest) => Promise<boolean>;
}

export function useEmployeeFormData(isEditMode: boolean, initialData?: CoreUser | null): UseEmployeeFormDataReturn {
  const { hasPerm, hasAnyPerm } = usePermission();
  // Position lookup requires position:read|manage; the section itself only
  // renders under user:manage AND that same lookup permission (employee-form).
  const canFetchPositions = hasPerm(PERM.USER_MANAGE)
    && hasAnyPerm(PERM.POSITION_READ, PERM.POSITION_MANAGE);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);

  // Fetch position tree for dropdown (only when the actor may use it)
  useEffect(() => {
    (async () => {
      try {
        if (canFetchPositions) {
          setPositions(await employeeApi.getPositions());
        }
      } catch {
        // positions fetch failed — dropdown will be empty
      } finally {
        setIsLoadingPositions(false);
      }
    })();
  }, [canFetchPositions]);

  const submitCreate = useCallback(async (data: UserCreateRequest & { password: string }): Promise<boolean> => {
    try {
      await employeeApi.createUser(data);
      toast.success('Employee created successfully');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to create employee'));
      return false;
    }
  }, []);

  const submitUpdate = useCallback(async (id: string, data: UserUpdateRequest): Promise<boolean> => {
    try {
      await employeeApi.updateUser(id, data);
      toast.success('Employee updated successfully');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to update employee'));
      return false;
    }
  }, []);

  return { positions, isLoadingPositions, submitCreate, submitUpdate };
}
