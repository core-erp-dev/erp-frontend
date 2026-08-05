'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { organizationApi } from '../services/organization-api';
import { organizationUnitApi } from '@/modules/organization/organization-units/services/organization-unit-api';
import { roleApi } from '@/modules/settings/services/role-api';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { PositionTree, PositionRequest, PositionUpdateRequest, OrganizationUnitSummary } from '../types';
import type { RoleResponse } from '@/modules/organization/employees/types';
import { extractErrorMessage } from '@/types/api';

interface UsePositionFormDataReturn {
  allPositions: PositionTree[];
  roles: RoleResponse[];
  orgUnits: OrganizationUnitSummary[];
  isLoadingData: boolean;
  submitCreate: (payload: PositionRequest, roleIds: number[]) => Promise<string | null>;
  submitUpdate: (id: string, payload: PositionUpdateRequest, roleIds: number[]) => Promise<boolean>;
}

export function usePositionFormData(isEditMode: boolean, initialData?: PositionTree | null): UsePositionFormDataReturn {
  const { hasPerm, hasAnyPerm } = usePermission();
  const canEditOrgUnit = hasAnyPerm(PERM.ORGANIZATION_UNIT_READ, PERM.ORGANIZATION_UNIT_MANAGE);
  const canBindRoles = hasPerm(PERM.ROLE_MANAGE);
  const [allPositions, setAllPositions] = useState<PositionTree[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrganizationUnitSummary[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fetches: Promise<unknown>[] = [
          organizationApi.fetchPositionTree(),
        ];
        // Cross-domain lookup fetches are gated on their own read permissions:
        // roles list needs role:read|manage (we fetch it when role binding is
        // possible); org units need organization_unit:read|manage.
        if (canBindRoles) {
          fetches.push(roleApi.getRoles({ scope: 'current', size: 500, sortBy: 'roleCode', sortDirection: 'asc' }));
        }
        if (canEditOrgUnit) {
          fetches.push(organizationUnitApi.getFilteredUnits({ scope: 'current', size: 500, sortBy: 'unitName', sortDirection: 'asc' }));
        }
        const [tree, rolesList, ouPage] = await Promise.all(fetches);
        setAllPositions(tree as PositionTree[]);
        if (canBindRoles) setRoles((rolesList as { content: RoleResponse[] }).content);
        if (canEditOrgUnit) setOrgUnits((ouPage as { content: OrganizationUnitSummary[] }).content);
      } catch {
        // fail silently
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, [canBindRoles, canEditOrgUnit]);

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

  return { allPositions, roles, orgUnits, isLoadingData, submitCreate, submitUpdate };
}
