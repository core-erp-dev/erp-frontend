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
  /** Non-null when a required lookup failed (401/403/500, network, ...) — must
   *  not be conflated with an empty collection. */
  lookupError: string | null;
  /** True when the actor may bind roles (role:manage); the form renders the
   *  Role picker for every position:manage actor, but only role:manage actors
   *  actually persist role bindings. */
  canBindRoles: boolean;
  submitCreate: (payload: PositionRequest, roleIds: number[]) => Promise<string | null>;
  submitUpdate: (id: string, payload: PositionUpdateRequest, roleIds: number[], syncRoles: boolean) => Promise<boolean>;
}

/**
 * Loads every lookup the Position form needs. All three lookups (position
 * tree, roles, organization units) are fetched unconditionally for
 * position:manage actors, because each one is an official form lookup; the
 * results are destructured by position (never by shifting indices), and a
 * failed request surfaces as `lookupError` instead of an empty collection.
 */
export function usePositionFormData(): UsePositionFormDataReturn {
  const { hasPerm } = usePermission();
  const canBindRoles = hasPerm(PERM.ROLE_MANAGE);
  const [allPositions, setAllPositions] = useState<PositionTree[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrganizationUnitSummary[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoadingData(true);
      setLookupError(null);
      try {
        const [tree, rolesPage, ouPage] = await Promise.all([
          organizationApi.fetchPositionTree(),
          roleApi.getRoles({ scope: 'current', size: 500, sortBy: 'roleCode', sortDirection: 'asc' }),
          organizationUnitApi.getFilteredUnits({ scope: 'current', size: 500, sortBy: 'unitName', sortDirection: 'asc' }),
        ]);
        // Normalize defensively to [] only AFTER the responses succeeded.
        setAllPositions(Array.isArray(tree) ? (tree as PositionTree[]) : []);
        setRoles((rolesPage as { content?: RoleResponse[] })?.content ?? []);
        setOrgUnits((ouPage as { content?: OrganizationUnitSummary[] })?.content ?? []);
      } catch (err) {
        // A failed lookup is an error state, never an empty collection.
        setLookupError(extractErrorMessage(err, 'Gagal memuat data pendukung form'));
        toast.danger(extractErrorMessage(err, 'Gagal memuat data pendukung form'));
        setAllPositions([]);
        setRoles([]);
        setOrgUnits([]);
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
      toast.danger(extractErrorMessage(err, 'Gagal menambahkan jabatan'));
      return null;
    }
  }, []);

  const submitUpdate = useCallback(async (
    id: string,
    payload: PositionUpdateRequest,
    roleIds: number[],
    syncRoles: boolean,
  ): Promise<boolean> => {
    try {
      await organizationApi.updatePosition(id, payload);
      // Role diff only for role:manage actors — the position-roles endpoints
      // require ROLE_READ/ROLE_MANAGE and must not be called otherwise.
      if (syncRoles) {
        const currentRoles = await organizationApi.getPositionRoles(id);
        const currentIds = currentRoles.map((r) => r.id);
        const toAdd = roleIds.filter((rid) => !currentIds.includes(rid));
        const toRemove = currentIds.filter((rid) => !roleIds.includes(rid));
        for (const roleId of toAdd) await organizationApi.assignRoleToPosition(id, roleId);
        for (const roleId of toRemove) await organizationApi.removeRoleFromPosition(id, roleId);
      }
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal memperbarui jabatan'));
      return false;
    }
  }, []);

  return { allPositions, roles, orgUnits, isLoadingData, lookupError, canBindRoles, submitCreate, submitUpdate };
}
