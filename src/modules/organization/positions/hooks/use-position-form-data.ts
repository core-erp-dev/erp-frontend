'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { organizationApi } from '../services/organization-api';
import { roleApi } from '@/modules/settings/services/role-api';
import type { PositionTree, PositionRequest, PositionUpdateRequest } from '../types';
import type { RoleResponse } from '@/modules/organization/employees/types';
import { extractErrorMessage } from '@/types/api';

interface UsePositionFormDataReturn {
  allPositions: PositionTree[];
  roles: RoleResponse[];
  isLoadingData: boolean;
  submitCreate: (payload: PositionRequest, roleIds: number[]) => Promise<string | null>;
  submitUpdate: (id: string, payload: PositionUpdateRequest, roleIds: number[]) => Promise<boolean>;
}

export function usePositionFormData(isEditMode: boolean, initialData?: PositionTree | null): UsePositionFormDataReturn {
  const [allPositions, setAllPositions] = useState<PositionTree[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tree, rolesList] = await Promise.all([
          organizationApi.fetchPositionTree(),
          roleApi.getRoles(),
        ]);
        setAllPositions(tree);
        setRoles(rolesList);
      } catch {
        // fail silently
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, []);

  const submitCreate = useCallback(async (payload: PositionRequest, roleIds: number[]): Promise<string | null> => {
    try {
      const newPos = await organizationApi.createPosition(payload);
      for (const roleId of roleIds) await organizationApi.assignRoleToPosition(newPos.id, roleId);
      return newPos.id;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to create position'));
      return null;
    }
  }, []);

  const submitUpdate = useCallback(async (id: string, payload: PositionUpdateRequest, roleIds: number[]): Promise<boolean> => {
    try {
      await organizationApi.updatePosition(id, payload);

      const currentRoles = await organizationApi.getPositionRoles(id);
      const currentIds = currentRoles.map((r) => r.id);
      const toAdd = roleIds.filter((rid) => !currentIds.includes(rid));
      const toRemove = currentIds.filter((rid) => !roleIds.includes(rid));
      for (const roleId of toAdd) await organizationApi.assignRoleToPosition(id, roleId);
      for (const roleId of toRemove) await organizationApi.removeRoleFromPosition(id, roleId);
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to update position'));
      return false;
    }
  }, []);

  return { allPositions, roles, isLoadingData, submitCreate, submitUpdate };
}
